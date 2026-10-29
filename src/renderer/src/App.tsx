// RENDERER: the React UI. Runs like a normal web page inside the app window.
//
// App owns the data (the silver price and the list of holdings) and passes it
// down to the components that display it. When the price or the holdings
// change, React redraws, and the balance is recalculated automatically.
import { useEffect, useState } from 'react'
import AccountBalance from './components/AccountBalance'
import SilverPrice from './components/SilverPrice'
import HoldingsList from './components/HoldingsList'
import AddHoldingModal from './components/AddHoldingModal'
import type { Holding, NewHolding } from './holdings'

function App(): React.JSX.Element {
  const [silverPrice, setSilverPrice] = useState<number | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(true)
  // Kept in memory only for now, so holdings disappear when the app closes.
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

  function showPrice(latest: number): void {
    setSilverPrice(latest)
    setLoadingPrice(false)
  }

  // Fetch the price once when the app opens.
  useEffect(() => {
    window.api.getSilverPrice().then(showPrice)
  }, [])

  function refreshPrice(): void {
    setLoadingPrice(true)
    window.api.getSilverPrice().then(showPrice)
  }

  function addHolding(newHolding: NewHolding): void {
    setHoldings((current) => [...current, { ...newHolding, id: crypto.randomUUID() }])
    setShowAddModal(false)
  }

  return (
    <main className="flex min-h-full justify-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col items-center gap-10">
        <AccountBalance holdings={holdings} silverPrice={silverPrice} />
        <SilverPrice price={silverPrice} loading={loadingPrice} onRefresh={refreshPrice} />
        <HoldingsList
          holdings={holdings}
          silverPrice={silverPrice}
          onAddClick={() => setShowAddModal(true)}
        />
      </div>

      {showAddModal && (
        <AddHoldingModal onAdd={addHolding} onClose={() => setShowAddModal(false)} />
      )}
    </main>
  )
}

export default App
