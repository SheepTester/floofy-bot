const select = require('./utils/select')

module.exports.avatar = async (message, [userId = message.author.id]) => {
  const user = await message.client.users.fetch(userId).catch(() => null)
  if (user) {
    message.reply({
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
    message.reply({
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
