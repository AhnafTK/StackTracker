// RENDERER: the React UI. Runs like a normal web page inside the app window.
//
// App owns the data (the spot prices and the list of holdings) and passes it
// down to the components that display it. Holdings are saved in SQLite through
// window.api; this list is a copy of what the database returned. When the
// prices or the holdings change, React redraws and the balance is recalculated.
import { useEffect, useState } from 'react'
import AccountBalance from './components/AccountBalance'
import SpotPrices from './components/SpotPrices'
import HoldingsList from './components/HoldingsList'
import AddHoldingModal from './components/AddHoldingModal'
import type { Holding, NewHolding, SpotPrices as Prices } from './holdings'

function App(): React.JSX.Element {
  const [prices, setPrices] = useState<Prices | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(true)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)
  const [holdingError, setHoldingError] = useState<string | null>(null)

  function showPrices(latest: Prices): void {
    setPrices(latest)
    setLoadingPrice(false)
  }

  // Load prices and saved holdings when the app starts
  useEffect(() => {
    window.api
      .getSpotPrices()
      .then(showPrices)
      .catch(console.error)
      .finally(() => setLoadingPrice(false))

    window.api
      .getHoldings()
      .then(setHoldings)
      .catch((error) => {
        console.error(error)
        setHoldingError('Could not load saved holdings.')
      })
  }, [])

  function refreshPrices(): void {
    setLoadingPrice(true)

    window.api
      .getSpotPrices()
      .then(showPrices)
      .catch(console.error)
      .finally(() => setLoadingPrice(false))
  }

  // Add a new holding or update an existing one in SQLite
  async function saveHolding(updatedHolding: NewHolding): Promise<void> {
    setHoldingError(null)

    try {
      if (editingHolding) {
        const saved = await window.api.updateHolding(editingHolding.id, updatedHolding)

        setHoldings((current) =>
          current.map((holding) => (holding.id === saved.id ? saved : holding))
        )
      } else {
        const saved = await window.api.addHolding(updatedHolding)

        setHoldings((current) => [...current, saved])
      }

      setShowAddModal(false)
      setEditingHolding(null)
    } catch (error) {
      console.error(error)
      setHoldingError('Could not save holding to SQLite.')
    }
  }

  function closeHoldingModal(): void {
    setShowAddModal(false)
    setEditingHolding(null)
    setHoldingError(null)
  }

  // Permanently delete a holding from SQLite
  async function deleteHolding(id: string): Promise<void> {
    setHoldingError(null)

    try {
      await window.api.deleteHolding(id)

      setHoldings((current) => current.filter((holding) => holding.id !== id))
    } catch (error) {
      console.error(error)
      setHoldingError('Could not delete holding from SQLite.')
    }
  }

  return (
    <main className="flex min-h-full justify-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col items-center gap-10">
        <AccountBalance holdings={holdings} prices={prices} />

        <SpotPrices prices={prices} loading={loadingPrice} onRefresh={refreshPrices} />

        {holdingError && <p className="text-sm text-red-400">{holdingError}</p>}

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
