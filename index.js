import dotenv from 'dotenv'
dotenv.config()

import { Client } from 'discord.js'
import 'discord-reply'
import fsExtra from 'fs-extra'

import { parseCommand } from './src/utils/parseCommand.js'
import { select } from './src/utils/select.js'
import * as pollReactions from './src/poll-reactions.js'

async function help (message) {
  const aliases = new Map()
  for (const [commandName, commandFunc] of Object.entries(commands)) {
    if (!aliases.has(commandFunc)) {
      aliases.set(commandFunc, new Set())
    }
    aliases.get(commandFunc).add(commandName)
  }
  message.lineReply(select([
    'here you gooo',
    'taste and sample as you please',
    'please read carefully',
    'the aliases sometimes describe what the command does, sometimes',
    'helped'
  ]), {
    embed: {
      title: select([
        'nice, some commands',
        'commands and aliases',
        'words that i will accept',
        'helpp'
      ]),
      fields: Array.from(aliases.values(), ([name, ...aliases]) => ({
        name,
        value: aliases.length
          ? `or ${aliases.map(alias => `\`${alias}\``).join(' or ')}`
          : select([
            'no aliases, nice',
            'that\'s it',
            'this command has no aliases'
          ]),
        inline: true
      }))
    }
  })
}
const commands = {
  'poll channel': pollReactions.pollChannel,
  'this is poll': pollReactions.pollChannel,
  'this is poll channel': pollReactions.pollChannel,
  'this is a poll channel': pollReactions.pollChannel,
  'turn on poll channel mode which ': pollReactions.pollChannel,

  'not poll channel': pollReactions.notPollChannel,
  'not poll': pollReactions.notPollChannel,
  'this is not a poll': pollReactions.notPollChannel,
  'this is not a poll channel': pollReactions.notPollChannel,
  'this isn\'t a poll channel': pollReactions.notPollChannel,
  'turn off poll channel mode': pollReactions.notPollChannel,

  'help': help,
  'list all of the commands and their aliases': help
}

const client = new Client()

client.on('message', async message => {
  if (message.author.bot) return

  const parsed = parseCommand(message)
  // If ping
  if (parsed !== null) {
    if (commands[parsed]) {
      await commands[parsed](message)
    } else {
      await message.lineReply(select([
        '<:ping:719277539113041930>',
        'please do not needlessly ping me',
        'do you need help? reply to this message with `help`'
      ]))
    }
    return
  }

  pollReactions.onMessage(message)
})

fsExtra.ensureDir('./data/')
  .then(() => Promise.all([
    pollReactions.onReady()
  ]))
  .then(() => {
    client.login(process.env.TOKEN)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
