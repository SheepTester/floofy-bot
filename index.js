import dotenv from 'dotenv'
dotenv.config()

import { Client } from 'discord.js'
import 'discord-reply'
import fsExtra from 'fs-extra'
import { parseCommand } from './src/utils/parseCommand.js'
import { ready, handlers } from './src/handlers.js'

const client = new Client()

client.on('message', async message => {
  const parsed = parseCommand(message)
  const data = { parsed, message, client }
  for (const handler of handlers) {
    if (await handler(data)) {
      return
    }
  }
})

fsExtra.ensureDir('./data/')
  .then(() => ready())
  .then(() => {
    client.login(process.env.TOKEN)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
