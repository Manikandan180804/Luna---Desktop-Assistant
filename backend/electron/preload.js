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
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('file-rename', oldPath, newPath),
  organizeFolder: (folderPath) => ipcRenderer.invoke('file-organize', folderPath),
  searchFiles: (folderPath, query) => ipcRenderer.invoke('file-search', folderPath, query),

  // System
  systemInfo: () => ipcRenderer.invoke('system-info'),
  launchApp: (appName) => ipcRenderer.invoke('app-launch', appName),

  // Clipboard
  writeClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),
  readClipboard: () => ipcRenderer.invoke('clipboard-read'),

  // Notifications
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),

  // Contacts
  listContacts: () => ipcRenderer.invoke('contacts-list'),
  saveContacts: (contacts) => ipcRenderer.invoke('contacts-save', contacts),

  // Calendar
  listCalendar: () => ipcRenderer.invoke('calendar-list'),
  saveCalendar: (calendar) => ipcRenderer.invoke('calendar-save', calendar),

  // Shell
  shellOpen: (target) => ipcRenderer.invoke('shell-open', target),
  openExternal: (url) => ipcRenderer.invoke('shell-open-external', url),

  // Models
  pullModel: (name, onProgress) => {
    const listener = (_e, data) => {
      if (data.name === name) {
        onProgress(data.percent, data.status);
      }
    };
    ipcRenderer.on('model-pull-progress', listener);
    return ipcRenderer.invoke('model-pull', name).finally(() => {
      ipcRenderer.removeListener('model-pull-progress', listener);
    });
  },
  cancelPullModel: (name) => ipcRenderer.invoke('model-pull-cancel', name),
  deleteModel: (name) => ipcRenderer.invoke('model-delete', name),

  // App version & updates
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  checkForUpdates: () => ipcRenderer.invoke('app-check-updates'),

  // Listeners
  onWindowStateChanged: (callback) => {
    const listener = (_e, state) => callback(state);
    ipcRenderer.on('window-state-changed', listener);
    return () => ipcRenderer.removeListener('window-state-changed', listener);
  }
});
