import { useEffect, useState } from 'react'

// Shows the live silver spot price with a button to refresh it.
function SilverPrice(): React.JSX.Element {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  function showPrice(latest: number): void {
    setPrice(latest)
    setLoading(false)
  }

  // Fetch once when the component first appears.
  useEffect(() => {
    window.api.getSilverPrice().then(showPrice)
  }, [])

  // Fetch again when the button is clicked.
  function refresh(): void {
    setLoading(true)
    window.api.getSilverPrice().then(showPrice)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm uppercase tracking-widest text-neutral-400">Silver spot price</p>
      <p className="text-5xl font-semibold tabular-nums">
        {price === null ? '—' : `$${price.toFixed(2)}`}
        <span className="ml-2 text-lg font-normal text-neutral-400">USD / oz</span>
      </p>
      <button
        onClick={refresh}
        disabled={loading}
        className="rounded-md bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
      >
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  )
}

export default SilverPrice
