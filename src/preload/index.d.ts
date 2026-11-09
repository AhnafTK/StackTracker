
import { ElectronAPI } from '@electron-toolkit/preload'
import type { Holding, NewHolding } from '../renderer/src/holdings'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getSpotPrices: () => Promise<{ silver: number; gold: number }>
      getHoldings: () => Promise<Holding[]>
      addHolding: (holding: NewHolding) => Promise<Holding>
    }
  }
}
