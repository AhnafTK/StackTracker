// What a holding is, and the math for valuing it.

export type Metal = 'silver' | 'gold'
export type WeightUnit = 'oz' | 'g' | 'kg'

/** Spot prices in USD per troy ounce. */
export interface SpotPrices {
  silver: number
  gold: number
}

export interface Holding {
  id: string
  metal: Metal
  name: string
  /** Weight of ONE item, in `unit`. */
  weight: number
  /** 'oz' means troy ounces, the standard unit for precious metals. */
  unit: WeightUnit
  /** Fraction of pure metal, e.g. 0.9999 */
  purity: number
  quantity: number
  /** What you paid for ONE item. */
  pricePerItem: number
  /** "YYYY-MM-DD", or null if not entered. */
  purchaseDate: string | null
}

/** A holding before it has an id, i.e. what the Add form produces. */
export type NewHolding = Omit<Holding, 'id'>

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
