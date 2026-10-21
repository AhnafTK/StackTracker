// RENDERER: the React UI. Runs like a normal web page inside the app window.
import SilverPrice from './components/SilverPrice'

function App(): React.JSX.Element {
  return (
    <main className="flex h-full items-center justify-center">
      <SilverPrice />
    </main>
  )
}

export default App
