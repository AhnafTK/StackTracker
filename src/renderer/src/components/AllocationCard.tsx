import { holdingValue, type Holding, type SpotPrices } from '../holdings'

interface Props {
  holdings: Holding[]
  prices: SpotPrices | null
}

const METALS = [
  { metal: 'silver', label: 'Silver', color: 'bg-neutral-300' },
  { metal: 'gold', label: 'Gold', color: 'bg-amber-400' }
] as const

// How the stack's current value splits between silver and gold, as a bar and percentages.
function AllocationCard({ holdings, prices }: Props): React.JSX.Element {
  const value = { silver: 0, gold: 0 }
  if (prices) {
    for (const h of holdings) value[h.metal] += holdingValue(h, prices)
  }
  const total = value.silver + value.gold
  const share = (metal: 'silver' | 'gold'): number | null =>
    total > 0 ? (value[metal] / total) * 100 : null

  return (
    <section className="w-full rounded-2xl border border-neutral-800/70 bg-neutral-900/40 p-5">
      <h2 className="text-sm text-neutral-400">Allocation by metal</h2>

      {/* The bar: each metal's segment is as wide as its share of the value. */}
      <div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-neutral-800">
        {total > 0 &&
          METALS.map(({ metal, color }) =>
            value[metal] > 0 ? (
              <div
                key={metal}
                className={`h-full ${color}`}
                style={{ width: `${share(metal)}%` }}
              />
            ) : null
          )}
      </div>

      <ul className="mt-4 space-y-2.5 text-sm">
        {METALS.map(({ metal, label, color }) => {
          const pct = share(metal)
          return (
            <li key={metal} className="flex items-center gap-2.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
              <span className="text-neutral-200">{label}</span>
              <span className="ml-auto tabular-nums text-neutral-400">
                {pct === null ? '—' : `${Math.round(pct)}%`}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default AllocationCard
