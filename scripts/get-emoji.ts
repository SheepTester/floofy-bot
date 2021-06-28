// deno run --allow-net=discord.com --allow-write=./src/emoji.txt scripts/get-emoji.ts

import * as z from 'https://deno.land/x/zod@v3.2/mod.ts'

type Emoji = {
  names: string[]
  surrogates: string
  unicodeVersion: number

  hasDiversity?: true
  hasMultiDiversity?: true
  diversityChildren?: {
    names: string[]
    surrogates: string
    unicodeVersion: number

    hasDiversityParent?: true
    hasMultiDiversityParent?: true
    diversity: string[]
  }[]
}
const Emoji = z.record(z.array(z.object({
  names: z.array(z.string()),
  surrogates: z.string(),
  unicodeVersion: z.number(),

  hasDiversity: z.literal(true).optional(),
  hasMultiDiversity: z.literal(true).optional(),
  diversityChildren: z.array(z.object({
    names: z.array(z.string()),
    surrogates: z.string(),
    unicodeVersion: z.number(),

    hasDiversityParent: z.literal(true).optional(),
    hasMultiDiversityParent: z.literal(true).optional(),
    diversity: z.array(z.string()),
  }).strict()).optional(),
}).strict()))

// Record of emoji categories
async function onEmojiData (emojiData: Record<string, Emoji[]>, preview: number = 0) {
  const surrogates = Object.values(emojiData)
    .flatMap(emoji =>
      emoji.flatMap(({ surrogates, diversityChildren = [] }) => [
        surrogates,
        ...diversityChildren.map(({ surrogates }) => surrogates)
      ]))
    .sort((a, b) => b.length - a.length)
    .map(char => char + '\n')
    .join('')
  await Deno.writeTextFile('./src/emoji.txt', surrogates)

  // Longest emoji names because why not?
  if (preview > 0) {
    function displayNames (names: { name: string; surrogates: string }[]) {
      console.log(
        names
          .sort((a, b) => b.name.length - a.name.length)
          .slice(0, preview)
          .map(({ name, surrogates }) => `:${name}: ${surrogates}`)
          .join('\n')
      )
    }
    displayNames(
      Object.values(emojiData)
        .flatMap(emoji => emoji.map(({ names, surrogates }) =>
          ({ name: names[0], surrogates })))
    )
    console.log('With variants')
    displayNames(
      Object.values(emojiData)
        .flatMap(emoji =>
          emoji.flatMap(({ names, surrogates }) =>
            names.map(name => ({ name, surrogates }))))
    )
    console.log('With tones')
    displayNames(
      Object.values(emojiData)
        .flatMap(emoji =>
          emoji.flatMap(({ names, surrogates, diversityChildren = [] }) => [
            ...names.map(name => ({ name, surrogates })),
            ...diversityChildren
              .flatMap(({ names, surrogates }) =>
                names.map(name => ({ name, surrogates })))
          ]))
    )
  }
}

const html = await fetch('https://discord.com/channels/@me')
  .then(r => r.text())

for (const match of html.matchAll(/<script src="(\/assets\/[a-z0-9]+\.js)"/g)) {
  const js = await fetch(new URL(match[1], 'https://discord.com'))
    .then(r => r.text())
  const sheepIndex = js.indexOf('sheep')
  if (sheepIndex !== -1) {
    const result = Emoji.safeParse(JSON.parse(js.slice(js.lastIndexOf('\'', sheepIndex) + 1, js.indexOf('\'', sheepIndex))))
    if (result.success) {
      await onEmojiData(result.data, 0)
    } else {
      console.error(result.error)
      Deno.exit(1)
    }
    break
  }
}
