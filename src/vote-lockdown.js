const { Message } = require('discord.js')
const CachedMap = require('./utils/CachedMap')
const ok = require('./utils/ok')
const select = require('./utils/select')

const lockdownCategories = new CachedMap('./data/lockdown-cats.json')
const lockdownVotes = new CachedMap('./data/lockdown-votes.json')
module.exports.onReady = () =>
  Promise.all([lockdownCategories.read(), lockdownVotes.read()])

/** @param {Message} message */
module.exports.setLockdownCategory = async (message, [categoryId]) => {
  if (!message.channel.permissionsFor(message.member).has('MANAGE_CHANNELS')) {
    await message.reply(
      'lol first show me that you can manage chanenls then we talk'
    )
    return
  }

  lockdownCategories.set(message.guild.id, categoryId).save()
  await message.react(select(ok))
}

const MIN_VOTES = 3
const VOTE_PERIOD = 10 * 60 * 1000

/** @param {Message} message */
module.exports.voteLockdown = async message => {
  const categoryId = lockdownCategories.get(message.guild.id)
  const category = message.guild.channels.cache.get(categoryId)
  if (!category) {
    await message.reply("server doesn't have category set to lock down")
    return
  }

  const votes = lockdownVotes.get(message.guild.id, [])
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
      lockdownVotes.set(message.guild.id, votes)
    }
    votes.push({ time: now, user: message.author.id })
    lockdownVotes.save()
  }

  if (votes.length >= MIN_VOTES) {
    const success = await category.permissionOverwrites
      .get(message.guild.roles.everyone.id)
      .update(
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
