import {
  DMChannel,
  Message,
  type PartialMessage,
  PermissionFlagsBits
} from 'discord.js'
import { emojiRegex } from '../utils/emoji-regex'
import ok from '../utils/ok'
import select from '../utils/select'
import { db } from '../utils/db'

const getPollChannel = db.prepare(
  'select 1 from poll_reactions_channels where channel_id = ?'
)
const addPollChannel = db.prepare(
  [
    'insert or ignore into poll_reactions_channels (channel_id)',
    'values (?)'
  ].join(' ')
)
const removePollChannel = db.prepare(
  'delete from poll_reactions_channels where channel_id = ?'
)

function isPollChannel (message: PartialMessage | Message): boolean {
  return !!getPollChannel.get(message.channel.id)
}
function isPoll (message: Message): boolean {
  return (
    isPollChannel(message) ||
    !!message.content.toLowerCase().includes('(this is a poll)')
  )
}

export async function pollChannel (
  message: PartialMessage | Message
): Promise<void> {
  if (
    message.channel instanceof DMChannel ||
    message.channel.lastMessageId === undefined
  ) {
    await message.reply("who're you polling in here just me and you??")
    return
  }
  if (
    !message.channel
      .permissionsFor(message.member!)
      .has(PermissionFlagsBits.ManageChannels)
  ) {
    await message.reply(
      "you can't even manage channels, why should i listen to you"
    )
    return
  }
  if (isPollChannel(message)) {
    await message.reply(
      select([
        'this is already a poll channel though',
        "didn't you already do `poll channel`",
        "that doesn't do anything if this channel already is a poll channel"
      ])
    )
  } else {
    addPollChannel.run(message.channel.id)
    await message.react(select(ok))
  }
}

export async function notPollChannel (message: Message): Promise<void> {
  if (
    message.channel instanceof DMChannel ||
    message.channel.lastMessageId === undefined
  ) {
    await message.reply("who're you polling in here just me and you??")
    return
  }
  if (
    !message.channel
      .permissionsFor(message.member!)
      .has(PermissionFlagsBits.ManageChannels)
  ) {
    await message.reply(
      "you can't even manage channels, why should i listen to you"
    )
    return
  }
  if (isPollChannel(message)) {
    removePollChannel.run(message.channel.id)
    await message.react(select(ok))
  } else {
    await message.reply(
      select([
        "this isn't a poll channel though",
        "that doesn't do anything if this channel already isn't a poll channel"
      ])
    )
  }
}

export function getReactions (
  message: Message,
  isNew: boolean
): string[] | null {
  if (isPoll(message)) {
    const emoji = message.content.match(emojiRegex) || []
    if (emoji.length === 0 && isNew) {
      return ['👍', '👎']
    } else {
      return emoji
    }
  } else {
    return null
  }
}
