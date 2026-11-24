// Sample data for demos: `npm run dev:demo`.
//
// Demo mode runs on a throwaway in-memory database, so your real holdings are
// never opened or changed, and nothing from the demo is saved. Every launch
// produces exactly the same data (the "random" numbers come from a fixed seed),
// and nothing is fetched from the internet.
import { addHolding, saveCoverage, savePrices } from './database'
import { addDays, daysBefore, localDate, weightInOunces } from '../shared/calc'
import type { DailyPrice, Form, Metal, NewHolding, SpotPrices, WeightUnit } from '../shared/types'

/** Roughly where prices are today, so the demo looks realistic. */
const END_PRICE: SpotPrices = { silver: 42.99, gold: 3634.4 }
/** How much lower prices were a year and a bit ago (both metals rose a lot). */
const START_FRACTION: SpotPrices = { silver: 0.72, gold: 0.76 }
/** Where the last day of history closes, relative to today, so today shows a small move up. */
const LAST_CLOSE_FRACTION: SpotPrices = { silver: 0.988, gold: 0.994 }
/** Typical daily price movement: silver is jumpier than gold. */
const DAILY_VOLATILITY: SpotPrices = { silver: 0.018, gold: 0.009 }
const HISTORY_DAYS = 420

interface SampleHolding {
  name: string
  metal: Metal
  form: Form
  weight: number
  unit: WeightUnit
  purity: number
  quantity: number
  daysAgo: number
  /** Dealer premium over the metal's value, e.g. 0.08 = 8%. */
  premium: number
}

// Bought gradually over the past year, like a real stack.
const SAMPLE_HOLDINGS: SampleHolding[] = [
  {
    name: 'Gold Maple Leaf',
    metal: 'gold',
    form: 'coin',
    weight: 1,
    unit: 'oz',
    purity: 0.9999,
    quantity: 2,
    daysAgo: 400,
    premium: 0.04
  },
  {
    name: 'American Silver Eagle',
    metal: 'silver',
    form: 'coin',
    weight: 1,
    unit: 'oz',
    purity: 0.999,
    quantity: 20,
    daysAgo: 370,
    premium: 0.12
  },
  {
    name: 'Generic 1 oz Round',
    metal: 'silver',
    form: 'round',
    weight: 1,
    unit: 'oz',
    purity: 0.999,
    quantity: 30,
    daysAgo: 320,
    premium: 0.05
  },
  {
    name: 'PAMP Suisse 10 oz Bar',
    metal: 'silver',
    form: 'bar',
    weight: 10,
    unit: 'oz',
    purity: 0.999,
    quantity: 2,
    daysAgo: 270,
    premium: 0.04
  },
  {
    name: 'Valcambi 10 g Gold Bar',
    metal: 'gold',
    form: 'bar',
    weight: 10,
    unit: 'g',
    purity: 0.9999,
    quantity: 3,
    daysAgo: 210,
    premium: 0.03
  },
  {
    name: 'Canadian Maple Leaf',
    metal: 'silver',
    form: 'coin',
    weight: 1,
    unit: 'oz',
    purity: 0.9999,
    quantity: 15,
    daysAgo: 160,
    premium: 0.08
  },
  {
    name: 'Royal Mint Britannia',
    metal: 'silver',
    form: 'coin',
    weight: 1,
    unit: 'oz',
    purity: 0.999,
    quantity: 10,
    daysAgo: 110,
    premium: 0.07
  },
  {
    name: 'Krugerrand',
    metal: 'gold',
    form: 'coin',
    weight: 1.0909,
    unit: 'oz',
    purity: 0.9167,
    quantity: 1,
    daysAgo: 60,
    premium: 0.04
  },
  {
    name: '100 g Silver Bar',
    metal: 'silver',
    form: 'bar',
    weight: 100,
    unit: 'g',
    purity: 0.999,
    quantity: 2,
    daysAgo: 25,
    premium: 0.05
  },
  {
    name: 'American Gold Eagle 1/10 oz',
    metal: 'gold',
    form: 'coin',
    weight: 0.1091,
    unit: 'oz',
    purity: 0.9167,
    quantity: 4,
    daysAgo: 8,
    premium: 0.09
  }
]

