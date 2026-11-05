import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getSpotPrices: () => Promise<{ silver: number; gold: number }>
    }
  }
}
