// PRELOAD: the bridge between the UI (renderer) and the main process.
// Anything added to `api` here becomes available in React as `window.api`.
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Holding, NewHolding, SpotPrices } from '../shared/types'

// Each function sends a message to a handler in src/main/index.ts.
const api = {
  getSpotPrices: (): Promise<SpotPrices> => ipcRenderer.invoke('get-spot-prices'),

  getHoldings: (): Promise<Holding[]> => ipcRenderer.invoke('holdings:get'),

  addHolding: (holding: NewHolding): Promise<Holding> =>
    ipcRenderer.invoke('holdings:add', holding),

  updateHolding: (id: string, holding: NewHolding): Promise<Holding> =>
    ipcRenderer.invoke('holdings:update', id, holding),

  deleteHolding: (id: string): Promise<void> => ipcRenderer.invoke('holdings:delete', id)
}

export type Api = typeof api

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
