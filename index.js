require('dotenv').config()

const { Client } = require('discord.js')
require('discord-reply')
const fs = require('fs-extra')

const parseCommand = require('./src/utils/parseCommand.js')
const select = require('./src/utils/select.js')
const about = require('./src/about.js')
const ignore = require('./src/ignore-us.js')
const pollReactions = require('./src/poll-reactions.js')
const source = require('./src/source.js')
const internals = require('./src/internals.js')

async function help (message) {
  const aliases = new Map()
  for (const [commandName, commandFunc] of Object.entries(commands)) {
    if (!aliases.has(commandFunc)) {
      aliases.set(commandFunc, new Set())
    }
    aliases.get(commandFunc).add(commandName)
  }
  message.lineReply(
    select([
      'here you gooo',
      'taste and sample as you please',
      'please read carefully',
      'the aliases sometimes describe what the command does, sometimes',
      'helped'
    ]),
    {
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
                "that's it",
                'this command has no aliases'
              ]),
          inline: true
        }))
      }
    }
  )
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
  "this isn't a poll channel": pollReactions.notPollChannel,
  'turn off poll channel mode': pollReactions.notPollChannel,

  'ignore us please': ignore.ignore,
  exeunt: internals.exit,

  'source of <id>': source.getSource,
  'source of <id> in <id>': source.getSource,
  'get raw message source of message <id> in this channel': source.getSource,
  'get raw message source of message <id> in channel <id>': source.getSource,
  'source of <id>-<id>': source.getSourceFlipped,
  'get source of <id>-<id>': source.getSourceFlipped,
  'get raw message source of message in channel <id> with id <id>':
    source.getSourceFlipped,

  'how old is <id>': source.getDate,
  'when was <id> created': source.getDate,
  'when did i join discord': source.getDate,
  'how old am i': source.getDate,

  about: about.about,
  'who are you': about.about,
  'introduce yourself': about.about,

  help: help,
  'list all of the commands and their aliases': help
}

const client = new Client()

client.on('message', async message => {
  if (ignore.ignoring !== null) {
    if (
      message.author.id === process.env.OWNER &&
      message.content === ignore.ignoring
    ) {
      ignore.ignoring = null
      await message.channel.send(
        select([
          "i'm BACK folkk",
          'i am BACK',
          'i have RETURNED',
          'IGNORANCE is now CRINGE again'
        ])
      )
    }
    return
  }

  const parsed = parseCommand(message)
  // If ping
  if (parsed && !message.author.bot) {
    const { command, arguments } = parsed
    if (command === '') {
      await message.lineReply(
        select([
          '<:ping:719277539113041930>',
          'please do not needlessly ping me',
          'do you need help? reply to this message with `help`',
          'what',
          'if you need help, reply `help`',
          'bruh'
        ])
      )
    } else if (commands[command]) {
      await commands[command](message, arguments)
    } else {
      console.log(command)
      await message.lineReply(
        select([
          'idk what that means but ok',
          'please do not needlessly ping me',
          'was that meant to be a joke',
          'reply `help` if you need help',
          'reply to this message with `help` for a list of commands'
        ])
      )
    }
    return
  }

  pollReactions.onMessage(message)
})

client.on('messageUpdate', async (oldMessage, newMessage) => {
  await pollReactions.onEdit(newMessage)
})

fs.ensureDir('./data/')
  .then(() => Promise.all([pollReactions.onReady()]))
  .then(() => {
    client.login(process.env.TOKEN)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
