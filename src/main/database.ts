// The SQLite database: creating and upgrading the table, and every query.
// Uses node:sqlite, which is built into the Node.js that ships with Electron.
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import type { DailyPrice, Holding, Metal, NewHolding, StackSnapshot } from '../shared/types'

let db: DatabaseSync | null = null

function database(): DatabaseSync {
  if (!db) throw new Error('Database not initialized')
  return db
}

// ---------------------------------------------------------------------------
// Setup and upgrades
// ---------------------------------------------------------------------------

/**
 * Each entry upgrades the database by one version. SQLite remembers which
 * version a database file is at (PRAGMA user_version), so on startup only the
 * entries it hasn't run yet are applied, each inside a transaction.
 *
 * To change the table later, ADD a new entry at the end. Never edit an
 * existing entry: databases that already ran it won't run it again.
 */
const MIGRATIONS: Array<(db: DatabaseSync) => void> = [
  // Version 1: holdings table with prices in whole cents and validity rules.
  // Also upgrades the earlier unversioned table, which stored dollars in `price_per_item`.
  (db) => {
    let columns = columnNames(db, 'holdings')

    // A table this code doesn't recognise (e.g. the original prototype): set it aside, untouched.
    if (columns.size > 0 && !columns.has('price_per_item')) {
      const legacyName = unusedTableName(db, 'holdings_legacy')
      db.exec(`ALTER TABLE holdings RENAME TO ${legacyName}`)
      console.log(`[StackTracker] unrecognised holdings table kept as ${legacyName}`)
      columns = new Set()
    }

    const upgradingOldTable = columns.has('price_per_item')
    if (upgradingOldTable) db.exec('ALTER TABLE holdings RENAME TO holdings_old')

    db.exec(`
      CREATE TABLE holdings (
        id                    TEXT    PRIMARY KEY,
        metal                 TEXT    NOT NULL CHECK (metal IN ('silver', 'gold')),
        name                  TEXT    NOT NULL CHECK (length(trim(name)) > 0),
        weight                REAL    NOT NULL CHECK (weight > 0),
        unit                  TEXT    NOT NULL CHECK (unit IN ('oz', 'g', 'kg')),
        purity                REAL    NOT NULL CHECK (purity > 0 AND purity <= 1),
        quantity              INTEGER NOT NULL CHECK (quantity >= 1),
        price_per_item_cents  INTEGER NOT NULL CHECK (price_per_item_cents >= 0),
        purchase_date         TEXT,
        created_at            TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    if (upgradingOldTable) {
      // Very early versions of the old table might lack these two columns.
      const metal = columns.has('metal') ? 'metal' : "'silver'"
      const purchaseDate = columns.has('purchase_date') ? 'purchase_date' : 'NULL'

      // Copy rows across, converting dollars to cents. OR IGNORE skips rows that
      // break the new rules (the old table had none) instead of failing the upgrade.
      db.exec(`
        INSERT OR IGNORE INTO holdings
          (id, metal, name, weight, unit, purity, quantity, price_per_item_cents, purchase_date)
        SELECT
          id, ${metal}, name, weight, unit, purity, quantity,
          CAST(ROUND(price_per_item * 100) AS INTEGER), ${purchaseDate}
        FROM holdings_old
        ORDER BY rowid
      `)

      const oldCount = countRows(db, 'holdings_old')
      const newCount = countRows(db, 'holdings')
      if (oldCount === newCount) {
        db.exec('DROP TABLE holdings_old')
      } else {
        // Keep the original data so nothing is lost; the skipped rows can be fixed by hand.
        const keptName = unusedTableName(db, 'holdings_skipped')
        db.exec(`ALTER TABLE holdings_old RENAME TO ${keptName}`)
        console.warn(
          `[StackTracker] ${oldCount - newCount} invalid holding(s) not copied; originals kept in ${keptName}`
        )
      }
    }
  },

  // Version 2: one snapshot of the stack's total value and total paid per day,
  // used to draw the value-over-time chart.
  (db) => {
    db.exec(`
      CREATE TABLE stack_snapshots (
        date         TEXT    PRIMARY KEY,
        value_cents  INTEGER NOT NULL CHECK (value_cents >= 0),
        cost_cents   INTEGER NOT NULL CHECK (cost_cents >= 0),
        recorded_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  },

  // Version 3: daily spot prices, for working out the stack's value on past days.
  // Past days come from gold-api.com's history API; today comes from live fetches.
  // history_coverage remembers which date range has already been requested from the
  // API for each metal, so weekends and holidays (which have no price) aren't re-asked.
  (db) => {
    db.exec(`
      CREATE TABLE price_history (
        metal   TEXT NOT NULL CHECK (metal IN ('silver', 'gold')),
        date    TEXT NOT NULL,
        price   REAL NOT NULL CHECK (price > 0),
        source  TEXT NOT NULL CHECK (source IN ('history', 'live')),
        PRIMARY KEY (metal, date)
      );

      CREATE TABLE history_coverage (
        metal      TEXT PRIMARY KEY CHECK (metal IN ('silver', 'gold')),
        from_date  TEXT NOT NULL,
        to_date    TEXT NOT NULL
      );
    `)
  },

  // Version 4: what kind of item each holding is (coin, bar or round), shown in
  // the holdings list. Existing holdings are guessed from their names; anything
  // without the word "round" or "bar" is treated as a coin and can be changed by editing.
  (db) => {
    db.exec(`
      ALTER TABLE holdings
        ADD COLUMN form TEXT NOT NULL DEFAULT 'coin' CHECK (form IN ('coin', 'bar', 'round'));

    `)

    // Match whole words only, so "Barbados" isn't a bar. Punctuation counts as a space.
    const words =
      "' ' || lower(replace(replace(replace(name, '-', ' '), ',', ' '), '.', ' ')) || ' '"
    db.exec(`
      UPDATE holdings SET form = 'round'
        WHERE ${words} LIKE '% round %' OR ${words} LIKE '% rounds %';
      UPDATE holdings SET form = 'bar'
        WHERE form = 'coin' AND (${words} LIKE '% bar %' OR ${words} LIKE '% bars %');
    `)
  }
]

/** Opens (or creates) the database file and brings it up to the latest version. */
export function initializeDatabase(databasePath: string): void {
  db = new DatabaseSync(databasePath)

  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  for (let version = row.user_version; version < MIGRATIONS.length; version++) {
    db.exec('BEGIN')
    try {
      MIGRATIONS[version](db)
      db.exec(`PRAGMA user_version = ${version + 1}`)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
}

export function closeDatabase(): void {
  db?.close()
  db = null
}

function columnNames(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return new Set(rows.map((r) => r.name))
}

function countRows(db: DatabaseSync, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n
}

/** Returns `base`, or `base_2`, `base_3`… if a table with that name already exists. */
function unusedTableName(db: DatabaseSync, base: string): string {
  const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
  let name = base
  for (let n = 2; exists.get(name); n++) name = `${base}_${n}`
  return name
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const SELECT_HOLDING = `
  SELECT
    id,
    metal,
    form,
    name,
    weight,
    unit,
    purity,
    quantity,
    price_per_item_cents AS pricePerItemCents,
    purchase_date AS purchaseDate,
    created_at AS createdAt
  FROM holdings
`

/** All holdings, oldest first (in the order they were added). */
export function getHoldings(): Holding[] {
  return database()
    .prepare(`${SELECT_HOLDING} ORDER BY created_at, rowid`)
    .all() as unknown as Holding[]
}

function getHolding(id: string): Holding {
  const row = database().prepare(`${SELECT_HOLDING} WHERE id = ?`).get(id)
  if (!row) throw new Error('Holding not found')
  return row as unknown as Holding
}

export function addHolding(holding: NewHolding): Holding {
  const id = randomUUID()
  database()
    .prepare(
      `INSERT INTO holdings (
        id, metal, form, name, weight, unit, purity,
        quantity, price_per_item_cents, purchase_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      holding.metal,
      holding.form,
      holding.name,
      holding.weight,
      holding.unit,
      holding.purity,
      holding.quantity,
      holding.pricePerItemCents,
      holding.purchaseDate
    )
  return getHolding(id)
}

export function updateHolding(id: string, holding: NewHolding): Holding {
  const result = database()
    .prepare(
      `UPDATE holdings
      SET metal = ?,
          form = ?,
          name = ?,
          weight = ?,
          unit = ?,
          purity = ?,
          quantity = ?,
          price_per_item_cents = ?,
          purchase_date = ?
      WHERE id = ?`
    )
    .run(
      holding.metal,
      holding.form,
      holding.name,
      holding.weight,
      holding.unit,
      holding.purity,
      holding.quantity,
      holding.pricePerItemCents,
      holding.purchaseDate,
      id
    )

  if (result.changes === 0) {
    throw new Error('Holding not found')
  }

  return getHolding(id)
}

export function deleteHolding(id: string): void {
  database().prepare('DELETE FROM holdings WHERE id = ?').run(id)
}

// ---------------------------------------------------------------------------
// Daily snapshots of the stack's value
// ---------------------------------------------------------------------------

/** Saves the stack's totals for a day. Saving again on the same day replaces it. */
export function saveSnapshot(date: string, valueCents: number, costCents: number): void {
  database()
    .prepare(
      `INSERT INTO stack_snapshots (date, value_cents, cost_cents) VALUES (?, ?, ?)
       ON CONFLICT (date) DO UPDATE SET
         value_cents = excluded.value_cents,
         cost_cents  = excluded.cost_cents,
         recorded_at = CURRENT_TIMESTAMP`
    )
    .run(date, valueCents, costCents)
}

export function deleteSnapshot(date: string): void {
  database().prepare('DELETE FROM stack_snapshots WHERE date = ?').run(date)
}

/** Every saved day, oldest first. */
export function getSnapshots(): StackSnapshot[] {
  return database()
    .prepare(
      `SELECT date, value_cents AS valueCents, cost_cents AS costCents
       FROM stack_snapshots
       ORDER BY date`
    )
    .all() as unknown as StackSnapshot[]
}

// ---------------------------------------------------------------------------
// Daily spot prices
// ---------------------------------------------------------------------------

/**
 * Saves prices for some days. A price from the history API replaces anything;
 * a live price never overwrites a history price (the history value is the
 * day's settled average, the live one just a moment in the day).
 */
export function savePrices(prices: DailyPrice[], source: 'history' | 'live'): void {
  const db = database()
  const statement = db.prepare(
    source === 'history'
      ? `INSERT INTO price_history (metal, date, price, source) VALUES (?, ?, ?, 'history')
         ON CONFLICT (metal, date) DO UPDATE SET price = excluded.price, source = 'history'`
      : `INSERT INTO price_history (metal, date, price, source) VALUES (?, ?, ?, 'live')
         ON CONFLICT (metal, date) DO UPDATE SET price = excluded.price
         WHERE price_history.source = 'live'`
  )
  db.exec('BEGIN')
  try {
    for (const p of prices) statement.run(p.metal, p.date, p.price)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

/** Every saved daily price, oldest first. */
export function getPriceHistory(): DailyPrice[] {
  return database()
    .prepare('SELECT metal, date, price FROM price_history ORDER BY date, metal')
    .all() as unknown as DailyPrice[]
}

/** The date range already requested from the history API for a metal, if any. */
export function getCoverage(metal: Metal): { from: string; to: string } | null {
  const row = database()
    .prepare('SELECT from_date AS "from", to_date AS "to" FROM history_coverage WHERE metal = ?')
    .get(metal)
  return (row as { from: string; to: string } | undefined) ?? null
}

export function saveCoverage(metal: Metal, from: string, to: string): void {
  database()
    .prepare(
      `INSERT INTO history_coverage (metal, from_date, to_date) VALUES (?, ?, ?)
       ON CONFLICT (metal) DO UPDATE SET from_date = excluded.from_date, to_date = excluded.to_date`
    )
    .run(metal, from, to)
}

// ---------------------------------------------------------------------------
// Checking data that comes from the UI
// ---------------------------------------------------------------------------

/**
 * Checks a holding sent from the UI before it touches the database, and
 * returns only the fields we expect. Throws an Error with a readable message.
 */
export function validateHolding(input: unknown): NewHolding {
  const h = (input ?? {}) as Record<string, unknown>
  const fail = (message: string): never => {
    throw new Error(`Invalid holding: ${message}`)
  }

  if (h.metal !== 'silver' && h.metal !== 'gold') fail('metal must be silver or gold')
  if (typeof h.name !== 'string' || h.name.trim() === '') fail('name is required')
  if (typeof h.weight !== 'number' || !(h.weight > 0)) fail('weight must be greater than 0')
  if (h.form !== 'coin' && h.form !== 'bar' && h.form !== 'round')
    fail('form must be coin, bar or round')
  if (h.unit !== 'oz' && h.unit !== 'g' && h.unit !== 'kg') fail('unit must be oz, g or kg')
  if (typeof h.purity !== 'number' || !(h.purity > 0 && h.purity <= 1))
    fail('purity must be between 0 and 1')
  if (!Number.isInteger(h.quantity) || (h.quantity as number) < 1)
    fail('quantity must be a whole number, 1 or more')
  if (!Number.isInteger(h.pricePerItemCents) || (h.pricePerItemCents as number) < 0)
    fail('pricePerItemCents must be a whole number of cents, 0 or more')
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
    form: h.form as NewHolding['form'],
    purity: h.purity as number,
    quantity: h.quantity as number,
    pricePerItemCents: h.pricePerItemCents as number,
    purchaseDate: h.purchaseDate as string | null
  }
}

export function validateId(input: unknown): string {
  if (typeof input !== 'string' || input.trim() === '') throw new Error('Invalid holding id')
  return input
}
