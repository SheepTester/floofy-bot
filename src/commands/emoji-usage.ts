import {
  GuildEmoji,
  Message,
  MessageReaction,
  type PartialMessageReaction
} from 'discord.js'
import { db } from '../utils/db'
import z from 'zod'

const customEmojiRegex = /<a?:\w+:(\d+)>/g

const countEmoji = db.prepare(
  [
    'insert into emoji_usage (guild_id, emoji_id, count)',
    'values (?, ?, 1)',
    'on conflict (guild_id, emoji_id)',
    'do update set count = emoji_usage.count + 1'
  ].join(' ') + ';'
)
const getEmojiCount = db.prepare(
  ['select emoji_id, count', 'from emoji_usage', 'where guild_id = ?'].join(
    ' '
  ) + ';'
)
const emojiRowSchema = z.strictObject({
  emoji_id: z.string(),
  count: z.number()
})

export async function getUsage (message: Message): Promise<void> {
  if (!message.guild) {
    await message.reply('i dont track emojis in dms sry')
    return
  }
  const counts = new Map(
    getEmojiCount
      .all(message.guildId)
      .values()
      .map(row => emojiRowSchema.parse(row))
      .map(({ emoji_id, count }) => [emoji_id, count])
  )
  await message.reply({
    embeds: [
      {
        description: Array.from(
          // Force fetch in case emoji changed
          await message.guild.emojis.fetch(undefined, { force: true }),
          ([emojiId, { animated }]) => ({
            emoji: `<${animated ? 'a' : ''}:w:${emojiId}>`,
            count: counts.get(emojiId) ?? 0
          })
        )
          .sort((a, b) => b.count - a.count)
          .map(({ emoji, count }) => `${emoji} ${count}`)
          .join('\n')
      }
    ]
  })
}

export async function onMessage (message: Message): Promise<void> {
  if (!message.guildId) {
    return
  }
  // Remove duplicate emoji
  const emojis = new Set(
    Array.from(
      message.content.matchAll(customEmojiRegex),
      ([, emojiId]) => emojiId
    )
  )

  for (const emojiId of emojis) {
    countEmoji.run(message.guildId, emojiId)
  }
}

export async function onReact (
  reaction: MessageReaction | PartialMessageReaction
): Promise<void> {
  if (reaction.partial) {
    reaction = await reaction.fetch()
  }
  // It's easy to inflate the count by reacting and unreacting. Only making the
  // first reaction count should thwart this somewhat.
  if (
    reaction.count === 1 &&
    !(
      reaction.emoji instanceof GuildEmoji &&
      reaction.emoji.guild.id !== reaction.message.guildId
    )
  ) {
    countEmoji.run(reaction.message.guildId, reaction.emoji.id)
  }
}
