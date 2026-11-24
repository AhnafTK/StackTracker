// Values electron-vite reads from the project's .env file at build time.
// Only variables starting with MAIN_VITE_ are available to the main process.
interface ImportMetaEnv {
  readonly MAIN_VITE_GOLD_API_KEY?: string
  /** 'development' for `npm run dev`, 'demo' for `npm run dev:demo`, 'production' for builds. */
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
