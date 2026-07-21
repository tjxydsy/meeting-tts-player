const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFileByPath: (filePath) => ipcRenderer.invoke('dialog:openFileByPath', filePath),
  exportHTML: (data) => ipcRenderer.invoke('export:html', data),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  onMenuOpenFile: (callback) => {
    ipcRenderer.on('menu:open-file', callback);
  },
  onMenuExportHTML: (callback) => {
    ipcRenderer.on('menu:export-html', callback);
  },
  onMenuOpenFileRecent: (callback) => {
    ipcRenderer.on('menu:open-file-recent', (_event, filePath) => callback(filePath));
  },
  notifyDataState: (hasData) => {
    ipcRenderer.send('app:data-state-changed', hasData);
  },
  removeMenuListeners: () => {
    ipcRenderer.removeAllListeners('menu:open-file');
    ipcRenderer.removeAllListeners('menu:export-html');
    ipcRenderer.removeAllListeners('menu:open-file-recent');
  },
});
