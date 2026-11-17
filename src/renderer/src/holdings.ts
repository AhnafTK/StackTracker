// What a holding is, and the math for valuing it.

// The types are shared with the main process, so they live in src/shared/types.ts.
import type { Holding, WeightUnit, SpotPrices } from '../../shared/types'
export type { Holding, Metal, NewHolding, SpotPrices, WeightUnit } from '../../shared/types'

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

/** What a holding is worth at today's spot price for its metal. */
export function holdingValue(
  h: Pick<Holding, 'metal' | 'weight' | 'unit' | 'purity' | 'quantity'>,
  prices: SpotPrices
): number {
  return pureOunces(h) * prices[h.metal]
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

/** Formats a whole-cents amount, e.g. 3650 → "$36.50". */
export function formatCents(cents: number): string {
  return formatMoney(cents / 100)
}

/** Turns what the user typed ("36.5") into whole cents (3650). */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}
