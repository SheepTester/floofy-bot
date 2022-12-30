import { DMChannel, Message, PartialMessage } from 'discord.js'
import CachedMap from '../utils/CachedMap'
import { emojiRegex } from '../utils/emoji-regex'
import ok from '../utils/ok'
import select from '../utils/select'

const pollChannels = new CachedMap<boolean>('./data/poll-reactions.json')
export const onReady = pollChannels.read

function isPollChannel (message: PartialMessage | Message): boolean {
  return pollChannels.get(message.channel.id, false)
}
function isPoll (message: Message): boolean {
  return (
    isPollChannel(message) || !!message.content?.includes('(this is a poll)')
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
  if (!message.channel.permissionsFor(message.member!).has('MANAGE_CHANNELS')) {
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
    pollChannels.set(message.channel.id, true).save()
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
  if (!message.channel.permissionsFor(message.member!).has('MANAGE_CHANNELS')) {
    await message.reply(
      "you can't even manage channels, why should i listen to you"
    )
    return
  }
  if (isPollChannel(message)) {
    pollChannels.set(message.channel.id, false).save()
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
