import { formatMoney, pureOunces, type Holding } from '../holdings'

interface Props {
  holdings: Holding[]
}

// A small card of totals across the whole stack: pure metal by type, what was
// paid in total, and how many individual coins and bars there are.
function StackSummary({ holdings }: Props): React.JSX.Element {
  let silverOz = 0
  let goldOz = 0
  let costCents = 0
  let pieces = 0
  for (const h of holdings) {
    if (h.metal === 'gold') goldOz += pureOunces(h)
    else silverOz += pureOunces(h)
    costCents += h.pricePerItemCents * h.quantity
    pieces += h.quantity
  }

  return (
    <section className="w-full rounded-2xl border border-neutral-800/70 bg-neutral-900/40 p-5">
      <h2 className="text-sm text-neutral-400">Stack summary</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
        <Stat label="Silver" value={`${silverOz.toFixed(2)} oz t`} />
        <Stat label="Gold" value={`${goldOz.toFixed(2)} oz t`} />
        <Stat label="Cost basis" value={formatMoney(costCents / 100)} />
        <Stat label="Pieces" value={pieces.toLocaleString('en-US')} />
      </dl>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-0.5 truncate text-lg font-semibold tabular-nums text-neutral-100">
        {value}
      </dd>
    </div>
  )
}

export default StackSummary
