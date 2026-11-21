import { ElectronAPI } from '@electron-toolkit/preload'
import type { Api } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    // Taken straight from the `api` object in index.ts, so the two can't get out of sync.
    api: Api
  }
}
