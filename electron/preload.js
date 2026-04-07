const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close:    () => ipcRenderer.send('win:close'),
  onUpdateAvailable:  (cb) => ipcRenderer.on('update:available',  cb),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update:downloaded', cb),
  installUpdate: () => ipcRenderer.send('update:install'),
})
