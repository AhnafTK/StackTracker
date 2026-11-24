import { useMemo, useState } from 'react'
import {
  Area,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { formatMoney, stackTotals, type Holding, type SpotPrices } from '../holdings'
import { buildValueSeries, daysBefore, localDate, type ValuePoint } from '../../../shared/calc'
import type { DailyPrice, StackSnapshot } from '../../../shared/types'

interface Props {
  holdings: Holding[]
  prices: SpotPrices | null
  /** Saved daily snapshots, oldest first. */
  snapshots: StackSnapshot[]
  /** Saved daily prices, used to work out the stack's value on past days. */
  priceHistory: DailyPrice[]
}

const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: null }
] as const
type RangeLabel = (typeof RANGES)[number]['label']

const LINE_COLOR = '#4ade80' // Tailwind green-400
const MUTED = '#737373' // Tailwind neutral-500

// The stack's total value at the top, with a chart of how it has changed over time.
// Each point is one day; see buildValueSeries in src/shared/calc.ts for how it's worked out.
function StackChart({ holdings, prices, snapshots, priceHistory }: Props): React.JSX.Element {
  const [range, setRange] = useState<RangeLabel>('ALL')

  const today = localDate()
  const totals = prices ? stackTotals(holdings, prices) : null
  const value = totals ? totals.valueCents / 100 : null
  const cost = totals ? totals.costCents / 100 : 0
  const gain = value !== null ? value - cost : null
  const gainPct = gain !== null && cost > 0 ? (gain / cost) * 100 : null

  // One point per day: past days from holdings × saved prices (or saved snapshots),
  // and today from the live prices, so the line ends at the number shown above it.
  const points = useMemo(
    () => buildValueSeries(holdings, priceHistory, snapshots, today, prices),
    [holdings, priceHistory, snapshots, today, prices]
  )

  const days = RANGES.find((r) => r.label === range)?.days ?? null
  const cutoff = days === null ? null : daysBefore(today, days)
  const visible = cutoff === null ? points : points.filter((p) => p.date >= cutoff)

  // Fit the vertical scale to the value line only, with a little room above and
  // below, so day-to-day moves are visible. The cost basis line is cut off where it
  // falls outside that range (common on short ranges like 1W).
  const values = visible.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.15 || max * 0.02 || 1
  const yMin = min - pad
  const yMax = max + pad

  // Label the cost basis line at its right end, if that end is in view.
  const last = visible[visible.length - 1]
  const showCostLabel =
    last !== undefined && last.cost > 0 && last.cost >= yMin && last.cost <= yMax

  return (
    <section className="w-full">
      <p className="text-sm text-neutral-400">Total stack value</p>
      <p className="mt-1 text-6xl font-semibold tracking-tight tabular-nums">
        {value === null ? '—' : formatMoney(value)}
      </p>
      <p className="mt-3 flex items-center gap-2 text-sm tabular-nums">
        {gain !== null && holdings.length > 0 ? (
          <>
            <span className={`font-medium ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {gain >= 0 ? '▲' : '▼'} {formatMoney(Math.abs(gain))}
              {gainPct !== null && ` (${gain >= 0 ? '+' : '−'}${Math.abs(gainPct).toFixed(1)}%)`}
            </span>
            <span className="text-neutral-500">all time</span>
          </>
        ) : (
          <span className="text-neutral-500">&nbsp;</span>
        )}
      </p>

      <div className="mt-4 h-44">
        {visible.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visible} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="stack-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[yMin, yMax]} allowDataOverflow />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: MUTED, strokeDasharray: '3 3' }}
                isAnimationActive={false}
              />
              {/* What had been paid so far: steps up on each purchase date. */}
              <Line
                type="stepAfter"
                dataKey="cost"
                stroke={MUTED}
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
              <Area
                type="linear"
                dataKey="value"
                stroke={LINE_COLOR}
                strokeWidth={2}
                fill="url(#stack-fill)"
                dot={false}
                activeDot={{ r: 4, fill: LINE_COLOR, stroke: '#0f1115', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              {showCostLabel && (
                <ReferenceDot
                  x={last.date}
                  y={last.cost}
                  r={0}
                  shape={(props: { cx?: number; cy?: number }) => (
                    <CostBasisLabel
                      x={props.cx ?? 0}
                      y={props.cy ?? 0}
                      text={`Cost basis ${formatMoney(last.cost)}`}
                    />
                  )}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-neutral-800 px-6 text-center text-sm text-neutral-500">
            {holdings.length === 0
              ? 'Add a holding to start tracking your stack’s value.'
              : 'Not enough history yet. Add purchase dates to your holdings (and a gold-api.com key in .env) to fill in the past, or the chart grows by one point each day you open the app.'}
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRange(r.label)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              range === r.label
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </section>
  )
}

/** The date and value shown when hovering over the chart. Recharts passes in these props. */
function ChartTooltip({
  active,
  payload
}: {
  active?: boolean
  payload?: Array<{ payload: ValuePoint }>
}): React.JSX.Element | null {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const date = new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm shadow-xl">
      <p className="text-neutral-400">{date}</p>
      <p className="font-medium tabular-nums text-neutral-100">{formatMoney(point.value)}</p>
      <p className="tabular-nums text-neutral-500">Cost basis {formatMoney(point.cost)}</p>
    </div>
  )
}

/** "Cost basis $…" sitting on the dashed line, ending at (x, y): the line's right end. */
function CostBasisLabel({ x, y, text }: { x: number; y: number; text: string }): React.JSX.Element {
  const width = text.length * 6 + 12
  return (
    <g>
      <rect x={x - width} y={y - 9} width={width} height={18} rx={4} fill="#0f1115" />
      <text x={x - 6} y={y + 4} textAnchor="end" fill={MUTED} fontSize={11}>
        {text}
      </text>
    </g>
  )
}

export default StackChart
