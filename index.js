require('dotenv').config()

const { Client } = require('discord.js')
require('discord-reply')
const fs = require('fs-extra')

const parseCommand = require('./src/utils/parseCommand.js')
const select = require('./src/utils/select.js')
const cmd = {
  pollReactions: require('./src/poll-reactions.js'),
  source: require('./src/source.js'),
  welcome: require('./src/welcome.js'),
  voteLockdown: require('./src/vote-lockdown.js'),

  about: require('./src/about.js'),
  ignore: require('./src/ignore-us.js'),
  internals: require('./src/internals.js')
}

async function help (message) {
  const aliases = new Map()
  for (const [commandName, commandFunc] of Object.entries(commands)) {
    // Don't show owner commands to non-owners
    if (
      message.author.id !== process.env.OWNER &&
      commandName in ownerCommands
    ) {
      continue
    }
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
const ownerCommands = {
  'ignore us please': cmd.ignore.ignore,
  exeunt: cmd.internals.exit
}
const commands = {
  'poll channel': cmd.pollReactions.pollChannel,
  'this is poll': cmd.pollReactions.pollChannel,
  'this is poll channel': cmd.pollReactions.pollChannel,
  'this is a poll channel': cmd.pollReactions.pollChannel,
  'turn on poll channel mode which ': cmd.pollReactions.pollChannel,

  'not poll channel': cmd.pollReactions.notPollChannel,
  'not poll': cmd.pollReactions.notPollChannel,
  'this is not a poll': cmd.pollReactions.notPollChannel,
  'this is not a poll channel': cmd.pollReactions.notPollChannel,
  "this isn't a poll channel": cmd.pollReactions.notPollChannel,
  'turn off poll channel mode': cmd.pollReactions.notPollChannel,

  'source of <id>': cmd.source.getSource,
  'cmd.source of <id> in <id>': cmd.source.getSource,
  'get raw message cmd.source of message <id> in this channel':
    cmd.source.getSource,
  'get raw message cmd.source of message <id> in channel <id>':
    cmd.source.getSource,
  'cmd.source of <id>-<id>': cmd.source.getSourceFlipped,
  'get cmd.source of <id>-<id>': cmd.source.getSourceFlipped,
  'get raw message cmd.source of message in channel <id> with id <id>':
    cmd.source.getSourceFlipped,

  'how old is <id>': cmd.source.getDate,
  'when was <id> created': cmd.source.getDate,
  'when did i join discord': cmd.source.getDate,
  'how old am i': cmd.source.getDate,

  'welcome new folk in <id> with:': cmd.welcome.setWelcome,
  'when a user joins the server send a message in channel <id> containing the following lines:':
    cmd.welcome.setWelcome,

  'allow people to lock down <id>': cmd.voteLockdown.setLockdownCategory,
  'set lockdown category id to <id>': cmd.voteLockdown.setLockdownCategory,

  'close the gates': cmd.voteLockdown.voteLockdown,
  'vote for lockdown': cmd.voteLockdown.voteLockdown,
  "deny the unverified access to the commoners' channels":
    cmd.voteLockdown.voteLockdown,

  about: cmd.about.about,
  'who are you': cmd.about.about,
  'introduce yourself': cmd.about.about,

  help: help,
  'list all of the commands and their aliases': help,

  ...ownerCommands
}

const client = new Client()

client.on('message', async message => {
  if (cmd.ignore.ignoring !== null) {
    if (
      message.author.id === process.env.OWNER &&
      message.content === cmd.ignore.ignoring
    ) {
      cmd.ignore.ignoring = null
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

  await cmd.pollReactions.onMessage(message)
  await cmd.welcome.onMessage(message)
})

client.on('messageUpdate', async (_oldMessage, newMessage) => {
  await cmd.pollReactions.onEdit(newMessage)
})

client.on('guildMemberAdd', async member => {
  await cmd.welcome.onJoin(member)
})

process.on('unhandledRejection', reason => {
  console.error(reason)
})

fs.ensureDir('./data/')
  .then(() =>
    Promise.all([
      cmd.pollReactions.onReady(),
      cmd.welcome.onReady(),
      cmd.voteLockdown.onReady()
    ])
  )
  .then(() => client.login(process.env.TOKEN))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
