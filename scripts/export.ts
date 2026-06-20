/**
 * @file
 * Dumps all tables into data/export/ (WIP)
 *
 * Usage: node --env-file=.env scripts/export.ts
 */

import { mkdir } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync(
  process.env.DATABASE_URL?.replace('sqlite:', '') ?? ':memory:',
  { readOnly: true }
)

await mkdir('./data/export/', { recursive: true })
