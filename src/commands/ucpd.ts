// From https://github.com/SheepTester/ucsd-event-scraper/blob/main/explore/police/parse.ts

import { APIEmbed, Client, Message } from 'discord.js'
import { getDocument, VerbosityLevel } from 'pdfjs-dist'
import select from '../utils/select'
import CachedMap from '../utils/CachedMap'

type TextObject = {
  content: string
  // probably not very useful
  hasEol: boolean
  x: number
  /** +y is up */
  y: number
}

export type Report = {
  type: string
  location: string
  dateReported: string
  incidentCaseNum: string
  dateOccurred: string
  timeOccurred: string
  summary: string
  disposition: string
}

const FIELDS = [
  'Date Reported',
  'Incident/Case#',
  'Date Occurred',
  'Time Occurred',
  'Summary',
  'Disposition'
]

const BASE_URL =
  'https://www.police.ucsd.edu/docs/reports/CallsandArrests/CallsForService/'

async function getReports (fileName: string): Promise<Report[]> {
  const reports: Report[] = []
  const pdf = await getDocument({
    url: BASE_URL + fileName,
    useSystemFonts: true,
    verbosity: VerbosityLevel.ERRORS
  }).promise
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const { items } = await page.getTextContent()
      const pageText = items
        .filter(item => 'transform' in item)
        .map(
          (item): TextObject => ({
            content: item.str,
            hasEol: item.hasEOL,
            x: item.transform[4],
            y: item.transform[5]
          })
        )
        .sort(
          // Sort from top to bottom, then left to right
          (a, b) => (Math.abs(a.y - b.y) > 0.1 ? b.y - a.y : a.x - b.x)
        )
        .map(t => t.content)
        .filter(content => content.trim().length > 0)

      if (
        pageText[0] !== 'UCSD POLICE DEPARTMENT' &&
        pageText[1] !== 'CRIME AND FIRE LOG/MEDIA BULLETIN'
      ) {
        throw new Error('page does not start with UCPD header')
      }
      pageText.splice(0, 3)

      const indices: number[] = []
      for (const [i, content] of pageText.entries()) {
        if (content === 'Date Reported') {
          indices.push(i - 2)
        }
      }

      for (let i = 0; i < indices.length; i++) {
        const start = indices[i]
        const end = indices[i + 1] ?? pageText.length
        const parts: string[][] = []
        let j = start
        for (const field of FIELDS) {
          const fieldStart = j
          for (; j < end; j++) {
            // Sometimes they forget the colon after "Disposition"
            if (pageText[j] === field || pageText[j] === field + ':') {
              break
            }
          }
          parts.push(pageText.slice(fieldStart, j))
          j++
        }
        parts.push(pageText.slice(j, end))
        const [
          dateReported,
          incidentCaseNum,
          dateOccurred,
          timeOccurred,
          summary,
          disposition
        ] = parts.slice(1).map(segments => segments.join(' '))
        reports.push({
          type: pageText[start],
          location: pageText[start + 1],
          dateReported,
          incidentCaseNum,
          dateOccurred,
          timeOccurred,
          summary,
          disposition
        })
      }
    }
  } finally {
    await pdf.destroy()
  }
  return reports
}

// https://github.com/SheepTester/ucsd-event-scraper/blob/main/explore/police/scrape.ts
async function getFileNames (): Promise<string[]> {
  const html = await fetch(
    'https://www.police.ucsd.edu/docs/reports/CallsandArrests/Calls_and_Arrests.asp'
  ).then(r => r.text())
  return Array.from(
    html.matchAll(/<option value="CallsForService\/([^.]+.pdf)">/g),
    ([, fileName]) => fileName
  )
}

// https://github.com/SheepTester/ucsd-event-scraper/blob/main/explore/police/display.ts
function display (reports: Report[]): string {
  return reports
    .map(
      ({ type, location, dateOccurred, timeOccurred, summary, disposition }) =>
        [
          `**${type}**${summary ? ': ' : ''}${summary}\n`,
          disposition ? `Result: ${disposition}\n` : '',
          `-# ${dateOccurred} ${timeOccurred} · ${location}`
        ].join('')
    )
    .join('\n\n')
}

