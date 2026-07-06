const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('luna', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Settings
  loadSettings: () => ipcRenderer.invoke('settings-load'),
  saveSettings: (data) => ipcRenderer.invoke('settings-save', data),

  // Memory
  listMemory: () => ipcRenderer.invoke('memory-list'),
  addMemory: (item) => ipcRenderer.invoke('memory-add', item),
  deleteMemory: (id) => ipcRenderer.invoke('memory-delete', id),
  pinMemory: (id) => ipcRenderer.invoke('memory-pin', id),
  clearMemory: () => ipcRenderer.invoke('memory-clear'),

  // Conversations
  listConversations: () => ipcRenderer.invoke('conversation-list'),
  saveConversation: (conv) => ipcRenderer.invoke('conversation-save', conv),
  deleteConversation: (id) => ipcRenderer.invoke('conversation-delete', id),

  // Tasks
  listTasks: () => ipcRenderer.invoke('tasks-list'),
  saveTasks: (tasks) => ipcRenderer.invoke('tasks-save', tasks),

  // Notes
  listNotes: () => ipcRenderer.invoke('notes-list'),
  saveNote: (note) => ipcRenderer.invoke('notes-save', note),
  deleteNote: (id) => ipcRenderer.invoke('notes-delete', id),

  // Files
  openFileDialog: () => ipcRenderer.invoke('file-open-dialog'),
  readFile: (path) => ipcRenderer.invoke('file-read', path),
  saveFileDialog: (name, content) => ipcRenderer.invoke('file-save-dialog', name, content),

  // System
  systemInfo: () => ipcRenderer.invoke('system-info'),

  // Clipboard
  writeClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),
  readClipboard: () => ipcRenderer.invoke('clipboard-read'),

  // Notifications
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),

  // Shell
  shellOpen: (target) => ipcRenderer.invoke('shell-open', target),

  // Listeners
  onWindowStateChanged: (callback) => {
    const listener = (_e, state) => callback(state);
    ipcRenderer.on('window-state-changed', listener);
    return () => ipcRenderer.removeListener('window-state-changed', listener);
  }
});
