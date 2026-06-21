import { DatabaseSync } from 'node:sqlite'

// Enables foreign key constraints by default
export const db = new DatabaseSync(
  process.env.DATABASE_URL?.replace('sqlite:', '') ?? ':memory:'
)
// Writes to separate, smaller .db-wal file, which is allegedly faster
db.exec('PRAGMA journal_mode=WAL')
// Lets OS buffer writes without waiting for disk to confirm the write actually
// happened
db.exec('PRAGMA synchronous=NORMAL')
// Prefer doing complex queries in memory, but allegedly sqlite will still fall
// back to disk if not enough memory
db.exec('PRAGMA temp_store = MEMORY')
