// Everything the UI needs for holdings in one import: types, value math and money formatting.

// The types and value math are shared with the main process, so they live in src/shared.
export type { Holding, Metal, NewHolding, SpotPrices, WeightUnit } from '../../shared/types'
export { holdingValue, pureOunces, stackTotals } from '../../shared/calc'

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

/** Formats a whole-cents amount, e.g. 3650 → "$36.50". */
export function formatCents(cents: number): string {
  return formatMoney(cents / 100)
}

/** Turns a dollar amount the user typed (36.5) into whole cents (3650). */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}
