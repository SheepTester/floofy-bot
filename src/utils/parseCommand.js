const regexCache = {}

/** Uses bot mentions as a prefix */
module.exports = function parseCommand (message) {
  const bot = message.client.user
  if (!regexCache[bot.id]) {
    regexCache[bot.id] = new RegExp(`<@!?${message.client.user.id}>`, 'g')
  }
  if (message.mentions.has(bot) || regexCache[bot.id].test(message.content)) {
    const arguments = []
    const [rawCommand, ...lines] = message.content.split('\n')
    const command = rawCommand
      .replace(regexCache[bot.id], '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      // Must be a single regex or then IDs will be added in the wrong order
      .replace(
        /<(?:[#@][!&]?|a?:\w+:)(\d+)>|\d{15,20}/g,
        (match, mentionId) => {
          const id = match[0] === '<' ? mentionId : match
          arguments.push(id)
          return '<id>'
        }
      )
      .toLowerCase()
    if (lines.length > 0) {
      arguments.push(lines.join('\n'))
    }
    return {
      command,
      arguments
    }
  } else {
    return null
  }
}
