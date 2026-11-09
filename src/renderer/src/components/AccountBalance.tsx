import { formatMoney, holdingValue, type Holding, type SpotPrices } from '../holdings'

interface Props {
  holdings: Holding[]
  prices: SpotPrices | null
}

// The combined value of all holdings, each at the current price of its metal.
function AccountBalance({ holdings, prices }: Props): React.JSX.Element {
  let total = 0
  if (prices !== null) {
    for (const h of holdings) {
      total += holdingValue(h, prices)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm uppercase tracking-widest text-neutral-400">Account balance</p>
      <p className="text-6xl font-semibold tabular-nums">
        {prices === null ? '—' : formatMoney(total)}
      </p>
    </div>
  )
}

export default AccountBalance
