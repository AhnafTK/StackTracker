// RENDERER: the React UI. Runs like a normal web page inside the app window.
//
// App owns the data (the spot prices, the list of holdings and the daily value
// snapshots and prices) and passes it down to the components that display it. Holdings are
// saved in SQLite through window.api; this list is a copy of what the database
// returned. When the prices or the holdings change, React redraws and the total
// value and today's point on the chart are recalculated.
import { useEffect, useState } from 'react'
import StackChart from './components/StackChart'
import StackSummary from './components/StackSummary'
import AllocationCard from './components/AllocationCard'
import SpotUpdated from './components/SpotUpdated'
import SpotPrices from './components/SpotPrices'
import HoldingsList from './components/HoldingsList'
import AddHoldingModal from './components/AddHoldingModal'
import type { Holding, NewHolding, SpotPrices as Prices } from './holdings'
import type { DailyPrice, StackSnapshot } from '../../shared/types'

function App(): React.JSX.Element {
  const [prices, setPrices] = useState<Prices | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(true)
  // When prices were last fetched (Date.now()), for the "Spot updated … ago" note.
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<number | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)
  const [holdingError, setHoldingError] = useState<string | null>(null)
  // Past days' totals for the chart. Today's point is worked out live from `holdings`.
  const [snapshots, setSnapshots] = useState<StackSnapshot[]>([])
  // Saved daily prices, used to work out the stack's value on past days.
  const [priceHistory, setPriceHistory] = useState<DailyPrice[]>([])

  function showPrices(latest: Prices): void {
    setPrices(latest)
    setPricesUpdatedAt(Date.now())
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

    window.api.getSnapshots().then(setSnapshots).catch(console.error)
    window.api.getPriceHistory().then(setPriceHistory).catch(console.error)

    // Past prices are fetched in the background; reload them whenever new ones arrive.
    return window.api.onPriceHistoryUpdated(() => {
      window.api.getPriceHistory().then(setPriceHistory).catch(console.error)
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
      setEditingHolding(null)
    } catch (error) {
      console.error(error)
      setHoldingError('Could not delete holding from SQLite.')
    }
  }

  return (
    // Two columns: the chart and holdings on the left (scrolling on their own),
    // and a fixed sidebar of totals on the right. On narrow windows they stack.
    <main className="h-full lg:flex">
      <div className="min-w-0 flex-1 px-8 py-8 lg:overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <StackChart
            holdings={holdings}
            prices={prices}
            snapshots={snapshots}
            priceHistory={priceHistory}
          />

          {holdingError && <p className="text-sm text-red-400">{holdingError}</p>}

          <HoldingsList
            holdings={holdings}
            prices={prices}
            onAddClick={() => setShowAddModal(true)}
            onEdit={setEditingHolding}
          />
        </div>
      </div>

      <aside className="flex flex-col gap-4 px-8 pb-8 lg:w-[25rem] lg:shrink-0 lg:overflow-y-auto lg:py-8 lg:pl-0">
        <StackSummary holdings={holdings} />
        <AllocationCard holdings={holdings} prices={prices} />
        <div className="flex justify-center pt-2">
          <SpotPrices prices={prices} loading={loadingPrice} onRefresh={refreshPrices} compact />
        </div>
        <SpotUpdated updatedAt={pricesUpdatedAt} />
      </aside>

      {(showAddModal || editingHolding) && (
        <AddHoldingModal
          key={editingHolding?.id ?? 'new'}
          initialHolding={editingHolding ?? undefined}
          prices={prices}
          onSave={saveHolding}
          onDelete={editingHolding ? () => deleteHolding(editingHolding.id) : undefined}
          onClose={closeHoldingModal}
        />
      )}
    </main>
  )
}

export default App
