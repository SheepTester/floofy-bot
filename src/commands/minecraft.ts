import {
  type APIEmbed,
  Client as DiscordClient,
  Message,
  type TextBasedChannel
} from 'discord.js'
import { Client, PacketWriter, State } from 'mcproto'
import select from '../utils/select'
import { db } from '../utils/db'
import z from 'zod'

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

const trackInfoSchema = z.strictObject({
  host: z.string(),
  port: z.number(),
  start_time: z.number()
})
type TrackInfo = z.infer<typeof trackInfoSchema>

type TrackState = {
  lastPlayers: Player[]
  timeoutId: ReturnType<typeof setInterval>
}

const DEFAULT_PORT = '25565'
const EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 7
const CHECK_FREQ = 1000 * 60 * 5

// TODO: are the trailing semicolons required
const getAll = db.prepare('select * from minecraft_track_channels;')
const getInfo = db.prepare(
  [
    'select host, port, start_time from minecraft_track_channels',
    'where channel_id = ?'
  ].join(' ') + ';'
)
const trackChannel = db.prepare(
  [
    'insert or replace into minecraft_track_channels (channel_id, host, port, start_time)',
    'values (?, ?, ?, ?)'
  ].join(' ') + ';'
)
const untrackChannel = db.prepare(
  ['delete from minecraft_track_channels', 'where channel_id = ?'].join(' ') +
    ';'
)

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
  if (!address) {
    const info = z
      .optional(trackInfoSchema)
      .parse(getInfo.get(message.channel.id))
    if (!info) {
      await message.reply({
        content:
          'idk what address u want. i default to whatever you set `track:` to but it looks like you arent using that so 🤷'
      })
      return
    }
    address = `${info.host}:${info.port}`
  }
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
          color: 0xe94242,
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
  if (Date.now() > info.start_time + EXPIRATION_TIME) {
    clearInterval(state.timeoutId)
    untrackChannel.run(channel.id)
    delete states[channel.id]
    await channel.send({
      content: `It has now been <t:${Math.floor(
        info.start_time / 1000
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
  ).catch((): ServerStatus => ({
    online: 0,
    max: -1,
    players: [],
    version: ''
  }))
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

const states: Record<string, TrackState> = {}

export async function init (client: DiscordClient): Promise<void> {
  await Promise.all(
    getAll
      .all()
      .values()
      .map(row =>
        trackInfoSchema.safeExtend({ channel_id: z.string() }).parse(row)
      )
      .map(async ({ channel_id, ...info }) => {
        const channel = await client.channels.fetch(channel_id)
        if (channel?.isTextBased()) {
          states[channel_id] = {
            lastPlayers: [],
            timeoutId: setInterval(() => {
              check(channel, info, states[channel_id])
            }, CHECK_FREQ)
          }
          await check(channel, info, states[channel_id], true)
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
      start_time: Date.now()
    }
    trackChannel.run(message.channel.id, info.host, info.port, info.start_time)
    states[message.channel.id] = state
    await check(message.channel, info, state, true)
  } else {
    const { changes } = untrackChannel.run(message.channel.id)
    delete states[message.channel.id]
    await message.reply(
      changes > 0
        ? 'ok i will stop tracking'
        : "i don't think i was tracking a server. put the server url after the colon, like `track: yourmom.com`"
    )
  }
}
