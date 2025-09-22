import { Client, TextBasedChannel } from 'discord.js'

let channelPromise: Promise<TextBasedChannel> | undefined

async function getChannel (
  client: Client,
  channelId: string
): Promise<TextBasedChannel> {
  const channel = await client.channels.fetch(channelId)
  if (channel?.isTextBased()) {
    return channel
  } else {
    throw new Error(`channel ${channelId} does not exist D:`)
  }
}

export type NotifyOptions = {
  color?: 'info' | 'error'
  pingOwner?: boolean
  file?: string
}
export async function notify (
  client: Client,
  message: string,
  { color = 'info', pingOwner = false, file }: NotifyOptions = {}
): Promise<void> {
  if (!process.env.DEBUG_CHANNEL) {
    return
  }
  channelPromise ??= getChannel(client, process.env.DEBUG_CHANNEL)
  const channel = await channelPromise
  await channel.send({
    content: pingOwner ? `<@${process.env.OWNER}>` : '',
    embeds: [
      {
        description: message,
        color: color === 'error' ? 0xfb2c36 : 0x00b8db
      }
    ],
    files: file ? [file] : undefined
  })
}
