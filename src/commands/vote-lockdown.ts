import { CategoryChannel, DMChannel, Message } from 'discord.js'
import CachedMap from '../utils/CachedMap'
import ok from '../utils/ok'
import select from '../utils/select'

type Vote = {
  time: number
  user: string
}

const lockdownCategories = new CachedMap<string>('./data/lockdown-cats.json')
const lockdownVotes = new CachedMap<Vote[]>('./data/lockdown-votes.json')
export const onReady = () =>
  Promise.all([lockdownCategories.read(), lockdownVotes.read()])

export async function setLockdownCategory (
  message: Message,
  [categoryId]: string[]
): Promise<void> {
  if (
    message.channel instanceof DMChannel ||
    message.channel.lastMessageId === undefined
  ) {
    await message.reply('no dms')
    return
  }
  if (!message.channel.permissionsFor(message.member!).has('MANAGE_CHANNELS')) {
    await message.reply(
      'lol first show me that you can manage chanenls then we talk'
    )
    return
  }

  lockdownCategories.set(message.guild!.id, categoryId).save()
  await message.react(select(ok))
}

const MIN_VOTES = 3
const VOTE_PERIOD = 10 * 60 * 1000

export async function voteLockdown (message: Message): Promise<void> {
  const categoryId = lockdownCategories.get(message.guild?.id)
  const category = message.guild!.channels.cache.get(categoryId!)
  if (!(category instanceof CategoryChannel)) {
    await message.reply("server doesn't have category set to lock down")
    return
  }

  const votes = lockdownVotes.get(message.guild?.id, [])
  const now = Date.now()
  for (let i = 0; i < votes.length; i++) {
    if (now - votes[i].time > VOTE_PERIOD) {
      votes.splice(i--, 1)
    }
  }
  if (votes.find(vote => vote.user === message.author.id)) {
    lockdownVotes.save()
    await message.reply("tsk tsk, you've already voted in the past 10 min")
    return
  } else {
    if (votes.length === 0) {
      // The array might be new
      lockdownVotes.set(message.guild!.id, votes)
    }
    votes.push({ time: now, user: message.author.id })
    lockdownVotes.save()
  }

  if (votes.length >= MIN_VOTES) {
    const success = await category.permissionOverwrites
      .resolve(message.guild!.roles.everyone.id)!
      .edit(
        {
          VIEW_CHANNEL: null
        },
        'Democracy voted to lock the channel.'
      )
      .then(() => true)
      .catch(() => false)
    await message.channel.send(
      success
        ? "unverified folk have been BANISHED from the common people's channels"
        : 'unfortunately i lack the perms to change channel perms oopsi'
    )
  } else {
    await message.reply(
      `${votes.length} of the minimum ${MIN_VOTES} votes needed to close off the server from them pesky unverifieds`
    )
  }
}
