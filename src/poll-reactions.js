import { CachedMap } from './utils/CachedMap.js'
import { select } from './utils/select.js'

const pollChannels = new CachedMap('./data/poll-reactions.json')

export const onReady = pollChannels.read

function isPollChannel (message) {
  return pollChannels.get(message.channel.id, false)
}

const ok = ['👌', '🆗', '👍', '✅']

export async function pollChannel (message) {
  if (isPollChannel(message)) {
    await message.lineReply(select([
      'this is already a poll channel though',
      'didn\'t you already do `poll channel`',
      'that doesn\'t do anything if this channel already is a poll channel'
    ]))
  } else {
    pollChannels.set(message.channel.id, true).save()
    await message.react(select(ok))
  }
}

export async function notPollChannel (message) {
  if (isPollChannel(message)) {
    pollChannels.set(message.channel.id, false).save()
    await message.react(select(ok))
  } else {
    await message.lineReply(select([
      'this isn\'t a poll channel though',
      'that doesn\'t do anything if this channel already isn\'t a poll channel'
    ]))
  }
  return true
}

export async function onMessage (message) {
  if (isPollChannel(message)) {
    console.log(message.content)
  }
}
