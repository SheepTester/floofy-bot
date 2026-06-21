import {
  DMChannel,
  GuildMember,
  Message,
  PermissionFlagsBits,
  TextChannel
} from 'discord.js'
import ok from '../utils/ok'
import select from '../utils/select'
import { db } from '../utils/db'
import z from 'zod'

const setWelcomeMessage = db.prepare(
  [
    'insert or replace into welcome_channels (guild_id, channel_id, message_content)',
    'values (?, ?, ?)'
  ].join(' ')
)
const welcomeMessageSchema = z
  .strictObject({
    channel_id: z.string(),
    message_content: z.string()
  })
  .optional()
const getWelcomeMessage = db.prepare(
  [
    'select channel_id, message_content',
    'from welcome_channels',
    'where guild_id = ?'
  ].join(' ')
)
const markUserSeen = db.prepare(
  [
    'insert or ignore into welcome_message_sent (guild_id, user_id)',
    'values (?, ?)'
  ].join(' ')
)

export async function setWelcome (
  message: Message,
  [channelId, welcomeMsg]: string[]
): Promise<void> {
  if (
    message.channel instanceof DMChannel ||
    message.channel.lastMessageId === undefined ||
    !message.guild ||
    !message.member
  ) {
    await message.reply('no dms')
    return
  }
  if (
    !message.channel
      .permissionsFor(message.member)
      .has(PermissionFlagsBits.ManageGuild)
  ) {
    await message.reply(
      'why should i obey you if you cant even manage the server lmao'
    )
    return
  }

  setWelcomeMessage.run(message.guild.id, channelId, welcomeMsg)
  await message.react(select(ok))
}

export async function onJoin (member: GuildMember): Promise<void> {
  const { channel_id, message_content } =
    welcomeMessageSchema.parse(getWelcomeMessage.get(member.guild.id)) ?? {}
  if (!channel_id) {
    return
  }
  const channel = await member.guild.channels.fetch(channel_id)
  if (!(channel instanceof TextChannel)) {
    return
  }
  await channel.send({
    content: select([
      'Hi, {USER}; please read this:',
      'Welcome, {USER}! Read this:',
      "Hey, {USER}! Let's see if you can read.",
      '{USER}, I have been told to show you this.'
    ]).replace('{USER}', member.toString()),
    embeds: [
      {
        description: message_content,
        footer: {
          text: 'Note: I am just a bot, and I have been instructed to repeat this message to all users who join the server.'
        }
      }
    ]
  })
}

export async function onMessage (message: Message): Promise<void> {
  if (!message.guild) {
    return
  }
  const channelId = welcomeMessageSchema.parse(
    getWelcomeMessage.get(message.guild.id)
  )?.channel_id
  if (message.channel.id === channelId && !message.author.bot) {
    if (markUserSeen.run(message.guild.id, message.author.id).changes > 0) {
      await message.reply({
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
        allowedMentions: { repliedUser: false }
      })
    }
  }
}
