import { Message } from 'discord.js'
import select from '../utils/select'

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

  const cookieResponse = await fetch('https://jury.scscourt.org/login')
  const match = cookieResponse.headers
    .getSetCookie()
    .join('')
    .match(/JSESSIONID=([0-9A-F]{32})/)
  if (!match) {
    await message.reply({
      embeds: [
        {
          title: 'get cookie fail fail',
          description: 'couldnt get cookie',
          color: 0xfb2c36
        }
      ]
    })
    return
  }
  const jsessionid = match[1]

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
          description: '```json\n' + (await loginResponse.text()) + '\n```',
          color: 0xfb2c36
        }
      ]
    })
    return
  }

  const { status, message: loginMessage } = await loginResponse.json()
  if (!status) {
    await message.reply({
      embeds: [
        {
          title: 'login bad',
          description: loginMessage,
          color: 0xfb2c36
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
            '```json\n' + (await instructionResponse.text()) + '\n```',
          color: 0xfb2c36
        }
      ]
    })
    return
  }

  const json = await instructionResponse.text()
  try {
    const { data } = JSON.parse(json)
    await message.reply({
      embeds: [
        {
          title: 'santa clara county has a word with you',
          description: '```html\n' + data + '\n```'
        }
      ]
    })
  } catch {
    await message.reply({
      embeds: [
        {
          title: 'parse instruction fail',
          description: '```html\n' + json.slice(0, 2000) + '\n```',
          color: 0xfb2c36
        }
      ]
    })
  }
}
