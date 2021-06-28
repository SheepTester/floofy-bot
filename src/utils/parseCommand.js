const regexCache = {}

/** Uses bot mentions as a prefix */
module.exports = function parseCommand (message) {
  const bot = message.client.user
  if (!regexCache[bot.id]) {
    regexCache[bot.id] = new RegExp(`<@!?${message.client.user.id}>`, 'g')
  }
  if (message.mentions.has(bot) || regexCache[bot.id].test(message.content)) {
    const arguments = []
    const command = message.content
      .replace(regexCache[bot.id], '')
      .trim()
      .replace(/\s+/, ' ')
      .replace(/\d+/, id => {
        arguments.push(id)
        return '<id>'
      })
      .toLowerCase()
    return {
      command,
      arguments
    }
  } else {
    return null
  }
}
