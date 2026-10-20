// RENDERER: the React UI. Runs like a normal web page inside the app window.
function App(): React.JSX.Element {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-3">
      <h1 className="text-4xl font-semibold tracking-tight text-amber-300">StackTracker</h1>
      <p className="text-neutral-400">Hello world, the app is running.</p>
    </main>
  )
}

export default App
