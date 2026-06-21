import {
  GuildMember,
  PermissionFlagsBits,
  type Message,
  type MessageCreateOptions,
  type PartialGuildMember
} from 'discord.js'
import select from '../utils/select'
import { db } from '../utils/db'
import z from 'zod'

const setLeaveChannel = db.prepare(
  [
    'insert into leave_channels (guild_id, channel_id)',
    'values (?, ?)',
    'on conflict(guild_id)',
    'do update set channel_id = excluded.channel_id'
  ].join(' ')
)
const removeLeaveChannel = db.prepare(
  'delete from leave_channels where guild_id = ?'
)
const getLeaveChannelSchema = z.strictObject({ channel_id: z.string() })
const getLeaveChannel = db.prepare(
  'select channel_id from leave_channels where guild_id = ?'
)
const logLastMessage = db.prepare(
  [
    'insert into leave_last_message (guild_id, channel_id, message_id, content)',
    'values (?, ?, ?, ?)',
    'on conflict(guild_id)',
    'do update set',
    'channel_id = excluded.channel_id,',
    'message_id = excluded.message_id,',
    'content = excluded.content'
  ].join(' ')
)
const getLastMessageSchema = z.strictObject({
  channel_id: z.string(),
  message_id: z.string()
})
const getLastMessage = db.prepare(
  'select channel_id, message_id from leave_last_message where guild_id = ?'
)

export async function setChannel (
  message: Message,
  [channelId]: (string | undefined)[]
): Promise<void> {
  if (!message.member || !message.guild || message.channel.isDMBased()) {
    await message.reply('i dont do dms sry')
    return
  }
  if (
    !message.channel
      .permissionsFor(message.member)
      .has(PermissionFlagsBits.ManageChannels)
  ) {
    await message.reply(
      select([
        'lmao why',
        'u dont have manage channel perms git gud',
        'i dont listen to u powerless freaks'
      ])
    )
    return
  }
  if (channelId) {
    setLeaveChannel.run(message.guild.id, channelId)
  } else {
    removeLeaveChannel.run(message.guild.id)
  }
  await message.react('👍')
}

export async function onMessage (message: Message): Promise<void> {
  if (!message.guild) {
    return
  }
  if (
    getLeaveChannelSchema
      .optional()
      .parse(getLeaveChannel.get(message.guild.id))?.channel_id
  ) {
    // Don't unnecessarily log messages sent outside the leave channel since
    // sqlite writes are relatively more expensive
    logLastMessage.run(
      message.guild.id,
      message.channel.id,
      message.id,
      message.content
    )
  }
}

export async function onLeave (
  member: GuildMember | PartialGuildMember
): Promise<void> {
  const leaveChannelId = getLeaveChannelSchema
    .optional()
    .parse(getLeaveChannel.get(member.guild.id))?.channel_id
  if (!leaveChannelId) {
    return
  }
  const leaveChannel = await member.guild.channels.fetch(leaveChannelId)
  if (!leaveChannel?.isTextBased()) {
    return
  }
  const lastMessage = getLastMessageSchema
    .optional()
    .parse(getLastMessage.get(member.guild.id))
  const generateContent = (
    includeMessageLinkIfExists: boolean
  ): MessageCreateOptions => {
    const content = select([
      'bye USER',
      'farewell USER',
      'hasta la vista USER',
      'sayonara USER',
      'USER is no longer with us',
      'USER is no longer among us',
      'USER left.',
      'USER left the server',
      'USER se fue',
      'bye USER you will not be missed',
      'bye USER you will be missed dearly'
    ]).replace('USER', `**${member.user.tag}**`)
    let message = ''
    if (includeMessageLinkIfExists) {
      // Include mention (which includes user ID)
      message += `\n\nUser ID: ${member}`
      if (lastMessage) {
        message += ` https://discord.com/channels/${member.guild.id}/${lastMessage.channel_id}/${lastMessage.message_id}`
      }
    }
    // TODO: Include display name, nickname (if present/different), and roles
    return {
      content,
      embeds: [
        {
          description: message,
          author: {
            // TODO: show display name (i think my discord.js is out of date and
            // doesnt have it yet)
            name: member.user.tag,
            icon_url: member.user.displayAvatarURL()
          }
        }
      ]
    }
  }
  if (lastMessage?.channel_id === leaveChannel.id) {
    const message = await leaveChannel.messages
      .fetch(lastMessage.message_id)
      .catch(() => null)
    if (message) {
      message.reply(generateContent(false))
      return
    }
  }
  leaveChannel.send(generateContent(true))
}
