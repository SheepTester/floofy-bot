const { Client, PacketWriter, State } = require('mcproto')
const select = require('./utils/select.js')

async function getServerStatus (address) {
  const [host, port = '25565'] = address.split(':')
  const client = await Client.connect(host, +port)
  client.send(
    new PacketWriter(0x0)
      .writeVarInt(404)
      .writeString(host)
      .writeUInt16(+port)
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

module.exports.serverStatus = async (message, [address]) => {
  try {
    const { online, max, players, version } = await getServerStatus(address)
    message.reply({
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
    message.reply({
      content: select(['problem!', "can't connect!", 'oopsie doopsie']),
      embeds: [{ description: error.message }]
    })
  }
}