/**
 * Fills the (empty, in-memory) database with sample price history and holdings.
 * Returns today's sample spot prices, used in place of live prices.
 */
export function seedDemoData(): SpotPrices {
  const random = seededRandom(20261123)
  const today = localDate()
  const firstDay = daysBefore(today, HISTORY_DAYS)

  // 1. Daily prices for each metal, weekdays only (markets close on weekends).
  const days: string[] = []
  for (let d = firstDay; d < today; d = addDays(d, 1)) {
    const weekday = new Date(`${d}T00:00:00`).getDay()
    if (weekday !== 0 && weekday !== 6) days.push(d)
  }
  const priceOn: Record<Metal, Map<string, number>> = { silver: new Map(), gold: new Map() }
  for (const metal of ['silver', 'gold'] as const) {
    const path = pricePath(
      END_PRICE[metal] * START_FRACTION[metal],
      END_PRICE[metal] * LAST_CLOSE_FRACTION[metal],
      days.length,
      DAILY_VOLATILITY[metal],
      random
    )
    const prices: DailyPrice[] = days.map((date, i) => ({ metal, date, price: round(path[i], 2) }))
    prices.forEach((p) => priceOn[metal].set(p.date, p.price))
    savePrices(prices, 'history')
    // Mark these dates as already fetched, so nothing is requested from gold-api.com.
    saveCoverage(metal, firstDay, daysBefore(today, 1))
  }

  // 2. Holdings, each bought at that day's price plus a dealer premium.
  for (const s of SAMPLE_HOLDINGS) {
    const purchaseDate = daysBefore(today, s.daysAgo)
    const spot = priceOnOrBefore(priceOn[s.metal], purchaseDate)
    const pureOunces = weightInOunces(s) * s.purity
    const holding: NewHolding = {
      metal: s.metal,
      form: s.form,
      name: s.name,
      weight: s.weight,
      unit: s.unit,
      purity: s.purity,
      quantity: s.quantity,
      pricePerItemCents: Math.round(pureOunces * spot * (1 + s.premium) * 100),
      purchaseDate
    }
    addHolding(holding)
  }

  return { ...END_PRICE }
}

/** Today's sample prices, nudged slightly each time so "Refresh" visibly does something. */
export function demoSpotPrices(): SpotPrices {
  const wiggle = (price: number): number => round(price * (1 + (Math.random() - 0.5) * 0.004), 2)
  return { silver: wiggle(END_PRICE.silver), gold: wiggle(END_PRICE.gold) }
}

/**
 * A believable price series from `start` to exactly `end`: a random walk with
 * small daily ups and downs, then bent so it lands on `end` on the last day.
 */
function pricePath(
  start: number,
  end: number,
  steps: number,
  volatility: number,
  random: () => number
): number[] {
  const walk = [0]
  for (let i = 1; i < steps; i++) walk.push(walk[i - 1] + normal(random) * volatility)
  const target = Math.log(end / start)
  const last = walk[steps - 1]
  // Spread the difference between where the walk ended and the target evenly over the days.
  return walk.map((w, i) => start * Math.exp(w + ((target - last) * i) / (steps - 1)))
}

function priceOnOrBefore(prices: Map<string, number>, date: string): number {
  for (let d = date, i = 0; i < 10; d = daysBefore(d, 1), i++) {
    const price = prices.get(d)
    if (price !== undefined) return price
  }
  throw new Error(`No sample price near ${date}`)
}

/** A repeatable random number generator (mulberry32): the same seed gives the same numbers. */
function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A random number from a bell curve (mean 0, spread 1), via the Box-Muller method. */
function normal(random: () => number): number {
  const u = 1 - random()
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function round(n: number, places: number): number {
  return Number(n.toFixed(places))
}
