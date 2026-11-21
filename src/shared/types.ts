// Types used by both the main process (database) and the renderer (React UI).
// Defined once here so the two sides can't drift apart.

export type Metal = 'silver' | 'gold'
export type WeightUnit = 'oz' | 'g' | 'kg'

/** Spot prices in USD per troy ounce. */
export interface SpotPrices {
  silver: number
  gold: number
}

export interface Holding {
  /** A UUID assigned when the holding is first saved. */
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
  /**
   * What you paid for ONE item, in whole cents (USD). $36.50 is stored as 3650.
   * Whole numbers avoid floating-point rounding errors (0.1 + 0.2 = 0.30000000000000004).
   */
  pricePerItemCents: number
  /** "YYYY-MM-DD", or null if not entered. */
  purchaseDate: string | null
}

/** A holding before it's saved, i.e. what the Add/Edit form produces. */
export type NewHolding = Omit<Holding, 'id'>
