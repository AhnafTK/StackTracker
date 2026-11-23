// Everything the UI needs for holdings in one import: types, value math and money formatting.

// The types and value math are shared with the main process, so they live in src/shared.
import type { Holding } from '../../shared/types'
export type { Form, Holding, Metal, NewHolding, SpotPrices, WeightUnit } from '../../shared/types'
export { holdingValue, pureOunces, stackTotals, weightInOunces } from '../../shared/calc'

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

// Words that don't help tell holdings apart, left out of the initials.
const SKIP_WORDS = new Set(['oz', 'g', 'kg', 'coin', 'bar', 'round', 'the', 'of', 'and', 'x'])

/**
 * The short text inside the icon.
 * - Bars show their weight: "10" for 10 oz, "10g" for 10 g, "1kg" for 1 kg.
 * - Coins and rounds show initials: "Gold Maple Leaf" → "GML". A one-word name
 *   uses its first letter plus the next consonants: "Krugerrand" → "KRG".
 *   A name with no words in it ("1/10 oz") shows the weight, like a bar.
 */
export function iconLabel(h: Pick<Holding, 'name' | 'form' | 'weight' | 'unit'>): string {
  const weight = Number(h.weight.toFixed(2))
  const weightLabel = h.unit === 'oz' ? String(weight) : `${weight}${h.unit}`
  if (h.form === 'bar') return weightLabel

  const words = h.name
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w && !/^\d/.test(w) && !SKIP_WORDS.has(w.toLowerCase()))
  if (words.length === 0) return weightLabel // e.g. a coin just named "1/10 oz"

  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  }

  const word = words[0].toUpperCase()
  const consonants = word.slice(1).replace(/[^BCDFGHJKLMNPQRSTVWXZ]/g, '')
  return word[0] + consonants.slice(0, 2)
}
