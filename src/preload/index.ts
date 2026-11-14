// PRELOAD: the bridge between the UI (renderer) and the main process.
// Anything added to `api` here becomes available in React as `window.api`.
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

 
const api = {
  getSpotPrices: (): Promise<{ silver: number; gold: number }> =>
    ipcRenderer.invoke('get-spot-prices'),

  getHoldings: () =>
    ipcRenderer.invoke('holdings:get'),

  addHolding: (holding: {
    metal: 'silver' | 'gold'
    name: string
    weight: number
    unit: 'oz' | 'g' | 'kg'
    purity: number
    quantity: number
    pricePerItem: number
    purchaseDate: string | null
  }) => ipcRenderer.invoke('holdings:add', holding),

  updateHolding: (id: string, holding: {
    metal: 'silver' | 'gold'
    name: string
    weight: number
    unit: 'oz' | 'g' | 'kg'
    purity: number
    quantity: number
    pricePerItem: number
    purchaseDate: string | null
  }) => ipcRenderer.invoke('holdings:update', id, holding),

  deleteHolding: (id: string): Promise<void> =>
    ipcRenderer.invoke('holdings:delete', id)
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
