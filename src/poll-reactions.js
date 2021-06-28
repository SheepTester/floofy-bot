const emojiList = require('./emoji.json')
const CachedMap = require('./utils/CachedMap.js')
const select = require('./utils/select.js')

const emojiRegex = new RegExp(`<a?:\\w+:\\d+>|${
  emojiList
    .join('|')
    .replace(/[+*]/g, m => '\\' + m)
}`, 'g')

const pollChannels = new CachedMap('./data/poll-reactions.json')
module.exports.onReady = pollChannels.read

function isPollChannel (message) {
  return pollChannels.get(message.channel.id, false)
}

const ok = ['👌', '🆗', '👍', '✅']

module.exports.pollChannel = async message => {
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

module.exports.notPollChannel = async message => {
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

module.exports.onMessage = async message => {
  if (isPollChannel(message)) {
    const emoji = message.content.match(emojiRegex) || []
    if (emoji.length === 0) {
      await Promise.all([
        message.react('👍'),
        message.react('👎')
      ])
        .catch(() => {})
    } else {
      await Promise.all(emoji.map(em => message.react(em)))
        .catch(() => {})
    }
  }
}
