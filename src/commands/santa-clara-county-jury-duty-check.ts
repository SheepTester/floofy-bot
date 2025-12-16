import { Message } from 'discord.js'
import select from '../utils/select'
import { randomBytes } from 'node:crypto'
import { globalAgent } from 'node:https'
import { rootCertificates } from 'node:tls'
import { readFile } from 'node:fs/promises'

// https://stackoverflow.com/a/60020493
// https://stackoverflow.com/a/68904454
globalAgent.options.ca = [
  ...rootCertificates,
  await readFile(
    './src/commands/santa-clara-county-jury-duty-check.pem',
    'utf-8'
  )
]

export async function checkJuryDuty (
  message: Message,
  [args]: string[]
): Promise<void> {
  const [badgeNumber, zipCode, birthDay] = args.trim().split(/\s+/)

  const errors: string[] = []
  if (!/^\d+$/.test(badgeNumber)) {
    errors.push(`'${badgeNumber}' is not a valid badge NUMBER`)
  }
  if (!/^\d{5}$/.test(zipCode)) {
    errors.push(`'${zipCode}' is not a valid ZIP CODE`)
  }
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birthDay)) {
    errors.push(`'${birthDay}' is not a valid MM/DD/YYYY birthday`)
  }
  if (errors.length > 0) {
    await message.reply({
      content: select(['dumbas', 'idot', 'shiter']),
      embeds: [
        {
          title: 'grand disappointment',
          description: errors.join('\n')
        }
      ]
    })
    return
  }

  await message.react('🧑‍💻')

  const jsessionid = randomBytes(16).toString('hex').toUpperCase()
  const loginResponse = await fetch('https://jury.scscourt.org/login', {
    headers: {
      // accept: 'application/json, text/javascript, */*; q=0.01',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      cookie: `JSESSIONID=${jsessionid}`
    },
    body: new URLSearchParams({ badgeNumber, zipCode, birthDay }),
    method: 'POST'
  })
  if (!loginResponse.ok) {
    await message.reply({
      embeds: [
        {
          title: 'login fail',
          description: '```json\n' + (await loginResponse.text()) + '\n```'
        }
      ]
    })
    return
  }

  const instructionResponse = await fetch(
    'https://jury.scscourt.org/common/jrin-message',
    { headers: { cookie: `JSESSIONID=${jsessionid}` } }
  )
  if (!instructionResponse.ok) {
    await message.reply({
      embeds: [
        {
          title: 'get instruction fail',
          description:
            '```json\n' + (await instructionResponse.text()) + '\n```'
        }
      ]
    })
    return
  }

  const { data } = await instructionResponse.json()
  await message.reply({
    embeds: [
      {
        title: 'santa clara county has a word with you',
        description: '```html\n' + data + '\n```'
      }
    ]
  })
}
