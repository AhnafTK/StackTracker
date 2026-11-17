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
  // A copy of what's in the database. Every change goes to the database first,
  // then this list is updated with what the database returned.
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)

  function showPrices(latest: Prices): void {
    setPrices(latest)
    setLoadingPrice(false)
  }

  // When the app opens: fetch prices and load saved holdings.
  useEffect(() => {
    window.api.getSpotPrices().then(showPrices)
    window.api.listHoldings().then(setHoldings)
  }, [])

  function refreshPrices(): void {
    setLoadingPrice(true)
    window.api.getSpotPrices().then(showPrices)
  }

  async function saveHolding(holding: NewHolding): Promise<void> {
    if (editingHolding) {
      const updated = await window.api.updateHolding(editingHolding.id, holding)
      setHoldings((current) => current.map((h) => (h.id === updated.id ? updated : h)))
    } else {
      const created = await window.api.addHolding(holding)
      setHoldings((current) => [...current, created])
    }

    setShowAddModal(false)
    setEditingHolding(null)
  }

  function closeHoldingModal(): void {
    setShowAddModal(false)
    setEditingHolding(null)
  }

  async function deleteHolding(id: number): Promise<void> {
    await window.api.deleteHolding(id)
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
