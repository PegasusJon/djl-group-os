const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  minimize:    () => ipcRenderer.send('win:minimize'),
  maximize:    () => ipcRenderer.send('win:maximize'),
  close:       () => ipcRenderer.send('win:close'),

  // Update events
  onUpdateAvailable:  (cb) => ipcRenderer.on('update:available',  (_e) => cb()),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update:downloaded', (_e) => cb()),
  getUpdateStatus:    ()   => ipcRenderer.invoke('update:get-status'),
  installUpdate:      ()   => ipcRenderer.send('update:install'),
})
