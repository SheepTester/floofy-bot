const { Message } = require('discord.js')
const emojiList = require('./emoji.json')
const CachedMap = require('./utils/CachedMap.js')
const ok = require('./utils/ok.js')
const select = require('./utils/select.js')

const emojiRegex = new RegExp(
  `<a?:\\w+:\\d+>|${emojiList.join('|').replace(/[+*]/g, m => '\\' + m)}`,
  'g'
)

const pollChannels = new CachedMap('./data/poll-reactions.json')
module.exports.onReady = pollChannels.read

function isPollChannel (message) {
  return pollChannels.get(message.channel.id, false)
}

/** @param {Message} message */
module.exports.pollChannel = async message => {
  if (!message.channel.permissionsFor(message.member).has('MANAGE_CHANNELS')) {
    await message.lineReply(
      "you can't even manage channels, why should i listen to you"
    )
    return
  }
  if (isPollChannel(message)) {
    await message.lineReply(
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

module.exports.notPollChannel = async message => {
  if (!message.channel.permissionsFor(message.member).has('MANAGE_CHANNELS')) {
    await message.lineReply(
      "you can't even manage channels, why should i listen to you"
    )
    return
  }
  if (isPollChannel(message)) {
    pollChannels.set(message.channel.id, false).save()
    await message.react(select(ok))
  } else {
    await message.lineReply(
      select([
        "this isn't a poll channel though",
        "that doesn't do anything if this channel already isn't a poll channel"
      ])
    )
  }
}

module.exports.onMessage = async message => {
  if (isPollChannel(message)) {
    const emoji = message.content.match(emojiRegex) || []
    if (emoji.length === 0) {
      await Promise.all([message.react('👍'), message.react('👎')]).catch(
        () => {}
      )
    } else {
      await Promise.all(emoji.map(em => message.react(em))).catch(() => {})
    }
  }
}

module.exports.onEdit = async newMessage => {
  if (isPollChannel(newMessage)) {
    const emoji = newMessage.content.match(emojiRegex) || []
    if (emoji.length > 0) {
      // TODO: Do not re-add already-reacted emoji for speedier reaction
      // additions
      await Promise.all(emoji.map(em => newMessage.react(em))).catch(() => {})
    }
  }
}
