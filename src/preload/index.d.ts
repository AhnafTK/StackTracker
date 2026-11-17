import { ElectronAPI } from '@electron-toolkit/preload'
import type { Holding, NewHolding, SpotPrices } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getSpotPrices: () => Promise<SpotPrices>
      listHoldings: () => Promise<Holding[]>
      addHolding: (holding: NewHolding) => Promise<Holding>
      updateHolding: (id: number, holding: NewHolding) => Promise<Holding>
      deleteHolding: (id: number) => Promise<void>
    }
  }
}
