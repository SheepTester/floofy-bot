import { Message } from 'discord.js'
import select from '../utils/select'

export async function about (message: Message): Promise<void> {
  await message.reply({
    content: select(['hi', 'i am moofy', 'hello', 'i am me']),
    embeds: [
      {
        title: select([
          'who am i',
          'i am whom',
          'whomst',
          'who i am',
          'introduction',
          'hi hi'
        ]),
        description: [
          select([
            'i am bot',
            'i am a discord bot for personal use',
            'i am made with [discord.js](https://discord.js.org/)',
            'please be respectful'
          ]),
          select([
            '[observe my brain](https://github.com/SheepTester/floofy-bot)',
            'i am on the [git hubs](https://github.com/SheepTester/floofy-bot)',
            'my six brain cells are made in [java script](https://github.com/SheepTester/floofy-bot)'
          ]),
          select([
            'fact: java is short for javascript',
            'tip: in js, `let` is unsafe, always use `var`',
            "fun fact: you made javascript, that's why it sucks",
            "cool tip: make your js arrays sparce with `arr[5000] = 'lol'` then delete it using `delete arr[5000]` to spice up performance",
            "useful tip: make sure your code does not have `'use script'` because it makes it more prone to errors",
            'did you know: javascript is used to mod [minecraft](https://web.archive.org/web/20201111231249/https://minecraft.gamepedia.com/Bedrock_Edition_beta_scripting_documentation#Scripting_System)'
          ])
        ].join('\n\n'),
        footer: {
          text: 'Running floofy-bot'
        }
      }
    ]
  })
}
