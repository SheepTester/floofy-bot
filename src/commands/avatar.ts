import { Message } from 'discord.js'
import select from '../utils/select'

export async function avatar (
  message: Message,
  [userId = message.author.id]: string[]
): Promise<void> {
  const user = await message.client.users.fetch(userId).catch(() => null)
  if (user) {
    await message.reply({
      content: select([
        'too blue for my tastes',
        'why does it look so bad up close',
        'i regret having eyes'
      ]),
      embeds: [
        {
          image: {
            url: user.displayAvatarURL({ extension: 'png', size: 4096 })
          }
        }
      ]
    })
  } else {
    await message.reply({
      embeds: [
        {
          description: select([
            `no idea who <@${userId}> is`,
            `<@${userId}>? dont know em`,
            `stop making up people!! <@${userId}> is about as real as the grass you touched this morning: it doesn't exist`
          ])
        }
      ]
    })
  }
}

export async function warm (
  message: Message,
  [userId]: string[]
): Promise<void> {
  const user = await message.client.users.fetch(userId).catch(() => null)
  if (user) {
    user
      .send(
        `You were warmed in [${message.guild?.name ?? 'DMs'}](${
          message.url
        }). Reason: <@${message.author.id}> thought you needed warmth. 🥰`
      )
      .catch(() => {})
    await message.reply({
      embeds: [
        { color: 0xfd7b02, description: `🥰 <@${userId}> has been warmed.` }
      ]
    })
  } else {
    await message.reply({
      embeds: [
        { color: 0xe94242, description: `😔 Couldn\'t warm <@${userId}>.` }
      ]
    })
  }
}
