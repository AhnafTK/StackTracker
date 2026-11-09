// RENDERER: the React UI. Runs like a normal web page inside the app window.
//
// App owns the data (the spot prices and the list of holdings) and passes it
// down to the components that display it. When the price or the holdings
// change, React redraws, and the balance is recalculated automatically.
import { useEffect, useState } from 'react'
import AccountBalance from './components/AccountBalance'
import SpotPrices from './components/SpotPrices'
import HoldingsList from './components/HoldingsList'
import AddHoldingModal from './components/AddHoldingModal'
import type { Holding, NewHolding, SpotPrices as Prices } from './holdings'

function App(): React.JSX.Element {
  const [prices, setPrices] = useState<Prices | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(true)
  // Kept in memory only for now, so holdings disappear when the app closes.
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)

  function showPrices(latest: Prices): void {
    setPrices(latest)
    setLoadingPrice(false)
  }

  // Fetch the prices once when the app opens.
  useEffect(() => {
    window.api.getSpotPrices().then(showPrices)
  }, [])

  function refreshPrices(): void {
    setLoadingPrice(true)
    window.api.getSpotPrices().then(showPrices)
  }

  function saveHolding(updatedHolding: NewHolding): void {
    if (editingHolding) {
      setHoldings((current) =>
        current.map((holding) =>
          holding.id === editingHolding.id ? { ...updatedHolding, id: holding.id } : holding
        )
      )
    } else {
      setHoldings((current) => [...current, { ...updatedHolding, id: crypto.randomUUID() }])
    }

    setShowAddModal(false)
    setEditingHolding(null)
  }

  function closeHoldingModal(): void {
    setShowAddModal(false)
    setEditingHolding(null)
  }

  function deleteHolding(id: string): void {
    setHoldings((current) => current.filter((holding) => holding.id !== id))
  }

  return (
    <main className="flex min-h-full justify-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col items-center gap-10">
        <AccountBalance holdings={holdings} prices={prices} />
        <SpotPrices prices={prices} loading={loadingPrice} onRefresh={refreshPrices} />
        <HoldingsList
          holdings={holdings}
          prices={prices}
          onAddClick={() => setShowAddModal(true)}
          onEdit={setEditingHolding}
          onDelete={deleteHolding}
        />
      </div>

      {(showAddModal || editingHolding) && (
        <AddHoldingModal
          key={editingHolding?.id ?? 'new'}
          initialHolding={editingHolding ?? undefined}
          prices={prices}
          onSave={saveHolding}
          onClose={closeHoldingModal}
        />
      )}
    </main>
  )
}

export default App
