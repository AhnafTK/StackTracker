import { formatMoney, holdingValue, type Holding } from '../holdings'

interface Props {
  holdings: Holding[]
  silverPrice: number | null
  onAddClick: () => void
  onEdit: (holding: Holding) => void
  onDelete: (id: string) => void
}

const UNIT_LABEL = { oz: 'oz', g: 'g', kg: 'kg' }

function HoldingsList({
  holdings,
  silverPrice,
  onAddClick,
  onEdit,
  onDelete
}: Props): React.JSX.Element {
  return (
    <section className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60">
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <h2 className="font-medium">Holdings</h2>
        <button
          onClick={onAddClick}
          className="rounded-md bg-amber-300 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-amber-200"
        >
          + Add
        </button>
      </div>

      {holdings.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-neutral-500">
          No holdings yet. Click &quot;+ Add&quot; to add your first coin or bar.
        </p>
      ) : (
        <ul>
          {holdings.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between gap-4 border-b border-neutral-800 px-5 py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate">
                  {h.name} <span className="text-neutral-400">×{h.quantity}</span>
                </p>
                <p className="text-xs text-neutral-500">
                  {h.weight} {UNIT_LABEL[h.unit]} · {h.purity} pure · paid{' '}
                  {formatMoney(h.pricePerItem)} each
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="tabular-nums">
                  {silverPrice === null ? '—' : formatMoney(holdingValue(h, silverPrice))}
                </p>
                <button
                  type="button"
                  onClick={() => onEdit(h)}
                  aria-label={`Edit ${h.name}`}
                  className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(h.id)}
                  aria-label={`Delete ${h.name}`}
                  className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-300 hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default HoldingsList
