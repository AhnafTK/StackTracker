// Fills in past daily prices from gold-api.com's history API, so the chart can
// show the stack's value from the first purchase date, not just from install day.
//
// Needs a free API key in the project's .env file:
//   MAIN_VITE_GOLD_API_KEY=your-key
// Without one, this does nothing and the chart uses saved daily snapshots only.
//
// The free plan allows 10 history requests an hour, so this only ever asks for
// dates it hasn't asked for before (usually one request per metal, ever, plus
// one per metal on days when new dates need filling in).
import { getCoverage, getHoldings, saveCoverage, savePrices } from './database'
import { addDays, daysBefore, holdingStartDate, localDate } from '../shared/calc'
import type { DailyPrice, Metal } from '../shared/types'

const API_KEY = import.meta.env.MAIN_VITE_GOLD_API_KEY
const SYMBOLS: Record<Metal, string> = { silver: 'XAG', gold: 'XAU' }

// Runs one backfill at a time; a call made while one is running waits its turn.
let queue: Promise<boolean> = Promise.resolve(false)
let warnedAboutKey = false

/**
 * Fetches any missing past prices for the metals in the stack.
 * Resolves to true if new prices were saved (so the chart should reload).
 * Never throws: problems are logged and the chart carries on with what it has.
 */
export function backfillPriceHistory(): Promise<boolean> {
  queue = queue.then(runBackfill, runBackfill)
  return queue
}

async function runBackfill(): Promise<boolean> {
  if (!API_KEY) {
    if (!warnedAboutKey)
      console.log('[StackTracker] no MAIN_VITE_GOLD_API_KEY in .env, skipping price history')
    warnedAboutKey = true
    return false
  }

  const holdings = getHoldings()
  if (holdings.length === 0) return false

  const yesterday = daysBefore(localDate(), 1)
  let savedAny = false

  for (const metal of ['silver', 'gold'] as const) {
    // How far back this metal's prices are needed: its earliest holding.
    const starts = holdings.filter((h) => h.metal === metal).map(holdingStartDate)
    if (starts.length === 0) continue
    const earliest = starts.reduce((a, b) => (a < b ? a : b))
    if (earliest > yesterday) continue

    // Work out which dates haven't been requested yet: before and/or after what's covered.
    const covered = getCoverage(metal)
    const missing: Array<{ from: string; to: string }> = []
    if (!covered) {
      missing.push({ from: earliest, to: yesterday })
    } else {
      if (earliest < covered.from) missing.push({ from: earliest, to: daysBefore(covered.from, 1) })
      if (covered.to < yesterday) missing.push({ from: addDays(covered.to, 1), to: yesterday })
    }

    let coverage = covered
    for (const range of missing) {
      try {
        const prices = await fetchHistory(metal, range.from, range.to)
        savePrices(prices, 'history')
        savedAny ||= prices.length > 0
        coverage = {
          from: coverage && coverage.from < range.from ? coverage.from : range.from,
          to: coverage && coverage.to > range.to ? coverage.to : range.to
        }
        saveCoverage(metal, coverage.from, coverage.to)
        console.log(
          `[StackTracker] ${metal} history ${range.from}..${range.to}: ${prices.length} days`
        )
      } catch (error) {
        // e.g. offline, bad key, or the hourly limit was reached. Try again next time.
        console.warn(`[StackTracker] could not fetch ${metal} history:`, (error as Error).message)
      }
    }
  }

  return savedAny
}

/** One request to the history API: average price per day between two dates. */
async function fetchHistory(metal: Metal, from: string, to: string): Promise<DailyPrice[]> {
  const params = new URLSearchParams({
    symbol: SYMBOLS[metal],
    startTimestamp: String(Date.parse(`${from}T00:00:00Z`) / 1000), // Unix time, in seconds
    endTimestamp: String(Date.parse(`${to}T23:59:59Z`) / 1000),
    groupBy: 'day',
    aggregation: 'avg',
    orderBy: 'asc'
  })
  const response = await fetch(`https://api.gold-api.com/history?${params}`, {
    headers: { 'x-api-key': API_KEY as string }
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`)
  }

  // Expected: [{ "day": "2026-07-01", "avg_price": 4200.5 }, ...]
  const rows = (await response.json()) as unknown
  if (!Array.isArray(rows))
    throw new Error(`unexpected response: ${JSON.stringify(rows).slice(0, 200)}`)

  const prices: DailyPrice[] = []
  for (const row of rows as Array<Record<string, unknown>>) {
    const date = String(row.day ?? '').slice(0, 10)
    const price = Number(row.avg_price)
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && price > 0) prices.push({ metal, date, price })
  }
  if (rows.length > 0 && prices.length === 0) {
    throw new Error(`could not read response rows, e.g. ${JSON.stringify(rows[0]).slice(0, 200)}`)
  }
  return prices
}
