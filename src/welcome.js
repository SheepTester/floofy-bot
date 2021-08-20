const { Message, Permissions, GuildMember, TextChannel } = require('discord.js')
const CachedMap = require('./utils/CachedMap')
const ok = require('./utils/ok.js')
const select = require('./utils/select')

const welcomeChannels = new CachedMap('./data/welcome-channels.json')
const sentienceMsgSent = new CachedMap('./data/sentience-msg-sent.json')
module.exports.onReady = () =>
  Promise.all([welcomeChannels.read(), sentienceMsgSent.read()])

/**
 * @param {Message} message
 * @param {string[]} arguments
 */
module.exports.setWelcome = async (message, arguments) => {
  if (!message.member.hasPermission(Permissions.FLAGS.MANAGE_GUILD)) {
    await message.lineReply(
      'why should i obey you if you cant even manage the server lmao'
    )
    return
  }

  const [channelId, welcomeMsg] = arguments
  welcomeChannels
    .set(message.guild.id, { channelId, message: welcomeMsg })
    .save()
  await message.react(select(ok))
}

/** @param {GuildMember} member */
module.exports.onJoin = async member => {
  const { channelId, message } = welcomeChannels.get(member.guild.id, {})
  if (!channelId) return
  const channel = member.client.channels.cache.get(channelId)
  if (!channel) return
  await channel.send(
    select([
      'Hi, {USER}; please read this:',
      'Welcome, {USER}! Read this:',
      "Hey, {USER}! Let's see if you can read.",
      '{USER}, I have been told to show you this.'
    ]).replace('{USER}', member),
    {
      embed: {
        description: message,
        footer: {
          text:
            'Note: I am just a bot, and I have been instructed to repeat this message to all users who join the server.'
        }
      }
    }
  )
}

/** @param {Message} message */
module.exports.onMessage = async message => {
  const { channelId } = welcomeChannels.get(message.guild.id, {})
  if (message.channel.id === channelId && !message.author.bot) {
    if (!sentienceMsgSent.get(`${message.guild.id}-${message.author.id}`)) {
      message.lineReplyNoMention(
        select([
          "Thanks! You'll be verified... eventually. Bureaucracy is slow.",
          "This message might be enough proof that you're sentient. You can send more if you want, just in case. I'm just a bot.",
          "Cool! I'm just a bot, so I can't tell if this means you're sentient. We'll have to wait and see."
        ])
      )
      sentienceMsgSent
        .set(`${message.guild.id}-${message.author.id}`, true)
        .save()
    }
  }
}
