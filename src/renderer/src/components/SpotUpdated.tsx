import { useEffect, useState } from 'react'

interface Props {
  /** When the spot prices were last fetched (milliseconds, from Date.now()), or null if not yet. */
  updatedAt: number | null
}

// The small note under the sidebar: how fresh the prices are, and how values are worked out.
function SpotUpdated({ updatedAt }: Props): React.JSX.Element {
  // Re-render every 30 seconds so "2 min ago" keeps counting up.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <p className="text-center text-xs text-neutral-500">
      {updatedAt === null ? 'Fetching spot prices…' : `Spot updated ${timeAgo(now - updatedAt)}`}
      {' · '}values use fine weight × spot
    </p>
  )
}

function timeAgo(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr${hours === 1 ? '' : 's'} ago`
}

export default SpotUpdated
