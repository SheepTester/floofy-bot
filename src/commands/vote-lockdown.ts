import { CategoryChannel, Message, PermissionFlagsBits } from 'discord.js'
import ok from '../utils/ok'
import select from '../utils/select'
import { db } from '../utils/db'
import z from 'zod'

const registerLockdownCategory = db.prepare(
  [
    'insert or replace into vote_lockdown_categories (guild_id, category_id)',
    'values (?, ?)'
  ].join(' ')
)
const categoryIdSchema = z.strictObject({ category_id: z.string() }).optional()
const getLockdownCategory = db.prepare(
  [
    'select category_id',
    'from vote_lockdown_categories',
    'where guild_id = ?'
  ].join(' ')
)
const deleteExpiredVotes = db.prepare(
  [
    'delete from vote_lockdown_votes',
    'where guild_id = ? and vote_time < ?'
  ].join(' ')
)
const tryVote = db.prepare(
  [
    'insert or ignore into vote_lockdown_votes (guild_id, user_id, vote_time)',
    'values (?, ?, ?)'
  ].join(' ')
)
const voteCountSchema = z.strictObject({ vote_count: z.number() })
const countVotes = db.prepare(
  [
    'select count(*) as vote_count',
    'from vote_lockdown_votes',
    'where guild_id = ? and vote_time >= ?'
  ].join(' ')
)

export async function setLockdownCategory (
  message: Message,
  [categoryId]: string[]
): Promise<void> {
  if (
    message.channel.isDMBased() ||
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
      .has(PermissionFlagsBits.ManageChannels)
  ) {
    await message.reply(
      'lol first show me that you can manage chanenls then we talk'
    )
    return
  }
  registerLockdownCategory.run(message.guild.id, categoryId)
  await message.react(select(ok))
}

const MIN_VOTES = 3
const VOTE_PERIOD = 10 * 60 * 1000

export async function voteLockdown (message: Message): Promise<void> {
  if (!message.guild || message.channel.isDMBased()) {
    await message.reply('no dms!!!!')
    return
  }
  const categoryId = categoryIdSchema.parse(
    getLockdownCategory.get(message.guild.id)
  )?.category_id
  const category = categoryId && message.guild.channels.cache.get(categoryId)
  if (!(category instanceof CategoryChannel)) {
    await message.reply("server doesn't have category set to lock down")
    return
  }

  const now = Date.now()
  deleteExpiredVotes.run(message.guild.id, now - VOTE_PERIOD)
  if (!tryVote.run(message.guild.id, message.author.id, now).changes) {
    await message.reply("tsk tsk, you've already voted in the past 10 min")
    return
  }

  const { vote_count } = voteCountSchema.parse(
    countVotes.get(message.guild.id, now - VOTE_PERIOD)
  )
  if (vote_count >= MIN_VOTES) {
    const success = await category.permissionOverwrites
      .resolve(message.guild.roles.everyone.id)
      ?.edit({ ViewChannel: null }, 'Democracy voted to lock the channel.')
      .then(() => true)
      .catch(() => false)
    await message.channel.send(
      success
        ? "unverified folk have been BANISHED from the common people's channels"
        : 'unfortunately i lack the perms to change channel perms oopsi'
    )
  } else {
    await message.reply(
      `${vote_count} of the minimum ${MIN_VOTES} votes needed to close off the server from them pesky unverifieds`
    )
  }
}
