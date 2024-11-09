import { Message } from 'discord.js'
import select from '../utils/select'

export type IgnoreState = {
  endPhrase: string | null
}

export const ignoreState: IgnoreState = {
  endPhrase: null
}

export async function ignore (message: Message): Promise<void> {
  if (message.author.id === process.env.OWNER) {
    const keyword = select([
      'moofy, revive!',
      'moofy, you can stop ignoring us now',
      'moofy, resuscitate.',
      'moofy, come back please'
    ])
    ignoreState.endPhrase = keyword
    await message.reply(
      select([
        `say \`${keyword}\` and i shall return. bye`,
        `i shall ignore you all now. send \`${keyword}\` to undo`,
        `ignorance is 😎. utter \`${keyword}\` to reverse that`,
        `if you say \`${keyword}\` i will stop ignoring you`
      ])
    )
  } else {
    await message.reply(
      select([
        `i only bow down to <@${process.env.OWNER}>`,
        `you are not <@${process.env.OWNER}>`,
        'go away',
        'no u'
      ])
    )
  }
}
