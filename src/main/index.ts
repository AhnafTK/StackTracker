// MAIN PROCESS: runs in Node.js. It starts the app, creates the window,
// fetches prices from the internet, and owns the database.
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  initializeDatabase,
  closeDatabase,
  getHoldings,
  addHolding,
  updateHolding,
  deleteHolding,
  validateHolding,
  validateId
} from './database'

// Gets the current price of one metal from gold-api.com.
// XAG = silver, XAU = gold. Price is in USD per troy ounce.
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

  // Open external links in the user's browser, not inside the app.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // In development, load the Vite dev server (with hot reload).
  // In the packaged app, load the built HTML file.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.stacktracker.app')

  // F12 opens DevTools in development.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // The database file lives in the app's data folder:
  //   Windows: %APPDATA%\StackTracker\stacktracker.db
  //   macOS:   ~/Library/Application Support/StackTracker/stacktracker.db
  const databasePath = join(app.getPath('userData'), 'stacktracker.db')
  initializeDatabase(databasePath)
  console.log('Database initialized at:', databasePath)

  // The UI calls window.api.getSpotPrices(), which arrives here.
  // Returns silver and gold spot prices in USD per troy ounce.
  ipcMain.handle('get-spot-prices', async () => {
    const [silver, gold] = await Promise.all([fetchPrice('XAG'), fetchPrice('XAU')])
    return { silver, gold }
  })

  // Holdings: the UI calls window.api.getHoldings() etc., which arrive here.
  // Anything sent from the UI is checked before it reaches the database.
  ipcMain.handle('holdings:get', () => getHoldings())

  ipcMain.handle('holdings:add', (_event, holding: unknown) => addHolding(validateHolding(holding)))

  ipcMain.handle('holdings:update', (_event, id: unknown, holding: unknown) =>
    updateHolding(validateId(id), validateHolding(holding))
  )

  ipcMain.handle('holdings:delete', (_event, id: unknown) => deleteHolding(validateId(id)))

  createWindow()

  // macOS: re-create the window when the dock icon is clicked.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Close the database cleanly when the app exits.
app.on('will-quit', () => {
  closeDatabase()
})
