// Value calculations, shared by the main process (daily snapshots) and the
// renderer (what's on screen), so both always agree.
import type { DailyPrice, Holding, Metal, SpotPrices, StackSnapshot, WeightUnit } from './types'

const GRAMS_PER_TROY_OUNCE = 31.1034768

function toTroyOunces(weight: number, unit: WeightUnit): number {
  if (unit === 'g') return weight / GRAMS_PER_TROY_OUNCE
  if (unit === 'kg') return (weight * 1000) / GRAMS_PER_TROY_OUNCE
  return weight
}

/** Troy ounces of pure metal in a holding (all items combined). */
export function pureOunces(h: Pick<Holding, 'weight' | 'unit' | 'purity' | 'quantity'>): number {
  return toTroyOunces(h.weight, h.unit) * h.purity * h.quantity
}

/** What a holding is worth at today's spot price for its metal, in dollars. */
export function holdingValue(
  h: Pick<Holding, 'metal' | 'weight' | 'unit' | 'purity' | 'quantity'>,
  prices: SpotPrices
): number {
  return pureOunces(h) * prices[h.metal]
}

/** Total value and total paid for a list of holdings, both in whole cents. */
export function stackTotals(
  holdings: Holding[],
  prices: SpotPrices
): { valueCents: number; costCents: number } {
  let value = 0
  let costCents = 0
  for (const h of holdings) {
    value += holdingValue(h, prices)
    costCents += h.pricePerItemCents * h.quantity
  }
  return { valueCents: Math.round(value * 100), costCents }
}

/** Today's date on this computer as "YYYY-MM-DD" ('en-CA' happens to use that format). */
export function localDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA')
}

/** The date `days` days after a "YYYY-MM-DD" date (negative for before), same format. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return localDate(d)
}

/** The date `days` days before a "YYYY-MM-DD" date, in the same format. */
export function daysBefore(date: string, days: number): string {
  return addDays(date, -days)
}

/**
 * The first day a holding counts towards the stack: its purchase date, or the
 * day it was added to the app if no purchase date was entered.
 */
export function holdingStartDate(h: Pick<Holding, 'purchaseDate' | 'createdAt'>): string {
  if (h.purchaseDate) return h.purchaseDate
  // createdAt is UTC ("2026-11-21 06:30:00"); convert it to this computer's local date.
  return localDate(new Date(`${h.createdAt.replace(' ', 'T')}Z`))
}

export interface ValuePoint {
  /** "YYYY-MM-DD" */
  date: string
  /** The stack's value that day, in dollars. */
  value: number
}

/**
 * The stack's value on every day from the first holding (or first saved
 * snapshot) up to today, for the chart.
 *
 * - Each past day is worked out from the holdings owned that day (by start
 *   date) × that day's price. Days with no price (weekends, holidays) use the
 *   most recent earlier price.
 * - If a needed price isn't known yet (e.g. no history fetched), the day's
 *   saved snapshot is used instead, and days with neither are left out.
 * - Today uses the live prices, so the line ends at the current total.
 */
export function buildValueSeries(
  holdings: Holding[],
  priceHistory: DailyPrice[],
  snapshots: StackSnapshot[],
  today: string,
  livePrices: SpotPrices | null
): ValuePoint[] {
  if (holdings.length === 0) return []

  const starts = holdings.map((h) => ({ holding: h, start: holdingStartDate(h) }))
  let first = starts.reduce((min, s) => (s.start < min ? s.start : min), today)
  if (snapshots.length > 0 && snapshots[0].date < first) first = snapshots[0].date

  const snapshotByDate = new Map(snapshots.map((s) => [s.date, s.valueCents / 100]))
  const pricesByMetal: Record<Metal, DailyPrice[]> = { silver: [], gold: [] }
  for (const p of priceHistory) pricesByMetal[p.metal].push(p)
  for (const list of Object.values(pricesByMetal)) list.sort((a, b) => a.date.localeCompare(b.date))

  const next: Record<Metal, number> = { silver: 0, gold: 0 } // index of the next unused price
  const lastPrice: Partial<Record<Metal, number>> = {}
  const points: ValuePoint[] = []

  for (let date = first; date < today; date = addDays(date, 1)) {
    // Move each metal's "latest known price" forward to this date.
    for (const metal of ['silver', 'gold'] as const) {
      const list = pricesByMetal[metal]
      while (next[metal] < list.length && list[next[metal]].date <= date) {
        lastPrice[metal] = list[next[metal]].price
        next[metal]++
      }
    }

    const owned = starts.filter((s) => s.start <= date).map((s) => s.holding)
    const pricesKnown = owned.every((h) => lastPrice[h.metal] !== undefined)

    if (owned.length > 0 && pricesKnown) {
      const value = owned.reduce(
        (sum, h) => sum + pureOunces(h) * (lastPrice[h.metal] as number),
        0
      )
      points.push({ date, value })
    } else if (snapshotByDate.has(date)) {
      points.push({ date, value: snapshotByDate.get(date) as number })
    }
  }

  if (livePrices)
    points.push({ date: today, value: stackTotals(holdings, livePrices).valueCents / 100 })
  return points
}
