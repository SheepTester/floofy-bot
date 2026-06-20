import { DatabaseSync } from 'node:sqlite'

export const db = new DatabaseSync(
  process.env.DATABASE_URL?.replace('sqlite:', '') ?? ':memory:'
)
