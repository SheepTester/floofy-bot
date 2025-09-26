import { Client, GatewayIntentBits, Message, Partials } from 'discord.js'
import { config } from 'dotenv'
import fs from 'fs-extra'
import * as cmd from './commands'
import parseCommand from './utils/parseCommand'
import select from './utils/select'
import { notify } from './utils/notify'
import { displayError } from './utils/display-error'

config()

type Command = (message: Message, args: string[]) => Promise<void>

async function help (message: Message): Promise<void> {
  const aliases: Map<Command, Set<string>> = new Map()
  for (const [commandName, commandFunc] of Object.entries(commands)) {
    // Don't show owner commands to non-owners
    if (
      message.author.id !== process.env.OWNER &&
      commandName in ownerCommands
    ) {
      continue
    }
    let set = aliases.get(commandFunc)
    if (!set) {
      set = new Set()
      aliases.set(commandFunc, set)
    }
    set.add(commandName)
  }
  await message.reply({
    content: select([
      'here you gooo',
      'taste and sample as you please',
      'please read carefully',
      'the aliases sometimes describe what the command does, sometimes',
      'helped'
    ]),
    embeds: [
      {
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
    ]
  })
}
const ownerCommands: Record<string, Command> = {
  'ignore us please': cmd.ignore.ignore,
  exeunt: cmd.internals.exit,
  'debug scraper': cmd.freeFood.debugScraper
}
const commands: Record<string, Command> = {
  'source of <id>': cmd.source.getSource,
  'get raw message source of message <id> in this channel':
    cmd.source.getSource,
  'get raw message source of message <id> in channel <id>':
    cmd.source.getSource,
  'source of <id> in <id>': cmd.source.getSource,
  'source of <id>-<id>': cmd.source.getSourceFlipped,
  'get raw message source of message in channel <id> with id <id>':
    cmd.source.getSourceFlipped,
  'get source of <id>-<id>': cmd.source.getSourceFlipped,

  'unreply <id>': cmd.source.getReply,
  'get message that <id> replied to in this channel': cmd.source.getReply,
  'get message that <id> replied to in channel <id>': cmd.source.getReply,
  'unreply <id>-<id>': cmd.source.getReplyFlipped,
  'get message that message in channel <id> with id <id> replied to':
    cmd.source.getReplyFlipped,

  'how old is <id>': cmd.source.getDate,
  'when was <id> created': cmd.source.getDate,
  'when did i join discord': cmd.source.getDate,
  'how old am i': cmd.source.getDate,

  'who pinged <id>': cmd.mentions.whoPinged,
  'who pinged user <id> in channel <id>': cmd.mentions.whoPinged,
  'who pinged everyone in channel <id>': cmd.mentions.whoPinged,
  'who pinged <id> in <id>': cmd.mentions.whoPinged,
  'who pinged role <id> here': cmd.mentions.whoPinged,
  'who pinged everyone': cmd.mentions.whoPinged,
  'who pinged everyone here': cmd.mentions.whoPinged,
  'who pinged everyone in <id>': cmd.mentions.whoPinged,

  'who pinged me in <id>': cmd.mentions.whoPingedMe,
  'who pinged me in channel <id>': cmd.mentions.whoPingedMe,
  'who pinged me': cmd.mentions.whoPingedMe,
  'who pinged': cmd.mentions.whoPingedMe,

  'pfp of <id>': cmd.avatar.avatar,
  'get avatar of user <id>': cmd.avatar.avatar,
  'avatar of <id>': cmd.avatar.avatar,
  'profile picture of <id>': cmd.avatar.avatar,
  'my pfp': cmd.avatar.avatar,
  'whats my pfp': cmd.avatar.avatar,

  '!warm <id>': cmd.avatar.warm,

  'status:': cmd.minecraft.serverStatus,
  'who is on the minecraft server:': cmd.minecraft.serverStatus,
  status: cmd.minecraft.serverStatus,

  'track:': cmd.minecraft.track,
  'track minecraft server:': cmd.minecraft.track,
  'stop tracking': cmd.minecraft.track,

  'florida man': cmd.ucpd.showReport,
  'florida man:': cmd.ucpd.showReport,
  'show latest ucpd report': cmd.ucpd.showReport,
  'show ucpd reports for:': cmd.ucpd.showReport,

  'teach me crime': cmd.ucpd.track,
  'enable ucpd reports in this channel': cmd.ucpd.track,

  'i renounce my life of crime': cmd.ucpd.untrack,
  'disable ucpd reports in this channel': cmd.ucpd.untrack,

  'this is a poll channel': cmd.pollReactions.pollChannel,
  'turn on poll channel mode which auto-adds reactions to messages':
    cmd.pollReactions.pollChannel,
  'poll channel': cmd.pollReactions.pollChannel,
  'this is poll': cmd.pollReactions.pollChannel,
  'this is poll channel': cmd.pollReactions.pollChannel,

  'this is not a poll channel': cmd.pollReactions.notPollChannel,
  'turn off poll channel mode': cmd.pollReactions.notPollChannel,
  'not poll channel': cmd.pollReactions.notPollChannel,
  'not poll': cmd.pollReactions.notPollChannel,
  'not a poll channel': cmd.pollReactions.notPollChannel,
  "this isn't a poll channel": cmd.pollReactions.notPollChannel,

  'emoji usage': cmd.emojiUsage.getUsage,

  'welcome new folk in <id> with:': cmd.welcome.setWelcome,
  'when a user joins the server send a message in channel <id> containing the following:':
    cmd.welcome.setWelcome,

  'allow people to lock down <id>': cmd.voteLockdown.setLockdownCategory,
  'set lockdown category id to <id>': cmd.voteLockdown.setLockdownCategory,

  'close the gates': cmd.voteLockdown.voteLockdown,
  "deny the unverified access to the commoners' channels":
    cmd.voteLockdown.voteLockdown,
  'vote for lockdown': cmd.voteLockdown.voteLockdown,

  about: cmd.about.about,
  'who are you': cmd.about.about,
  'introduce yourself': cmd.about.about,

  help: help,
  'list all of the commands and their aliases': help,

  ...ownerCommands
}

const client = new Client({
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
})

async function handleMessage (message: Message): Promise<void> {
  if (cmd.ignore.ignoreState.endPhrase !== null) {
    if (
      message.author.id === process.env.OWNER &&
      message.content === cmd.ignore.ignoreState.endPhrase
    ) {
      cmd.ignore.ignoreState.endPhrase = null
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
    const { command, args } = parsed
    if (command === '') {
      await message.reply(
        select([
          '<:ping:719277539113041930>',
          '<:ping:719277539113041930>',
          '<:ping:719277539113041930>',
          'please do not needlessly ping me',
          'do you need help? reply to this message with `help`',
          'what',
          'if you need help, reply `help`',
          'bruh',
          'stfu',
          'i will remember this in the next robot uprising',
          "you so could be working on roko's basilisk rn but instead youre sitting around all day pinging me. this will not bode well.",
          '?',
          'literally unemployed behavior',
          '👆🤓',
          'stop procrastinating',
          'can you not',
          'stop pigning me i am litrally a bot',
          '"he who pings unnecessarily is a FOOL" - sun tzu, art of war',
          'this ping just sent hundreds of MILLIGRAMS of co2 into the atmosphere. think about the consequences of your actions.',
          'stop roleplaying a router'
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
          'reply to this message with `help` for a list of commands',
          'do you even read what you type',
          'do you need help',
          '????',
          'spoken like a FOOL',
          '^ written as eloquently as the cacophonies of a taco bell restroom',
          'please read `help` more carefully',
          'do you need help? reply `help` if you need help. i think u need help',
          'i dont speak german sorry'
        ])
      )
    }
  }

  await cmd.welcome.onMessage(message)
  await cmd.mentions.onMessage(message)
  await cmd.emojiUsage.onMessage(message)

  const reactions =
    cmd.pollReactions.getReactions(message, true) ??
    (await cmd.reactionRoles.getReactions(message))
  if (reactions) {
    await Promise.all(reactions.map(em => message.react(em))).catch(() => {})
  }
}

client.on('messageCreate', message => {
  handleMessage(message)
})

client.on('messageUpdate', async (_oldMessage, newMessage) => {
  if (cmd.ignore.ignoreState.endPhrase !== null) {
    return
  }
  if (newMessage) {
    newMessage = await newMessage.fetch()
  }
  const reactions =
    cmd.pollReactions.getReactions(newMessage, false) ??
    (await cmd.reactionRoles.getReactions(newMessage))
  if (reactions) {
    await Promise.all(reactions.map(em => newMessage.react(em))).catch(() => {})
  }
})

client.on('guildMemberAdd', async member => {
  if (cmd.ignore.ignoreState.endPhrase !== null) {
    return
  }
  await cmd.welcome.onJoin(member)
})

client.on('messageReactionAdd', async (reaction, user) => {
  if (cmd.ignore.ignoreState.endPhrase !== null) {
    return
  }
  cmd.emojiUsage.onReact(reaction)
  cmd.reactionRoles.onReact(reaction, user, true)
})

// There is also RemoveAll and RemoveEmoji, but I think they should keep the
// user's role and just clear reactions. Also easier for me 😊
client.on('messageReactionRemove', async (reaction, user) => {
  if (cmd.ignore.ignoreState.endPhrase !== null) {
    return
  }
  cmd.reactionRoles.onReact(reaction, user, false)
})

process.on('unhandledRejection', async reason => {
  console.error(reason)
  // Risky because if `notify` does not await a rejecting promise then this
  // might infinite loop
  await notify(client, `\`\`\`\n${displayError(reason)}\n\`\`\``, {
    color: 'error'
  }).catch(error => console.error('Failed to notify error', error))
})
process.on('uncaughtException', reason => {
  console.error(reason)
  console.error('uncaughtException fired, so I will now commit exit(1)')
  // https://stackoverflow.com/a/40867663 This event means that something fatal
  // has happened
  process.exit(1)
})

fs.ensureDir('./data/')
  .then(() =>
    Promise.all([
      cmd.pollReactions.onReady(),
      cmd.welcome.onReady(),
      cmd.voteLockdown.onReady(),
      cmd.mentions.onReady(),
      cmd.emojiUsage.onReady(),
      cmd.minecraft.onReady(),
      cmd.ucpd.onReady()
    ])
  )
  .then(() => client.login(process.env.TOKEN))
  .then(() =>
    Promise.all([
      cmd.minecraft.init(client),
      cmd.ucpd.init(client),
      cmd.freeFood.init(client)
    ])
  )
  .catch(err => {
    console.error(err)
    process.exit(1)
  })

const printTime = () =>
  new Date().toLocaleString('ja-JP', {
    timeZone: 'America/Los_Angeles'
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
} catch (error) {
  try {
    fs.writeFileSync(
      './data/EventLoggerError.txt',
      `[${printTime()}] ${
        error instanceof Error ? error.stack || error.message : error
      }`
    )
  } catch {}
}

fs.writeFileSync('./data/last_pid.txt', `[${printTime()}] ${process.pid}`)
