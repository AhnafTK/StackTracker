
import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export interface NewHolding {
  name: string
  weight: number
  unit: 'oz' | 'g' | 'kg'
  purity: number
  quantity: number
  pricePerItem: number
}

export interface Holding extends NewHolding {
  id: string
}

let db: DatabaseSync

export function initializeDatabase(): void {
  const databasePath = join(app.getPath('userData'), 'stacktracker.db')
  db = new DatabaseSync(databasePath)

  // The previous prototype used a different table structure.
  // Keep any existing data safe by renaming that table.
  const columns = db
    .prepare('PRAGMA table_info(holdings)')
    .all() as Array<{ name: string }>

  if (columns.length > 0 && !columns.some((column) => column.name === 'name')) {
    db.exec('ALTER TABLE holdings RENAME TO holdings_legacy')
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      weight REAL NOT NULL,
      unit TEXT NOT NULL,
      purity REAL NOT NULL,
      quantity INTEGER NOT NULL,
      price_per_item REAL NOT NULL
    )
  `)

  console.log('Database initialized at:', databasePath)
}

export function addHolding(holding: NewHolding): Holding {
  const savedHolding: Holding = {
    id: randomUUID(),
    ...holding
  }

  const statement = db.prepare(`
    INSERT INTO holdings (
      id, name, weight, unit, purity, quantity, price_per_item
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  statement.run(
    savedHolding.id,
    savedHolding.name,
    savedHolding.weight,
    savedHolding.unit,
    savedHolding.purity,
    savedHolding.quantity,
    savedHolding.pricePerItem
  )

  return savedHolding
}

export function getHoldings(): Holding[] {
  const rows = db.prepare(`
    SELECT id, name, weight, unit, purity, quantity,
           price_per_item AS pricePerItem
    FROM holdings
  `).all()

  return rows as unknown as Holding[]
}
