# StackTracker

A desktop app for tracking physical gold and silver coins and bars against spot prices.

Built with Electron, React, TypeScript, Vite (via electron-vite) and Tailwind CSS.

## Getting started

You need [Node.js](https://nodejs.org) (LTS version) installed.

```bash
npm install      # first time only: downloads dependencies
npm run dev      # starts the app with hot reload
```

Press **F12** in the app window to open DevTools.

## Project layout

```
src/
  main/       Main process (Node.js): starts the app, creates the window.
              Database and price fetching will go here later.
  preload/    Bridge between main and the UI. Exposes `window.api` to React.
  renderer/   The UI: a normal React app.
    src/App.tsx         The screen you see
    src/assets/main.css Global styles (Tailwind)
resources/    App icon
build/        Icons and settings used when packaging installers
```

## Useful commands

| Command             | What it does                           |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Run the app in development mode        |
| `npm run typecheck` | Check for TypeScript errors            |
| `npm run lint`      | Check code style                       |
| `npm run format`    | Auto-format all code                   |
| `npm run build:win` | Build a Windows installer into `dist/` |
| `npm run build:mac` | Build a macOS app (must run on a Mac)  |
