const { app, BrowserWindow, ipcMain, shell, dialog, Notification, clipboard, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
let pdfParse = null;
try { pdfParse = require('pdf-parse'); } catch { /* optional */ }
let mammoth = null;
try { mammoth = require('mammoth'); } catch { /* optional */ }

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let tray;

// ── Data directories ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(app.getPath('userData'), 'luna-data');
const CONVERSATIONS_DIR = path.join(DATA_DIR, 'conversations');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const NOTES_DIR = path.join(DATA_DIR, 'notes');

function ensureDirs() {
  [DATA_DIR, CONVERSATIONS_DIR, NOTES_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  ensureDirs();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0d0f1a',
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : undefined,
    icon: path.join(__dirname, '../../frontend/public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', 'maximized');
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', 'normal');
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '../../frontend/public/icon.png');
  const img = nativeImage.createFromPath(iconPath);
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Luna', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('Luna AI Assistant');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow?.show());
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── IPC: Window controls ──────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

// ── IPC: Settings ─────────────────────────────────────────────────────────────
ipcMain.handle('settings-load', () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {}
  return {
    assistantName: 'Luna',
    userName: 'User',
    ollamaUrl: 'http://localhost:11434',
    model: 'qwen2.5:1.5b',
    theme: 'dark',
    onboardingComplete: false,
    voice: false,
    notifications: true,
    inferenceMode: 'auto',
    mockWhenOffline: true,
    permissions: {
      files: false,
      clipboard: true,
      notifications: true,
      automation: false,
    },
    systemPrompt: 'You are Luna, a helpful, friendly, and privacy-focused AI desktop assistant. You run entirely locally. Be concise, helpful, and warm.',
    accentColor: '#27c7b8',
  };
});

ipcMain.handle('settings-save', (_e, data) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
  return true;
});

// ── IPC: Memory ───────────────────────────────────────────────────────────────
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
  } catch {}
  return [];
}
function saveMemory(mem) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2));
}

ipcMain.handle('memory-list', () => loadMemory());
ipcMain.handle('memory-add', (_e, item) => {
  const mem = loadMemory();
  const entry = { id: Date.now().toString(), content: item, createdAt: new Date().toISOString(), pinned: false };
  mem.unshift(entry);
  saveMemory(mem);
  return entry;
});
ipcMain.handle('memory-delete', (_e, id) => {
  const mem = loadMemory().filter(m => m.id !== id);
  saveMemory(mem);
  return true;
});
ipcMain.handle('memory-pin', (_e, id) => {
  const mem = loadMemory().map(m => m.id === id ? { ...m, pinned: !m.pinned } : m);
  saveMemory(mem);
  return true;
});
ipcMain.handle('memory-clear', () => { saveMemory([]); return true; });

// ── IPC: Conversations ────────────────────────────────────────────────────────
ipcMain.handle('conversation-list', () => {
  try {
    return fs.readdirSync(CONVERSATIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(CONVERSATIONS_DIR, f), 'utf-8')); }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch { return []; }
});

ipcMain.handle('conversation-save', (_e, conv) => {
  conv.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(CONVERSATIONS_DIR, `${conv.id}.json`), JSON.stringify(conv, null, 2));
  return true;
});

ipcMain.handle('conversation-delete', (_e, id) => {
  const f = path.join(CONVERSATIONS_DIR, `${id}.json`);
  if (fs.existsSync(f)) fs.unlinkSync(f);
  return true;
});

// ── IPC: Tasks ────────────────────────────────────────────────────────────────
function loadTasks() {
  try { if (fs.existsSync(TASKS_FILE)) return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8')); }
  catch {}
  return [];
}
function saveTasks(t) { fs.writeFileSync(TASKS_FILE, JSON.stringify(t, null, 2)); }

ipcMain.handle('tasks-list', () => loadTasks());
ipcMain.handle('tasks-save', (_e, tasks) => { saveTasks(tasks); return true; });

// ── IPC: Notes ────────────────────────────────────────────────────────────────
ipcMain.handle('notes-list', () => {
  try {
    return fs.readdirSync(NOTES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => { try { return JSON.parse(fs.readFileSync(path.join(NOTES_DIR, f), 'utf-8')); } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch { return []; }
});
ipcMain.handle('notes-save', (_e, note) => {
  note.updatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(NOTES_DIR, `${note.id}.json`), JSON.stringify(note, null, 2));
  return note;
});
ipcMain.handle('notes-delete', (_e, id) => {
  const f = path.join(NOTES_DIR, `${id}.json`);
  if (fs.existsSync(f)) fs.unlinkSync(f);
  return true;
});

// ── IPC: File operations ──────────────────────────────────────────────────────
ipcMain.handle('file-open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Documents', extensions: ['txt', 'md', 'pdf', 'docx', 'json', 'csv'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled) return null;

  const results = await Promise.all(result.filePaths.map(async fp => {
    const ext = path.extname(fp).toLowerCase();
    let content = null;
    try {
      if (['.txt', '.md', '.json', '.csv'].includes(ext)) {
        content = fs.readFileSync(fp, 'utf-8');
      } else if (ext === '.pdf' && pdfParse) {
        const buffer = fs.readFileSync(fp);
        const data = await pdfParse(buffer);
        content = data.text || null;
      } else if (ext === '.docx' && mammoth) {
        const buffer = fs.readFileSync(fp);
        const result = await mammoth.extractRawText({ buffer });
        content = result.value || null;
      }
    } catch { content = null; }
    return { path: fp, name: path.basename(fp), content };
  }));

  return results;
});

ipcMain.handle('file-read', (_e, filePath) => {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return null; }
});

ipcMain.handle('file-save-dialog', async (_e, defaultName, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'Text', extensions: ['txt', 'md'] }],
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return true;
});

// ── IPC: System info ──────────────────────────────────────────────────────────
ipcMain.handle('system-info', () => ({
  platform: process.platform,
  arch: process.arch,
  totalMemory: os.totalmem(),
  freeMemory: os.freemem(),
  cpus: os.cpus().length,
  homeDir: os.homedir(),
  hostname: os.hostname(),
  nodeVersion: process.version,
}));

// ── IPC: Clipboard ────────────────────────────────────────────────────────────
ipcMain.handle('clipboard-write', (_e, text) => { clipboard.writeText(text); return true; });
ipcMain.handle('clipboard-read', () => clipboard.readText());

// ── IPC: Notifications ────────────────────────────────────────────────────────
ipcMain.handle('notify', (_e, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: path.join(__dirname, '../../frontend/public/icon.png') }).show();
  }
  return true;
});

// ── IPC: Shell open ───────────────────────────────────────────────────────────
ipcMain.handle('shell-open', (_e, target) => { shell.openPath(target); return true; });
