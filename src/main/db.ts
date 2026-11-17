// Opens the SQLite database file and keeps its tables up to date.
import Database from 'better-sqlite3'

export type DB = Database.Database

/**
 * Each entry upgrades the database by one version. SQLite remembers which
 * version a database file is at (PRAGMA user_version), so on startup only the
 * entries it hasn't run yet are applied.
 *
 * To change the tables later, ADD a new entry at the end (e.g. an ALTER TABLE).
 * Never edit an existing entry: databases that already ran it won't run it again.
 */
const MIGRATIONS: string[] = [
  // Version 1: the holdings table
  `
  CREATE TABLE holdings (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    metal                 TEXT    NOT NULL CHECK (metal IN ('silver', 'gold')),
    name                  TEXT    NOT NULL,
    weight                REAL    NOT NULL CHECK (weight > 0),
    unit                  TEXT    NOT NULL CHECK (unit IN ('oz', 'g', 'kg')),
    purity                REAL    NOT NULL CHECK (purity > 0 AND purity <= 1),
    quantity              INTEGER NOT NULL CHECK (quantity >= 1),
    price_per_item_cents  INTEGER NOT NULL CHECK (price_per_item_cents >= 0),
    purchase_date         TEXT,
    created_at            TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  `
]

export function openDatabase(filePath: string): DB {
  const db = new Database(filePath)
  // WAL mode makes writes faster and safer if the app crashes mid-write.
  db.pragma('journal_mode = WAL')
  migrate(db)
  return db
}

function migrate(db: DB): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number
  for (let version = currentVersion; version < MIGRATIONS.length; version++) {
    // Run each migration in a transaction: it either fully applies or not at all.
    db.transaction(() => {
      db.exec(MIGRATIONS[version])
      db.pragma(`user_version = ${version + 1}`)
    })()
  }
}
