
import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export interface NewHolding {
  metal: 'silver' | 'gold'
  name: string
  weight: number
  unit: 'oz' | 'g' | 'kg'
  purity: number
  quantity: number
  pricePerItem: number
  purchaseDate: string | null
}

export interface Holding extends NewHolding {
  id: string
}

let db: DatabaseSync

export function initializeDatabase(): void {
  const databasePath = join(app.getPath('userData'), 'stacktracker.db')
  db = new DatabaseSync(databasePath)

  const columns = db.prepare('PRAGMA table_info(holdings)').all() as Array<{ name: string }>

  // Preserve the original prototype table if it uses the old schema.
  if (columns.length > 0 && !columns.some((column) => column.name === 'name')) {
    db.exec('ALTER TABLE holdings RENAME TO holdings_legacy')
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id TEXT PRIMARY KEY,
      metal TEXT NOT NULL DEFAULT 'silver',
      name TEXT NOT NULL,
      weight REAL NOT NULL,
      unit TEXT NOT NULL,
      purity REAL NOT NULL,
      quantity INTEGER NOT NULL,
      price_per_item REAL NOT NULL,
      purchase_date TEXT
    )
  `)

  // Upgrade existing databases without deleting saved holdings.
  const existingColumns = db.prepare('PRAGMA table_info(holdings)').all() as Array<{
    name: string
  }>
  const names = new Set(existingColumns.map((column) => column.name))

  if (!names.has('metal')) {
    db.exec("ALTER TABLE holdings ADD COLUMN metal TEXT NOT NULL DEFAULT 'silver'")
  }

  if (!names.has('purchase_date')) {
    db.exec('ALTER TABLE holdings ADD COLUMN purchase_date TEXT')
  }

  console.log('Database initialized at:', databasePath)
}

export function addHolding(holding: NewHolding): Holding {
  const savedHolding: Holding = {
    ...holding,
    id: randomUUID()
  }

  db.prepare(`
    INSERT INTO holdings (
      id, metal, name, weight, unit, purity,
      quantity, price_per_item, purchase_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    savedHolding.id,
    savedHolding.metal,
    savedHolding.name,
    savedHolding.weight,
    savedHolding.unit,
    savedHolding.purity,
    savedHolding.quantity,
    savedHolding.pricePerItem,
    savedHolding.purchaseDate
  )

  return savedHolding
}

export function getHoldings(): Holding[] {
  return db.prepare(`
    SELECT
      id,
      metal,
      name,
      weight,
      unit,
      purity,
      quantity,
      price_per_item AS pricePerItem,
      purchase_date AS purchaseDate
    FROM holdings
  `).all() as unknown as Holding[]
}

export function updateHolding(id: string, holding: NewHolding): Holding {
  const result = db.prepare(`
    UPDATE holdings
    SET metal = ?,
        name = ?,
        weight = ?,
        unit = ?,
        purity = ?,
        quantity = ?,
        price_per_item = ?,
        purchase_date = ?
    WHERE id = ?
  `).run(
    holding.metal,
    holding.name,
    holding.weight,
    holding.unit,
    holding.purity,
    holding.quantity,
    holding.pricePerItem,
    holding.purchaseDate,
    id
  )

  if (result.changes === 0) {
    throw new Error('Holding not found')
  }

  return { ...holding, id }
}

export function deleteHolding(id: string): void {
  db.prepare('DELETE FROM holdings WHERE id = ?').run(id)
}
