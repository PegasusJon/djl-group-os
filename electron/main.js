const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Store update state so we can replay it if renderer asks after the event fired
let updateState = null  // null | 'available' | 'downloaded'

let mainWindow

// ── Auto-updater config ──────────────────────────────────────────────────────
autoUpdater.autoDownload        = true
autoUpdater.autoInstallOnAppQuit = true

autoUpdater.on('checking-for-update',  () => console.log('[updater] Checking for update…'))
autoUpdater.on('update-not-available', () => console.log('[updater] Up to date.'))
autoUpdater.on('error',          (err) => console.error('[updater] Error:', err?.message ?? err))

autoUpdater.on('update-available', (info) => {
  console.log('[updater] Update available:', info.version)
  updateState = 'available'
  mainWindow?.webContents.send('update:available')
})

autoUpdater.on('download-progress', (p) => {
  console.log(`[updater] Downloading… ${Math.round(p.percent)}%`)
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('[updater] Update downloaded:', info.version)
  updateState = 'downloaded'
  mainWindow?.webContents.send('update:downloaded')
})

// ── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    // Wait until renderer is fully loaded before checking — avoids race condition
    if (!isDev) {
      setTimeout(() => autoUpdater.checkForUpdates(), 3000)
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.on('win:minimize', () => mainWindow?.minimize())
ipcMain.on('win:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('win:close', () => mainWindow?.close())

// Renderer asks for current update state on mount (catches events that fired early)
ipcMain.handle('update:get-status', () => updateState)

ipcMain.on('update:install', () => autoUpdater.quitAndInstall())
