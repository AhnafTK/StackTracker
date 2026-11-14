
// Types and calculations for precious metal holdings

export type Metal = 'silver' | 'gold'
export type WeightUnit = 'oz' | 'g' | 'kg'

export interface SpotPrices {
  silver: number
  gold: number
}

export interface Holding {
  id: string
  metal: Metal
  name: string
  weight: number
  unit: WeightUnit
  purity: number
  quantity: number
  pricePerItem: number
  purchaseDate: string | null
}

export type NewHolding = Omit<Holding, 'id'>

const GRAMS_PER_TROY_OUNCE = 31.1034768

function toTroyOunces(weight: number, unit: WeightUnit): number {
  if (unit === 'g') {
    return weight / GRAMS_PER_TROY_OUNCE
  }

  if (unit === 'kg') {
    return (weight * 1000) / GRAMS_PER_TROY_OUNCE
  }

  return weight
}

export function pureOunces(
  h: Pick<Holding, 'weight' | 'unit' | 'purity' | 'quantity'>
): number {
  return toTroyOunces(h.weight, h.unit) * h.purity * h.quantity
}

export function holdingValue(
  h: Pick<Holding, 'metal' | 'weight' | 'unit' | 'purity' | 'quantity'>,
  prices: SpotPrices
): number {
  return pureOunces(h) * prices[h.metal]
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}
