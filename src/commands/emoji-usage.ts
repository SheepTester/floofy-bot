import {
  GuildEmoji,
  Message,
  MessageReaction,
  PartialMessageReaction
} from 'discord.js'
import CachedMap from '../utils/CachedMap'

const customEmojiRegex = /<a?:\w+:(\d+)>/g

const emojiUsage = new CachedMap<number>('./data/emoji-usage.json')
export const onReady = emojiUsage.read

export async function getUsage (message: Message): Promise<void> {
  if (!message.guild) {
    await message.reply('i dont track emojis in dms sry')
    return
  }
  await message.reply({
    embeds: [
      {
        description: Array.from(
          // Force fetch in case emoji changed
          await message.guild.emojis.fetch(undefined, { force: true }),
          ([emojiId, { animated }]) => ({
            emoji: `<${animated ? 'a' : ''}:w:${emojiId}>`,
            count: emojiUsage.get(`${message.guildId}-${emojiId}`, 0)
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
    const id = `${message.guildId}-${emojiId}`
    emojiUsage.set(id, emojiUsage.get(id, 0) + 1)
  }
  emojiUsage.save()
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
    const id = `${reaction.message.guildId}-${reaction.emoji.id}`
    emojiUsage.set(id, emojiUsage.get(id, 0) + 1)
  }
  emojiUsage.save()
}
