// PRELOAD: the bridge between the UI (renderer) and the main process.
// Anything added to `api` here becomes available in React as `window.api`.
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Asks the main process for silver and gold prices (see 'get-spot-prices' in src/main/index.ts).
  getSpotPrices: (): Promise<{ silver: number; gold: number }> =>
    ipcRenderer.invoke('get-spot-prices')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (declared in index.d.ts)
  window.electron = electronAPI
  // @ts-ignore (declared in index.d.ts)
  window.api = api
}
