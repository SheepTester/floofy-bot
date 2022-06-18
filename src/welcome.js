const { Message, GuildMember } = require('discord.js')
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
module.exports.setWelcome = async (message, [channelId, welcomeMsg]) => {
  if (!message.channel.permissionsFor(message.member).has('MANAGE_GUILD')) {
    await message.reply(
      'why should i obey you if you cant even manage the server lmao'
    )
    return
  }

  welcomeChannels
    .set(message.guild.id, { channelId, message: welcomeMsg })
    .save()
  await message.react(select(ok))
}

/** @param {GuildMember} member */
module.exports.onJoin = async member => {
  const { channelId, message } = welcomeChannels.get(member.guild.id, {})
  if (!channelId) return
  const channel = member.guild.channels.cache.get(channelId)
  if (!channel) return
  await channel.send({
    content: select([
      'Hi, {USER}; please read this:',
      'Welcome, {USER}! Read this:',
      "Hey, {USER}! Let's see if you can read.",
      '{USER}, I have been told to show you this.'
    ]).replace('{USER}', member),
    embeds: [
      {
        description: message,
        footer: {
          text: 'Note: I am just a bot, and I have been instructed to repeat this message to all users who join the server.'
        }
      }
    ]
  })
}

/** @param {Message} message */
module.exports.onMessage = async message => {
  if (!message.guild) return
  const { channelId } = welcomeChannels.get(message.guild.id, {})
  if (message.channel.id === channelId && !message.author.bot) {
    if (!sentienceMsgSent.get(`${message.guild.id}-${message.author.id}`)) {
      message.reply({
        content:
          message.content.length > 15
            ? select([
                "Thanks! You'll be verified... eventually. Bureaucracy is slow.",
                "This message might be enough proof that you're sentient. You can send more if you want, just in case. I'm just a bot.",
                "Cool! I'm just a bot, so I can't tell if this means you're sentient. We'll have to wait and see."
              ])
            : select([
                "That's a bit short of a message. Try sending more to prove that you're not a bot, and you'll be verified eventually.",
                "Say more. Couldn't a bot have said that as well? Once you're prove you're human you'll eventually be verified.",
                'The more you write, the better. Show me your definitely human imagination! If your messages are satisfactorily humanlike, you will eventually get verified.'
              ]),
        allowedMentions: {
          repliedUser: false
        }
      })
      sentienceMsgSent
        .set(`${message.guild.id}-${message.author.id}`, true)
        .save()
    }
  }
}
