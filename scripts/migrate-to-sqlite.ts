/**
 * @file
 * Temporary script for converting from `CachedMap`-based JSON files in data/ to
 * the sqlite database specified in `DATABASE_URL`.
 *
 * Usage: node --env-file=.env scripts/migrate-to-sqlite.ts
 */

import CachedMap from '../src/utils/CachedMap'
import { db } from '../src/utils/db'

const emojiUsage = new CachedMap<number>('./data/emoji-usage.json')
await emojiUsage.read()

type LastPing = {
  author: string
  content: string
  url: string
  role?: boolean
}
const mentionCache = new CachedMap<LastPing>('./data/mentions.json')
await mentionCache.read()

type TrackInfo = {
  host: string
  port: number
  start: number
}
const trackChannelsMc = new CachedMap<TrackInfo>('./data/minecraft-track.json')
await trackChannelsMc.read()

const pollChannels = new CachedMap<boolean>('./data/poll-reactions.json')
await pollChannels.read()

const trackChannelsUcpd = new CachedMap<1>('./data/ucpd-track.json')
const seen = new CachedMap<1>('./data/ucpd-seen.json')
await Promise.all([trackChannelsUcpd.read(), seen.read()])

type Vote = {
  time: number
  user: string
}
const lockdownCategories = new CachedMap<string>('./data/lockdown-cats.json')
const lockdownVotes = new CachedMap<Vote[]>('./data/lockdown-votes.json')
await Promise.all([lockdownCategories.read(), lockdownVotes.read()])

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

type LastWiseGuy = {
  time: number
  channelId?: string
  message: string
  replies: string[]
  /** Old key */
  guildFrequency?: unknown
  guildFrequency2?: number
}
const DEFAULT_STATE: LastWiseGuy = {
  time: 0,
  message: '',
  replies: []
}
const wiseGuyState = new CachedMap<Readonly<LastWiseGuy>>(
  './data/wise-guy.json'
)
await wiseGuyState.read()
