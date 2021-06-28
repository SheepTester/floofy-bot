const { MessageAttachment } = require('discord.js')
const select = require('./utils/select.js')

module.exports.getSource = async (message, [messageId, channelId = message.channel.id]) => {
  const channel = await message.client.channels.fetch(channelId).catch(() => null)
  if (!channel) {
    return message.lineReply(`can't get channel <#${channelId}>`)
  }
  if (!channel.isText()) {
    return message.lineReply(`<#${channelId}> is not a channel with messages you fool`)
  }
  const msg = await channel.messages.fetch(messageId).catch(() => null)
  if (!msg) {
    return message.lineReply(`can't get the message with id ${messageId}`)
  }
  return message.lineReply(
    select([
      'here you go',
      'i n s p e c t',
      'hmm'
    ]),
    // If the message might be too long for an embed or can't be contained in a
    // code block or has custom emoji, upload a text file
    msg.content.length > 1800 || msg.content.includes('```') ||
      msg.content.includes('<a:') || msg.content.includes('<:')
      ? new MessageAttachment(Buffer.from(msg.content), 'message.txt')
      : {
        embed: {
          title: select([
            'conTENT',
            'source',
            'wow',
            'very cool'
          ]),
          description: `\`\`\`md\n${msg.content}\n\`\`\``
        }
      }
  )
}

module.exports.getSourceFlipped = async (message, [channelId, messageId]) =>
  module.exports.getSource(message, [messageId, channelId])
