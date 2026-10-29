// What a holding is, and the math for valuing it.

export type WeightUnit = 'oz' | 'g' | 'kg'

export interface Holding {
  id: string
  name: string
  /** Weight of ONE item, in `unit`. */
  weight: number
  /** 'oz' means troy ounces, the standard unit for precious metals. */
  unit: WeightUnit
  /** Fraction of pure silver, e.g. 0.9999 */
  purity: number
  quantity: number
  /** What you paid for ONE item. Not used in the balance yet; needed later for profit/loss. */
  pricePerItem: number
}

/** A holding before it has an id, i.e. what the Add form produces. */
export type NewHolding = Omit<Holding, 'id'>

const GRAMS_PER_TROY_OUNCE = 31.1034768

function toTroyOunces(weight: number, unit: WeightUnit): number {
  if (unit === 'g') return weight / GRAMS_PER_TROY_OUNCE
  if (unit === 'kg') return (weight * 1000) / GRAMS_PER_TROY_OUNCE
  return weight
}

/** Troy ounces of pure silver in a holding (all items combined). */
export function pureOunces(h: Holding): number {
  return toTroyOunces(h.weight, h.unit) * h.purity * h.quantity
}

/** What a holding is worth at the given silver price (USD per troy ounce). */
export function holdingValue(h: Holding, silverPrice: number): number {
  return pureOunces(h) * silverPrice
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}
