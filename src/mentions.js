const { Message } = require('discord.js')
const CachedMap = require('./utils/CachedMap.js')
const select = require('./utils/select.js')

/**
 * @typedef {object} LastPing
 * @property {string} author
 * @property {string} content
 * @property {string} url
 * @property {boolean} [role]
 */

/** @type {CachedMap<LastPing>} */
const mentionCache = new CachedMap('./data/mentions.json')
module.exports.onReady = mentionCache.read

/** @param {Message} message */
module.exports.onMessage = async message => {
  const {
    channel: { id: channelId },
    mentions
  } = message
  if (mentions.everyone || mentions.roles.size > 0 || mentions.users.size > 0) {
    const msg = {
      author: message.author.id,
      content: message.content,
      url: message.url
    }
    if (mentions.everyone) {
      mentionCache.set(`${channelId}-everyone`, msg)
    }
    for (const roleId of mentions.roles.keys()) {
      mentionCache.set(`${channelId}-${roleId}`, { ...msg, role: true })
    }
    // Ignore user pings from this bot
    if (message.author.id !== message.client.user.id) {
      for (const userId of mentions.users.keys()) {
        mentionCache.set(`${channelId}-${userId}`, msg)
      }
    }
    mentionCache.save()
  }
}

/**
 * @param {Message} message
 * @param {string[]} args
 */
module.exports.whoPinged = async (message, args) => {
  const [targetId, channelId = message.channel.id] =
    args.length < 2 && message.content.includes('everyone')
      ? ['everyone', args[0]]
      : args
  const lastMention = mentionCache.get(`${channelId}-${targetId}`)
  const them =
    targetId === 'everyone'
      ? 'everyone'
      : targetId === message.author.id
      ? 'you'
      : 'them'
  if (lastMention) {
    message.reply({
      embed: {
        // This breaks if a Nitro user repeats ]( 2000 times in a message,
        // whatever
        description: `<@${lastMention.author}> pinged ${
          targetId === 'everyone'
            ? '@everyone'
            : `<@${lastMention.role ? '&' : ''}${targetId}>`
        } ([link to message](${
          lastMention.url
        })):\n\n${lastMention.content.replace(/]\(/g, ']\ufeff(')}`,
        footer: {
          text:
            !lastMention.role && targetId !== 'everyone'
              ? "this only shows direct pings to the user, btw, it doesn't factor in role and everyone pings"
              : ''
        }
      },
      allowedMentions: {
        repliedUser: false
      }
    })
  } else {
    message.reply({
      content:
        select([
          "hmm if someone did ping $them $here then i wasn't paying attention",
          'whoever pinged must have pinged $them before i started tracking pings $here',
          'i dont recall $them being pinged $here, maybe i was offline or smth'
        ])
          .replace('$them', them)
          .replace(
            '$here',
            channelId === message.channel.id ? 'here' : 'there'
          ) +
        (channelId === message.channel.id
          ? ` (note: if the ping was in a different channel then reply \`who pinged ${targetId} in <channel>\`)`
          : ''),
      allowedMentions: {
        repliedUser: false
      }
    })
  }
}

/**
 * @param {Message} message
 * @param {string[]} arguments
 */
module.exports.whoPingedMe = async (
  message,
  [channelId = message.channel.id]
) => {
  const userMention = mentionCache.get(`${channelId}-${message.author.id}`)
  const possibilities = [mentionCache.get(`${channelId}-everyone`), userMention]
  if (message.member) {
    for (const roleId of message.member.roles.cache.keys()) {
      possibilities.push(mentionCache.get(`${channelId}-${roleId}`))
    }
  }
  const lastMention = possibilities.reduce(
    (acc, curr) =>
      // Using message ID (from URL) to get latest ping. Snowflakes' most
      // significant digits encode the time, so imprecision due to casting a
      // u64 to a f64 should be negligible.
      !acc ||
      (curr &&
        +acc.url.split('/').slice(-1)[0] < +curr.url.split('/').slice(-1)[0])
        ? curr
        : acc,
    undefined
  )
  if (lastMention) {
    message.reply({
      embed: {
        description: `<@${lastMention.author}> [pinged you](${
          lastMention.url
        }):\n\n${lastMention.content.replace(/]\(/g, ']\ufeff(')}`,
        footer: {
          text:
            lastMention === userMention
              ? ''
              : `tip: reply \`who pinged ${message.author.id} in ${channelId}\` to filter out role and everyone pings`
        }
      },
      allowedMentions: {
        repliedUser: false
      }
    })
  } else {
    message.reply({
      content:
        select([
          "i don't remember you getting pinged, maybe i wasn't paying attention",
          "hm you might've been pinged while i was offline",
          "your ping is not in my records, maybe i wasn't tracking pings then"
        ]) +
        (channelId === message.channel.id
          ? ' (note: if you were pinged in a different channel then reply `who pinged me in <channel>`)'
          : ''),
      allowedMentions: {
        repliedUser: false
      }
    })
  }
}
