require('dotenv').config()

const { Client, Intents } = require('discord.js')
const fs = require('fs-extra')

const parseCommand = require('./src/utils/parseCommand.js')
const select = require('./src/utils/select.js')
const cmd = {
  pollReactions: require('./src/poll-reactions.js'),
  source: require('./src/source.js'),
  welcome: require('./src/welcome.js'),
  voteLockdown: require('./src/vote-lockdown.js'),
  mentions: require('./src/mentions.js'),
  avatar: require('./src/avatar.js'),

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
  message.reply(
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
  'get raw message source of message in channel <id> with id <id>':
    cmd.source.getSourceFlipped,
  'source of <id>': cmd.source.getSource,
  'source of <id> in <id>': cmd.source.getSource,
  'get raw message source of message <id> in this channel':
    cmd.source.getSource,
  'get raw message source of message <id> in channel <id>':
    cmd.source.getSource,
  'source of <id>-<id>': cmd.source.getSourceFlipped,
  'get source of <id>-<id>': cmd.source.getSourceFlipped,

  'how old is <id>': cmd.source.getDate,
  'when was <id> created': cmd.source.getDate,
  'when did i join discord': cmd.source.getDate,
  'how old am i': cmd.source.getDate,

  'who pinged user <id> in channel <id>': cmd.mentions.whoPinged,
  'who pinged everyone in channel <id>': cmd.mentions.whoPinged,
  'who pinged <id>': cmd.mentions.whoPinged,
  'who pinged <id> in <id>': cmd.mentions.whoPinged,
  'who pinged role <id> here': cmd.mentions.whoPinged,
  'who pinged everyone': cmd.mentions.whoPinged,
  'who pinged everyone here': cmd.mentions.whoPinged,
  'who pinged everyone in <id>': cmd.mentions.whoPinged,

  'who pinged me in channel <id>': cmd.mentions.whoPingedMe,
  'who pinged me in <id>': cmd.mentions.whoPingedMe,
  'who pinged me': cmd.mentions.whoPingedMe,
  'who pinged': cmd.mentions.whoPingedMe,

  'get avatar of user <id>': cmd.avatar.avatar,
  'avatar of <id>': cmd.avatar.avatar,
  'pfp of <id>': cmd.avatar.avatar,
  'profile picture of <id>': cmd.avatar.avatar,
  'my pfp': cmd.avatar.avatar,
  'whats my pfp': cmd.avatar.avatar,

  'turn on poll channel mode which auto-adds reactions to messages':
    cmd.pollReactions.pollChannel,
  'poll channel': cmd.pollReactions.pollChannel,
  'this is poll': cmd.pollReactions.pollChannel,
  'this is poll channel': cmd.pollReactions.pollChannel,
  'this is a poll channel': cmd.pollReactions.pollChannel,

  'turn off poll channel mode': cmd.pollReactions.notPollChannel,
  'not poll channel': cmd.pollReactions.notPollChannel,
  'not poll': cmd.pollReactions.notPollChannel,
  'this is not a poll': cmd.pollReactions.notPollChannel,
  'this is not a poll channel': cmd.pollReactions.notPollChannel,
  "this isn't a poll channel": cmd.pollReactions.notPollChannel,

  'when a user joins the server send a message in channel <id> containing the following starting on the next line:':
    cmd.welcome.setWelcome,
  'welcome new folk in <id> with:': cmd.welcome.setWelcome,

  'set lockdown category id to <id>': cmd.voteLockdown.setLockdownCategory,
  'allow people to lock down <id>': cmd.voteLockdown.setLockdownCategory,

  "deny the unverified access to the commoners' channels":
    cmd.voteLockdown.voteLockdown,
  'close the gates': cmd.voteLockdown.voteLockdown,
  'vote for lockdown': cmd.voteLockdown.voteLockdown,

  about: cmd.about.about,
  'who are you': cmd.about.about,
  'introduce yourself': cmd.about.about,

  help: help,
  'list all of the commands and their aliases': help,

  ...ownerCommands
}

const client = new Client({
  partials: ['CHANNEL'],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.DIRECT_MESSAGES
  ]
})

client.on('messageCreate', async message => {
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
    const { command, arguments: args } = parsed
    if (command === '') {
      await message.reply(
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
      await commands[command](message, args)
    } else {
      console.log('Unknown command:', command)
      await message.reply(
        select([
          'idk what that means but ok',
          'please do not needlessly ping me',
          'was that meant to be a joke',
          'reply `help` if you need help',
          'reply to this message with `help` for a list of commands'
        ])
      )
    }
  }

  await cmd.pollReactions.onMessage(message)
  await cmd.welcome.onMessage(message)
  await cmd.mentions.onMessage(message)
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
      cmd.voteLockdown.onReady(),
      cmd.mentions.onReady()
    ])
  )
  .then(() => client.login(process.env.TOKEN))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })

try {
  const { EventLogger } = require('node-windows')
  const log = new EventLogger('Floofy noises')

  // These errors show in Event Viewer
  const origLog = console.log
  console.log = (...data) => {
    log.info(data.join(' '))
    origLog(data)
  }
  const origErr = console.error
  console.error = error => {
    log.error(`${error?.stack}`)
    origErr(error)
  }
} catch {}