export async function showReport (message: Message, [fileName]: string[]) {
  if (!fileName) {
    fileName = (await getFileNames())[0]
  } else if (!fileName.endsWith('.pdf')) {
    fileName += '.pdf'
  }
  try {
    const description = display(await getReports(fileName))
    await message.reply({
      content: select([
        'oh look i did that',
        'my bad',
        'what did u do this time'
      ]),
      embeds: [
        {
          title: fileName,
          url: BASE_URL + encodeURIComponent(fileName),
          description,
          footer: { text: `${description.length} chars` }
        }
      ]
    })
  } catch (error) {
    const fileNames = await getFileNames().catch(() => null)
    await message.reply({
      content: select([
        'i shat my pants',
        'i do not support pdf files',
        'issue'
      ]),
      embeds: [
        {
          color: 0xe94242,
          description: error instanceof Error ? error.message : String(error)
        },
        {
          description: `**Available files**\n${
            fileNames?.join('\n') ?? '(failed to load)'
          }`
        }
      ]
    })
  }
}

const trackChannels = new CachedMap<1>('./data/ucpd-track.json')
const seen = new CachedMap<1>('./data/ucpd-seen.json')
export const onReady = () => Promise.all([trackChannels.read(), seen.read()])

/** 2.13 hours */
const CHECK_FREQ = 2.13 * 60 * 60 * 1000

export function init (client: Client): void {
  setInterval(async () => {
    const channels = trackChannels.entries()
    if (channels.length === 0) {
      return
    }
    const unseen = (await getFileNames()).filter(
      fileName => !seen.get(fileName)
    )
    if (unseen.length === 0) {
      return
    }
    const description = display(await getReports(unseen[0]))
    const embeds: APIEmbed[] = [
      {
        title: unseen[0],
        url: BASE_URL + encodeURIComponent(unseen[0]),
        description,
        footer: {
          text: `${description.length} chars · To turn off, reply "i renounce my life of crime"`
        }
      }
    ]
    if (unseen.length > 1) {
      embeds.push({
        title: 'Multiple crime logs just dropped',
        description: `Reply \`florida man:\` followed by the date:\n${unseen.join(
          '\n'
        )}`
      })
    }
    for (const fileName of unseen) {
      seen.set(fileName, 1)
    }
    await seen.save()
    for (const [channelId] of channels) {
      const channel = await client.channels.fetch(channelId)
      if (!channel?.isTextBased()) {
        continue
      }
      await channel.send({
        content: select([
          'who did this',
          'exposed',
          'did u do this',
          'this reminds me of u',
          'inspirational 😍',
          'live love LIE',
          'i knew its not the trolley its YOU'
        ]),
        embeds
      })
    }
  }, CHECK_FREQ)
}

export async function track (message: Message): Promise<void> {
  if (trackChannels.has(message.channel.id)) {
    await message.reply(
      select([
        'oh i thought you all were already criminals',
        'arent you already learning crime',
        'yeah yeah ill tell you too'
      ])
    )
  } else {
    await trackChannels.set(message.channel.id, 1).save()
    await message.reply(
      select([
        'ok when crime happens i will tell you',
        'ill check in on ucpd every once in a while and if they have new lessons available i shall send em here',
        'when ucpd releases their crime logs ill put them here'
      ])
    )
  }
}

export async function untrack (message: Message): Promise<void> {
  if (trackChannels.has(message.channel.id)) {
    await trackChannels.delete(message.channel.id).save()
    await message.reply(
      select([
        'i guess you got tired of seeing those crime logs',
        'okay fine, next think you know youll be saying how the trolley is making the campus unsafe or soemthing silly',
        'ignorance is bliss'
      ])
    )
  } else {
    await message.reply(
      select([
        'cool but you didnt need to tell me that',
        'cool story bro',
        'ok lol'
      ])
    )
  }
}
