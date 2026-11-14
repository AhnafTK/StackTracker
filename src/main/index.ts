
import {
  initializeDatabase,
  addHolding,
  getHoldings,
  updateHolding,
  deleteHolding
} from './database'
import type { NewHolding } from './database'

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// Fetch current silver or gold spot price
async function fetchPrice(symbol: 'XAG' | 'XAU'): Promise<number> {
  const response = await fetch(`https://api.gold-api.com/price/${symbol}`)
  const data = await response.json()
  return data.price
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    show: false,
    title: 'StackTracker',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.stacktracker.app')

  // Initialize SQLite
  initializeDatabase()

  // Retrieve saved holdings
  ipcMain.handle('holdings:get', () => {
    return getHoldings()
  })

  // Add a new holding
  ipcMain.handle('holdings:add', (_event, holding: NewHolding) => {
    return addHolding(holding)
  })

  // Update an existing holding
  ipcMain.handle('holdings:update', (_event, id: string, holding: NewHolding) => {
    return updateHolding(id, holding)
  })

  // Delete an existing holding
  ipcMain.handle('holdings:delete', (_event, id: string) => {
    deleteHolding(id)
  })

  // Development keyboard shortcuts
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Fetch silver and gold prices
  ipcMain.handle('get-spot-prices', async () => {
    const [silver, gold] = await Promise.all([
      fetchPrice('XAG'),
      fetchPrice('XAU')
    ])
    return { silver, gold }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
