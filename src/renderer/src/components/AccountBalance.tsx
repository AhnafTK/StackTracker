import { formatMoney, holdingValue, type Holding } from '../holdings'

interface Props {
  holdings: Holding[]
  silverPrice: number | null
}

// The combined value of all holdings at the current silver price.
function AccountBalance({ holdings, silverPrice }: Props): React.JSX.Element {
  let total = 0
  if (silverPrice !== null) {
    for (const h of holdings) {
      total += holdingValue(h, silverPrice)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm uppercase tracking-widest text-neutral-400">Account balance</p>
      <p className="text-6xl font-semibold tabular-nums">
        {silverPrice === null ? '—' : formatMoney(total)}
      </p>
    </div>
  )
}

export default AccountBalance
