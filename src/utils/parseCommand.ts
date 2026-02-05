import { Message } from 'discord.js'

const regexCache: Record<string, RegExp> = {}

/** Finds the first colon not in a custom emoji */
function findColon (string: string): number {
  let index = string.indexOf(':')
  while (index !== -1) {
    if (
      !(
        string[index - 1] === '<' ||
        (string[index - 1] === 'a' && string[index - 2] === '<')
      )
    ) {
      return index + 1
    }
    index = string.indexOf(':', index + 1)
  }
  return string.length
}

export type ParsedCommand = {
  command: string
  args: string[]
}

/** Uses bot mentions as a prefix */
export default function parseCommand (message: Message): ParsedCommand | null {
  const bot = message.client.user
  if (!regexCache[bot.id]) {
    regexCache[bot.id] = new RegExp(`<@!?${message.client.user.id}>`, 'g')
  }
  if (message.mentions.has(bot) || regexCache[bot.id].test(message.content)) {
    const args = []
    const colon = findColon(message.content)
    const command = message.content
      .slice(0, colon)
      .replace(regexCache[bot.id], '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      // Must be a single regex or then IDs will be added in the wrong order
      .replace(
        /<(?:[#@][!&]?|a?:\w+:)(\d+)>|\d{15,20}/g,
        (match, mentionId) => {
          const id = match[0] === '<' ? mentionId : match
          args.push(id)
          return '<id>'
        }
      )
      .toLowerCase()
    if (colon < message.content.length) {
      args.push(message.content.slice(colon).trim())
    }
    return {
      command,
      args
    }
  } else {
    return null
  }
}
