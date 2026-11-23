import {
  formatMoney,
  holdingValue,
  iconLabel,
  weightInOunces,
  type Holding,
  type SpotPrices
} from '../holdings'

interface Props {
  holdings: Holding[]
  prices: SpotPrices | null
  onAddClick: () => void
  /** Clicking a row opens it for editing (deleting is done from there too). */
  onEdit: (holding: Holding) => void
}

// The list of holdings: one row per holding with its value and profit/loss.
function HoldingsList({ holdings, prices, onAddClick, onEdit }: Props): React.JSX.Element {
  return (
    <section className="w-full rounded-2xl border border-neutral-800/70 bg-neutral-900/40">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-lg font-semibold">Holdings</h2>
        <button
          onClick={onAddClick}
          className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-amber-200"
        >
          + Add holding
        </button>
      </div>

      {holdings.length === 0 ? (
        <p className="border-t border-neutral-800/70 px-5 py-10 text-center text-sm text-neutral-500">
          No holdings yet. Click &quot;+ Add holding&quot; to add your first coin or bar.
        </p>
      ) : (
        <ul>
          {holdings.map((h) => (
            <li key={h.id} className="border-t border-neutral-800/70">
              <HoldingRow holding={h} prices={prices} onClick={() => onEdit(h)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function HoldingRow({
  holding: h,
  prices,
  onClick
}: {
  holding: Holding
  prices: SpotPrices | null
  onClick: () => void
}): React.JSX.Element {
  const value = prices ? holdingValue(h, prices) : null
  const cost = (h.pricePerItemCents * h.quantity) / 100
  const gain = value !== null ? value - cost : null
  const gainPct = gain !== null && cost > 0 ? (gain / cost) * 100 : null

  // e.g. "2 × 1 oz gold coin · 0.9999 fine"
  const ounces = Number(weightInOunces(h).toFixed(4))
  const details = `${h.quantity} × ${ounces} oz ${h.metal} ${h.form} · ${h.purity} fine`

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Edit ${h.name}`}
      className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-neutral-800/40"
    >
      <HoldingIcon holding={h} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-neutral-100">{h.name}</p>
        <p className="truncate text-sm text-neutral-500">{details}</p>
      </div>

      <div className="shrink-0 text-right tabular-nums">
        <p className="font-semibold text-neutral-100">
          {value === null ? '—' : formatMoney(value)}
        </p>
        {gain !== null && (
          <p className={`text-sm ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {gain >= 0 ? '+' : '−'}
            {formatMoney(Math.abs(gain))}
            {gainPct !== null && ` (${gain >= 0 ? '+' : '−'}${Math.abs(gainPct).toFixed(1)}%)`}
          </p>
        )}
      </div>

      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-neutral-600 transition group-hover:translate-x-0.5 group-hover:text-neutral-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  )
}

/** A gold or silver badge: round for coins and rounds, square for bars. */
function HoldingIcon({ holding: h }: { holding: Holding }): React.JSX.Element {
  const shape = h.form === 'bar' ? 'rounded-lg' : 'rounded-full'
  const colors =
    h.metal === 'gold'
      ? 'from-yellow-200 via-amber-300 to-amber-500 text-amber-950/80'
      : 'from-neutral-100 via-neutral-300 to-neutral-500 text-neutral-800'
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-to-br text-[11px] font-bold shadow-inner ${shape} ${colors}`}
      aria-hidden="true"
    >
      {iconLabel(h)}
    </span>
  )
}

export default HoldingsList
