/**
 * @file
 * Dumps all tables into data/export/. data/export/ can be used as a git repo to
 * track changes or keep backups on GitHub.
 *
 * Usage: node --env-file=.env scripts/export.ts
 */

import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { DatabaseSync, type SQLOutputValue } from 'node:sqlite'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import z from 'zod'

const db = new DatabaseSync(
  process.env.DATABASE_URL?.replace('sqlite:', '') ?? ':memory:',
  { readOnly: true }
)

await mkdir('./data/export/', { recursive: true })

const getPrimaryKeySchema = z.strictObject({ name: z.string(), pk: z.number() })
const getPrimaryKeys = db.prepare(
  'select name, pk from pragma_table_info(?) where pk > 0'
)

function * allRows (table: string): Generator<string> {
  let first = true
  for (const row of db
    .prepare(
      `select * from ${table} order by ${getPrimaryKeys
        .iterate(table)
        .map(row => getPrimaryKeySchema.parse(row))
        .toArray()
        .toSorted((a, b) => a.pk - b.pk)
        .map(({ name }) => name)
        .join(', ')}`
    )
    .iterate()) {
    if (first) {
      yield `[ ${JSON.stringify(Object.keys(row))}\n`
      first = false
    }
    yield `, ${JSON.stringify(Object.values(row))}\n`
  }
  yield first ? '[]\n' : ']\n'
}

const nameSchema = z.strictObject({ name: z.string() })
for (const { name: table } of db
  .prepare("select name from sqlite_master where type = 'table'")
  .iterate()
  .map(row => nameSchema.parse(row))) {
  await pipeline(
    Readable.from(allRows(table)),
    // @ts-expect-error Might be related to DOM type conflicts, and a package is
    // ///-referencing dom types, so I can't get rid of them
    createWriteStream(`./data/export/${table}.json`)
  )
}
