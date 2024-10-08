import { Message, AttachmentBuilder } from 'discord.js'
import select from '../utils/select'

async function getMessage (
  message: Message,
  [messageId, channelId = message.channel.id]: string[]
): Promise<Message | null> {
  const channel = await message.client.channels
    .fetch(channelId)
    .catch(() => null)
  if (!channel) {
    await message.reply(`can't get channel <#${channelId}>`)
    return null
  }
  if (!channel.isTextBased()) {
    await message.reply(
      `<#${channelId}> is not a channel with messages you fool`
    )
    return null
  }
  const msg = await channel.messages.fetch(messageId).catch(() => null)
  if (!msg) {
    await message.reply(`can't get the message with id ${messageId}`)
    return null
  }
  return msg
}

export async function getSource (
  message: Message,
  args: string[]
): Promise<void> {
  const msg = await getMessage(message, args)
  if (!msg) {
    return
  }
  const useFile =
    msg.content.length > 1800 ||
    msg.content.includes('```') ||
    msg.content.includes('<a:') ||
    msg.content.includes('<:')
  await message.reply({
    content: select(['here you go', 'i n s p e c t', 'hmm']),
    // If the message might be too long for an embed or can't be contained in a
    // code block or has custom emoji, upload a text file
    files: useFile
      ? [
          new AttachmentBuilder(Buffer.from(msg.content), {
            name: 'message.txt'
          })
        ]
      : undefined,
    embeds: useFile
      ? undefined
      : [
          {
            title: select(['conTENT', 'source', 'wow', 'very cool']),
            description:
              msg.content.length > 0
                ? `\`\`\`md\n${msg.content}\n\`\`\``
                : select([
                    '*the message is EMPTY*',
                    '*there is NOTHING*',
                    '*no message CONTENT very interest*'
                  ])
          }
        ]
  })
}

export const getSourceFlipped = async (
  message: Message,
  [channelId, messageId]: string[]
) => getSource(message, [messageId, channelId])

export async function getReply (
  message: Message,
  args: string[]
): Promise<void> {
  const msg = await getMessage(message, args)
  if (!msg) {
    return
  }
  const replied = msg.reference
  if (!replied) {
    await message.reply(
      select([
        'they werent replying to anything, look: {}',
        'uhh {} isnt a reply ?',
        'u sure thats a reply? {} cuz i dont see it'
      ]).replace('{}', msg.url)
    )
    return
  }
  await message.reply(
    select(['it was a reply to {}', 'they replied to {}', '{} here']).replace(
      '{}',
      `https://discord.com/channels/${replied.guildId ?? '@me'}/${
        replied.channelId
      }/${replied.messageId}`
    )
  )
}

export const getReplyFlipped = async (
  message: Message,
  [channelId, messageId]: string[]
) => getReply(message, [messageId, channelId])

export async function getDate (
  message: Message,
  [id = message.author.id]: string[]
): Promise<void> {
  const timestamp = (BigInt(id) >> 22n) / 1000n + 1420070400n
  await message.reply(
    select([
      "'twas made %F (%R)",
      'it was created on %F, %R',
      'if my sixth sense is CORRECT it materialised into existence on %F, %R',
      'creation happened %R on %F',
      'on %F, it poofed into existence. that was %R!'
    ])
      .replace('%F', `<t:${timestamp}:F>`)
      .replace('%R', `<t:${timestamp}:R>`)
  )
}
