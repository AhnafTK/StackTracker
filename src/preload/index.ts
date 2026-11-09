// PRELOAD: the bridge between the UI (renderer) and the main process.
// Anything added to `api` here becomes available in React as `window.api`.
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

  const api = {
  // Get silver and gold prices
  getSpotPrices: (): Promise<{ silver: number; gold: number }> =>
    ipcRenderer.invoke('get-spot-prices'),

  // Retrieve holdings from SQLite
  getHoldings: () =>
    ipcRenderer.invoke('holdings:get'),

  // Save a holding to SQLite
  addHolding: (holding: {
    name: string
    weight: number
    unit: 'oz' | 'g' | 'kg'
    purity: number
    quantity: number
    pricePerItem: number
  }) => ipcRenderer.invoke('holdings:add', holding)
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
