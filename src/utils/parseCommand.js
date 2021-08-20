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
      .replace(/<(?:[#@]!?|a?:\w+:)(\d+)>/g, (_match, id) => {
        arguments.push(id)
        return '<id>'
      })
      .replace(/\d{15,20}/g, id => {
        arguments.push(id)
        return '<id>'
      })
      .toLowerCase()
    arguments.push(lines.join('\n'))
    return {
      command,
      arguments
    }
  } else {
    return null
  }
}
