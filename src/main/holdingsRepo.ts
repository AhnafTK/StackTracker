// All the SQL for holdings lives here. The rest of the app calls these functions.
import type { DB } from './db'
import type { Holding, NewHolding } from '../shared/types'

// How a row looks coming out of SQLite (snake_case column names).
interface HoldingRow {
  id: number
  metal: Holding['metal']
  name: string
  weight: number
  unit: Holding['unit']
  purity: number
  quantity: number
  price_per_item_cents: number
  purchase_date: string | null
  created_at: string
}

function toHolding(row: HoldingRow): Holding {
  return {
    id: row.id,
    metal: row.metal,
    name: row.name,
    weight: row.weight,
    unit: row.unit,
    purity: row.purity,
    quantity: row.quantity,
    pricePerItemCents: row.price_per_item_cents,
    purchaseDate: row.purchase_date,
    createdAt: row.created_at
  }
}

export function listHoldings(db: DB): Holding[] {
  const rows = db.prepare('SELECT * FROM holdings ORDER BY id').all() as HoldingRow[]
  return rows.map(toHolding)
}

function getHolding(db: DB, id: number): Holding {
  const row = db.prepare('SELECT * FROM holdings WHERE id = ?').get(id) as HoldingRow | undefined
  if (!row) throw new Error(`Holding ${id} not found`)
  return toHolding(row)
}

// The @names below are filled in from the matching keys of the object passed to .run().
export function addHolding(db: DB, h: NewHolding): Holding {
  const result = db
    .prepare(
      `INSERT INTO holdings
         (metal, name, weight, unit, purity, quantity, price_per_item_cents, purchase_date)
       VALUES
         (@metal, @name, @weight, @unit, @purity, @quantity, @pricePerItemCents, @purchaseDate)`
    )
    .run(h)
  return getHolding(db, Number(result.lastInsertRowid))
}

export function updateHolding(db: DB, id: number, h: NewHolding): Holding {
  const result = db
    .prepare(
      `UPDATE holdings SET
         metal = @metal, name = @name, weight = @weight, unit = @unit, purity = @purity,
         quantity = @quantity, price_per_item_cents = @pricePerItemCents,
         purchase_date = @purchaseDate
       WHERE id = @id`
    )
    .run({ ...h, id })
  if (result.changes === 0) throw new Error(`Holding ${id} not found`)
  return getHolding(db, id)
}

export function deleteHolding(db: DB, id: number): void {
  db.prepare('DELETE FROM holdings WHERE id = ?').run(id)
}

/**
 * Checks data coming from the UI before it touches the database, and returns
 * only the fields we expect. Throws an Error with a readable message if invalid.
 */
export function checkHolding(input: unknown): NewHolding {
  const h = (input ?? {}) as Record<string, unknown>
  const fail = (message: string): never => {
    throw new Error(`Invalid holding: ${message}`)
  }

  if (h.metal !== 'silver' && h.metal !== 'gold') fail('metal must be silver or gold')
  if (typeof h.name !== 'string' || h.name.trim() === '') fail('name is required')
  if (typeof h.weight !== 'number' || !(h.weight > 0)) fail('weight must be greater than 0')
  if (h.unit !== 'oz' && h.unit !== 'g' && h.unit !== 'kg') fail('unit must be oz, g or kg')
  if (typeof h.purity !== 'number' || !(h.purity > 0 && h.purity <= 1))
    fail('purity must be between 0 and 1')
  if (!Number.isInteger(h.quantity) || (h.quantity as number) < 1)
    fail('quantity must be a whole number, 1 or more')
  if (!Number.isInteger(h.pricePerItemCents) || (h.pricePerItemCents as number) < 0)
    fail('pricePerItemCents must be a whole number, 0 or more')
  if (
    h.purchaseDate !== null &&
    (typeof h.purchaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(h.purchaseDate))
  )
    fail('purchaseDate must be YYYY-MM-DD or null')

  return {
    metal: h.metal as NewHolding['metal'],
    name: (h.name as string).trim(),
    weight: h.weight as number,
    unit: h.unit as NewHolding['unit'],
    purity: h.purity as number,
    quantity: h.quantity as number,
    pricePerItemCents: h.pricePerItemCents as number,
    purchaseDate: h.purchaseDate as string | null
  }
}

export function checkId(input: unknown): number {
  if (!Number.isInteger(input) || (input as number) < 1) throw new Error('Invalid holding id')
  return input as number
}
