import {
  APIEmbed,
  Client as DiscordClient,
  Message,
  TextBasedChannel
} from 'discord.js'
import { Client, PacketWriter, State } from 'mcproto'
import select from '../utils/select'
import CachedMap from '../utils/CachedMap'

type Player = {
  name: string
  id: string
}

type ServerStatus = {
  online: number
  max: number
  players: Player[]
  version: string
}

type TrackInfo = {
  host: string
  port: number
  start: number
}

type TrackState = {
  lastPlayers: Player[]
  timeoutId: ReturnType<typeof setInterval>
}

const DEFAULT_PORT = '25565'
const EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 7
const CHECK_FREQ = 1000 * 60 * 5

async function getServerStatus (
  host: string,
  port: number
): Promise<ServerStatus> {
  const client = await Client.connect(host, port)
  client.send(
    new PacketWriter(0x0)
      .writeVarInt(404)
      .writeString(host)
      .writeUInt16(port)
      .writeVarInt(State.Status)
  )
  client.send(new PacketWriter(0x0))

  const response = await client.nextPacket(0x0)
  const {
    players: { max, online, sample: players = [] },
    version: { name: version }
  } = response.readJSON()
  client.end()

  return { online, max, players, version }
}

export async function serverStatus (message: Message, [address]: string[]) {
  try {
    const [host, port = DEFAULT_PORT] = address.split(':')
    const { online, max, players, version } = await getServerStatus(host, +port)
    await message.reply({
      content: select([
        'fomo time?',
        "let's see who's gaming",
        'tbh i expected more people on'
      ]),
      embeds: [
        {
          title: select([
            `${online}/${max} online`,
            `${online}/${max} gaming rn`,
            `${online}/${max} not touching grass`
          ]),
          description:
            online > 0
              ? players
                  .map(
                    ({ name, id }) =>
                      `[${name}](https://namemc.com/profile/${id})`
                  )
                  .join('\n') ||
                select([
                  "server not showing who's on",
                  'no players provided',
                  'the servers hiding something...'
                ])
              : select([
                  "no one's on :(",
                  'dead server',
                  'everyone touching grass today'
                ]),
          footer: {
            text: version
          }
        }
      ]
    })
  } catch (error) {
    await message.reply({
      content: select(['problem!', "can't connect!", 'oopsie doopsie']),
      embeds: [
        {
          description: error instanceof Error ? error.message : String(error)
        }
      ]
    })
  }
}

function createEmbed (
  suffix = '',
  color?: number
): (player: Player) => APIEmbed {
  return ({ id, name }: Player) => ({
    author: {
      name: name + suffix,
      icon_url: `https://cravatar.eu/helmavatar/${id}/64.png`
    },
    color
  })
}

async function check (
  channel: TextBasedChannel,
  info: TrackInfo,
  state: TrackState,
  start = false
): Promise<void> {
  if (Date.now() > info.start + EXPIRATION_TIME) {
    clearInterval(state.timeoutId)
    trackChannels.delete(channel.id).save()
    delete states[channel.id]
    await channel.send({
      content: `It has now been <t:${Math.floor(
        info.start / 1000
      )}:R> when you asked me to start tracking your server. In case you've stopped playing, I'm going to stop tracking the server now.`,
      embeds: [
        {
          description: `If you would like to continue tracking, reply to this message with \`track: ${info.host}:${info.port}\``
        }
      ]
    })
    return
  }
  const { online, max, players } = await getServerStatus(
    info.host,
    info.port
  ).catch(
    (): ServerStatus => ({
      online: 0,
      max: -1,
      players: [],
      version: ''
    })
  )
  const embeds = start
    ? players.map(createEmbed(' was already on.'))
    : [
        // Joined
        ...players
          .filter(({ id }) => !state.lastPlayers.some(p => p.id === id))
          .map(createEmbed(' joined the game.', 0x22c55e)),
        // Left
        ...state.lastPlayers
          ?.filter(({ id }) => !players.some(p => p.id === id))
          .map(createEmbed(' left the game.', 0xef4444))
      ]
  if (start || embeds.length > 0) {
    await channel.send({
      content: `${online}/${Math.max(
        max,
        0
      )} players are on now. I check again <t:${Math.floor(
        (Date.now() + CHECK_FREQ) / 1000
      )}:R>.${max === -1 ? ' **NOTE: Server is offline.**' : ''}`,
      embeds
    })
  }
  state.lastPlayers = players
}

const trackChannels = new CachedMap<TrackInfo>('./data/minecraft-track.json')
export const onReady = trackChannels.read
const states: Record<string, TrackState> = {}

export async function init (client: DiscordClient): Promise<void> {
  await Promise.all(
    trackChannels.entries().map(async ([channelId, info]) => {
      const channel = await client.channels.fetch(channelId)
      if (channel?.isTextBased()) {
        states[channelId] = {
          lastPlayers: [],
          timeoutId: setInterval(() => {
            check(channel, info, states[channelId])
          }, CHECK_FREQ)
        }
        await check(channel, info, states[channelId], true)
      }
    })
  )
}

export async function track (message: Message, [address]: string[]) {
  if (states[message.channel.id]) {
    clearInterval(states[message.channel.id].timeoutId)
  }
  if (address) {
    const [host, port = DEFAULT_PORT] = address.split(':')
    const state: TrackState = {
      lastPlayers: [],
      timeoutId: setInterval(() => {
        check(message.channel, info, state)
      }, CHECK_FREQ)
    }
    const info: TrackInfo = {
      host,
      port: +port,
      start: Date.now()
    }
    trackChannels.set(message.channel.id, info).save()
    states[message.channel.id] = state
    await check(message.channel, info, state, true)
  } else {
    const info = trackChannels.get(message.channel.id)
    await message.reply(
      info
        ? 'ok i will stop tracking'
        : "i don't think i was tracking a server. put the server url after the colon, like `track: yourmom.com`"
    )
    trackChannels.delete(message.channel.id).save()
  }
}
