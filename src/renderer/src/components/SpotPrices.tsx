import { formatMoney } from '../holdings'

interface Props {
  prices: { silver: number; gold: number } | null
  loading: boolean
  onRefresh: () => void
}

// A pill showing the silver and gold spot prices, with a round refresh button.
// The fetching itself happens in App, so the balance can use the same prices.
function SpotPrices({ prices, loading, onRefresh }: Props): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 rounded-full border border-neutral-800 bg-neutral-900/60 py-1.5 pl-5 pr-1.5">
      <Price label="Silver" dotClass="bg-neutral-300" price={prices?.silver} />
      <div className="h-5 w-px bg-neutral-700" />
      <Price label="Gold" dotClass="bg-amber-400" price={prices?.gold} />
      <button
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh prices"
        title="Refresh prices"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-50"
      >
        <RefreshIcon spinning={loading} />
      </button>
    </div>
  )
}

function Price({
  label,
  dotClass,
  price
}: {
  label: string
  dotClass: string
  price: number | undefined
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="text-neutral-400">{label}</span>
      <span className="font-semibold tabular-nums text-neutral-100">
        {price === undefined ? '—' : `${formatMoney(price)}/oz`}
      </span>
    </div>
  )
}

function RefreshIcon({ spinning }: { spinning: boolean }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

export default SpotPrices
