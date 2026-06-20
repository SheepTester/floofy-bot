// TODO: replace with --env-file=.env
import { config } from 'dotenv'
config()

await import('./dist/index.js')
