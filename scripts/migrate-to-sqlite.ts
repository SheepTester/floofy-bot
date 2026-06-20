/**
 * @file
 * Temporary script for converting from `CachedMap`-based JSON files in data/ to
 * the sqlite database specified in `DATABASE_URL`.
 *
 * Usage: node --env-file=.env scripts/migrate-to-sqlite.ts
 */

import CachedMap from '../src/utils/CachedMap'
import { db } from '../src/utils/db'

function prepare (tableName: string, columnNames: string): string {
  const columns = columnNames.split(' ')
  return `insert into ${tableName} (${columns.join(',')}) values (${columns.map(() => '?').join(',')})`
}

const emojiUsage = new CachedMap<number>('./data/emoji-usage.json')
await emojiUsage.read()
const emojiUsageAdd = db.prepare(
  prepare('emoji_usage', 'guild_id emoji_id count')
)
for (const [key, count] of emojiUsage.entries()) {
  const [guildId, emojiId] = key.split('-')
  emojiUsageAdd.run(guildId, emojiId, count)
}

type LastPing = {
  author: string
  content: string
  url: string
  role?: boolean
}
const mentionCache = new CachedMap<LastPing>('./data/mentions.json')
await mentionCache.read()
const mentionCacheAdd = db.prepare(
  prepare('mentions', 'channel_id mentioned author content message_url is_role')
)
for (const [
  key,
  { author, content, url, role = false }
] of mentionCache.entries()) {
  const [channelId, targetId] = key.split('-')
  mentionCacheAdd.run(channelId, targetId, author, content, url, +role)
}

type TrackInfo = {
  host: string
  port: number
  start: number
}
const trackChannelsMc = new CachedMap<TrackInfo>('./data/minecraft-track.json')
await trackChannelsMc.read()
const trackChannelsMcAdd = db.prepare(
  prepare('minecraft_track_channels', 'channel_id host port start_time')
)
for (const [channelId, { host, port, start }] of trackChannelsMc.entries()) {
  trackChannelsMcAdd.run(channelId, host, port, start)
}

const pollChannels = new CachedMap<boolean>('./data/poll-reactions.json')
await pollChannels.read()
const pollChannelsAdd = db.prepare(
  prepare('poll_reactions_channels', 'channel_id')
)
for (const [channelId, enabled] of pollChannels.entries()) {
  if (enabled) {
    pollChannelsAdd.run(channelId)
  }
}

const trackChannelsUcpd = new CachedMap<1>('./data/ucpd-track.json')
const seen = new CachedMap<1>('./data/ucpd-seen.json')
await Promise.all([trackChannelsUcpd.read(), seen.read()])
const trackChannelsUcpdAdd = db.prepare(
  prepare('ucpd_track_channels', 'channel_id')
)
for (const [channelId] of trackChannelsUcpd.entries()) {
  trackChannelsUcpdAdd.run(channelId)
}
const seenAdd = db.prepare(prepare('ucpd_seen', 'file_name'))
for (const [fileName] of seen.entries()) {
  seenAdd.run(fileName)
}

type Vote = {
  time: number
  user: string
}
const lockdownCategories = new CachedMap<string>('./data/lockdown-cats.json')
const lockdownVotes = new CachedMap<Vote[]>('./data/lockdown-votes.json')
await Promise.all([lockdownCategories.read(), lockdownVotes.read()])
const lockdownCategoriesAdd = db.prepare(
  prepare('vote_lockdown_categories', 'guild_id category_id')
)
for (const [guildId, categoryId] of lockdownCategories.entries()) {
  lockdownCategoriesAdd.run(guildId, categoryId)
}
const lockdownVotesAdd = db.prepare(
  prepare('vote_lockdown_votes', 'guild_id user_id vote_time')
)
for (const [guildId, votes] of lockdownVotes.entries()) {
  for (const { time, user } of votes) {
    lockdownVotesAdd.run(guildId, user, time)
  }
}

type WelcomeChannel = {
  channelId: string
  message: string
}
const welcomeChannels = new CachedMap<WelcomeChannel>(
  './data/welcome-channels.json'
)
const sentienceMsgSent = new CachedMap<boolean>(
  './data/sentience-msg-sent.json'
)
await Promise.all([welcomeChannels.read(), sentienceMsgSent.read()])
const welcomeChannelsAdd = db.prepare(
  prepare('welcome_channels', 'guild_id channel_id message_content')
)
for (const [guildId, { channelId, message }] of welcomeChannels.entries()) {
  welcomeChannelsAdd.run(guildId, channelId, message)
}
const sentienceMsgSentAdd = db.prepare(
  prepare('welcome_message_sent', 'guild_id user_id')
)
for (const [key, sent] of sentienceMsgSent.entries()) {
  if (sent) {
    const [guildId, userId] = key.split('-')
    sentienceMsgSentAdd.run(guildId, userId)
  }
}

type LastWiseGuy = {
  time: number
  channelId?: string
  message: string
  replies: string[]
  /** Old key */
  guildFrequency?: unknown
  guildFrequency2?: number
}
const wiseGuyState = new CachedMap<Readonly<LastWiseGuy>>(
  './data/wise-guy.json'
)
await wiseGuyState.read()
const wiseGuyStateAdd = db.prepare(
  prepare(
    'wise_guy',
    'guild_id last_time last_channel_id last_message replies guild_frequency'
  )
)
for (const [
  guildId,
  { time, channelId = null, message, replies, guildFrequency2 = null }
] of wiseGuyState.entries()) {
  wiseGuyStateAdd.run(
    guildId,
    time,
    channelId,
    message,
    JSON.stringify(replies),
    guildFrequency2
  )
}
