import {
  Message,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  Snowflake,
  User
} from 'discord.js'
import { emojiRegex } from '../utils/emoji-regex'

function isMenu (message: Message): boolean {
  return message.content.includes('(select roles)')
}

const roleMentionRegex = /<@&(\d+)>/
function parseMenu (content: string): Record<string, Snowflake> {
  const roles: Record<string, Snowflake> = {}
  for (const line of content.split('\n')) {
    const roleId = line.match(roleMentionRegex)
    if (!roleId) {
      continue
    }
    // Allow any emoji in line to add/remove the role (also because emojiRegex
    // is global, so I can't use .match anyways)
    for (const [unicode, customId] of line.matchAll(emojiRegex)) {
      roles[customId ?? unicode] = roleId[1]
    }
  }
  return roles
}

export async function onReact (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  added: boolean
): Promise<void> {
  const message = reaction.message.partial
    ? await reaction.message.fetch()
    : reaction.message
  if (!message.guild || !isMenu(message)) {
    return
  }
  // Author of select role menu must be present and able to add roles manually
  const menuAuthor = await message.guild.members
    .fetch(message.author)
    .catch(() => null)
  if (!menuAuthor?.permissions.has('MANAGE_ROLES')) {
    return
  }
  const roles = parseMenu(message.content)
  // `id` has custom emoji ID, `name` has Unicode character
  const emoji = reaction.emoji.id ?? reaction.emoji.name
  console.log(roles, emoji)
  if (emoji && roles[emoji]) {
    try {
      const member = await message.guild.members.fetch(user.id)
      if (added) {
        await member.roles.add(roles[emoji])
      } else {
        await member.roles.remove(roles[emoji])
      }
    } catch (error) {
      console.log('error', error)

      // Ignore permission errors, etc.
      return
    }
  }
}
