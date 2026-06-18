import { Message } from 'discord.js'
import select from '../utils/select'
import { db } from '../utils/db'
import z from 'zod'

const lastPingSchema = z.strictObject({
  author: z.string(),
  content: z.string(),
  message_url: z.string(),
  is_role: z.literal([0, 1])
})
type LastPing = z.infer<typeof lastPingSchema>

const addMention = db.prepare(
  [
    'insert or replace into mentions (channel_id, mentioned, author, content, message_url, is_role)',
    'values (?, ?, ?, ?, ?, ?)'
  ].join(' ') + ';'
)
const getLastMention = db.prepare(
  [
    'select author, content, message_url, is_role from mentions',
    'where channel_id = ? and mentioned = ?'
  ].join(' ') + ';'
)

export async function onMessage (message: Message): Promise<void> {
  const {
    channel: { id: channelId },
    mentions
  } = message
  if (mentions.everyone || mentions.roles.size > 0 || mentions.users.size > 0) {
    const msg = [message.author.id, message.content, message.url]
    if (mentions.everyone) {
      addMention.run(channelId, 'everyone', ...msg, 0)
    }
    for (const roleId of mentions.roles.keys()) {
      addMention.run(channelId, roleId, ...msg, 1)
    }
    // Ignore user pings from this bot
    if (message.author.id !== message.client.user!.id) {
      for (const userId of mentions.users.keys()) {
        addMention.run(channelId, userId, ...msg, 0)
      }
    }
  }
}

export async function whoPinged (
  message: Message,
  args: string[]
): Promise<void> {
  const [targetId, channelId = message.channel.id] =
    args.length < 2 && message.content.includes('everyone')
      ? ['everyone', args[0]]
      : args
  const lastMention = z
    .optional(lastPingSchema)
    .parse(getLastMention.get(channelId, targetId))
  const them =
    targetId === 'everyone'
      ? 'everyone'
      : targetId === message.author.id
        ? 'you'
        : 'them'
  if (lastMention) {
    await message.reply({
      embeds: [
        {
          // This breaks if a Nitro user repeats ]( 2000 times in a message,
          // whatever
          description: `<@${lastMention.author}> pinged ${
            targetId === 'everyone'
              ? '@everyone'
              : `<@${lastMention.is_role ? '&' : ''}${targetId}>`
          } ([link to message](${
            lastMention.message_url
          })):\n\n${lastMention.content.replace(/]\(/g, ']\ufeff(')}`,
          footer: {
            text:
              !lastMention.is_role && targetId !== 'everyone'
                ? "this only shows direct pings to the user, btw, it doesn't factor in role and everyone pings"
                : ''
          }
        }
      ],
      allowedMentions: {
        repliedUser: false
      }
    })
  } else {
    await message.reply({
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

export async function whoPingedMe (
  message: Message,
  [channelId = message.channel.id]: string[]
): Promise<void> {
  const userMention = z
    .optional(lastPingSchema)
    .parse(getLastMention.get(channelId, message.author.id))
  const possibilities = [
    z.optional(lastPingSchema).parse(getLastMention.get(channelId, 'everyone')),
    userMention
  ]
  if (message.member) {
    for (const roleId of message.member.roles.cache.keys()) {
      possibilities.push(
        z.optional(lastPingSchema).parse(getLastMention.get(channelId, roleId))
      )
    }
  }
  const lastMention = possibilities.reduce(
    (acc, curr) =>
      // Using message ID (from URL) to get latest ping. Snowflakes' most
      // significant digits encode the time, so imprecision due to casting a
      // u64 to a f64 should be negligible.
      !acc ||
      (curr &&
        +acc.message_url.split('/').slice(-1)[0] <
          +curr.message_url.split('/').slice(-1)[0])
        ? curr
        : acc,
    undefined
  )
  if (lastMention) {
    await message.reply({
      embeds: [
        {
          description: `<@${lastMention.author}> [pinged you](${
            lastMention.message_url
          }):\n\n${lastMention.content.replace(/]\(/g, ']\ufeff(')}`,
          footer: {
            text:
              lastMention === userMention
                ? ''
                : `tip: reply \`who pinged ${message.author.id} in ${channelId}\` to filter out role and everyone pings`
          }
        }
      ],
      allowedMentions: {
        repliedUser: false
      }
    })
  } else {
    await message.reply({
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
