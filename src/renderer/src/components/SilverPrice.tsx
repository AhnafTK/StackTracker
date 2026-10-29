import { formatMoney } from '../holdings'

interface Props {
  price: number | null
  loading: boolean
  onRefresh: () => void
}

// Shows the silver spot price with a button to refresh it.
// The fetching itself happens in App, so the balance can use the same price.
function SilverPrice({ price, loading, onRefresh }: Props): React.JSX.Element {
  return (
    <div className="flex items-center gap-4">
      <p className="text-neutral-400">
        Silver{' '}
        <span className="font-medium tabular-nums text-neutral-100">
          {price === null ? '—' : formatMoney(price)}
        </span>{' '}
        USD / oz
      </p>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="rounded-md bg-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
      >
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  )
}

export default SilverPrice
