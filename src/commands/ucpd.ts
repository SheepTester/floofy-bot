// From https://github.com/SheepTester/ucsd-event-scraper/blob/main/explore/police/parse.ts

import { APIEmbed, BaseMessageOptions, Client, Message } from 'discord.js'
import { getDocument, VerbosityLevel } from 'pdfjs-dist'
import select from '../utils/select'
import CachedMap from '../utils/CachedMap'

type TextObject = {
  content: string
  /** true when content is empty it seems? I wouldn't count on it though */
  hasEol: boolean
  x: number
  /** +y is up */
  y: number
  width: number
  /** sometimes zero, i think if there's no glyphs */
  height: number
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

export async function getReports (fileName: string): Promise<Report[]> {
  const reports: Report[] = []
  const pdf = await getDocument({
    url: `${BASE_URL}/${fileName}`,
    useSystemFonts: true,
    verbosity: VerbosityLevel.ERRORS
  }).promise
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const { items } = await page.getTextContent()
      const textObjects = items
        .filter(item => 'transform' in item)
        .map(
          (item): TextObject => ({
            content: item.str,
            hasEol: item.hasEOL,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height
          })
        )
        .sort(
          // Sort from top to bottom, then left to right
          (a, b) => (Math.abs(a.y - b.y) > 0.1 ? b.y - a.y : a.x - b.x)
        )

      let text = ''
      let lastObject: TextObject | null = null
      for (const object of textObjects) {
        if (object.content.trim().length === 0) {
          text += object.content
          continue
        }
        if (lastObject) {
          if (lastObject.y - object.y > 0.1) {
            // New line
            text += '\n'
          } else if (object.x - (lastObject.x + lastObject.width) > 3) {
            // Horizontal space
            text += '\t'
          }
        }
        text += object.content
        lastObject = object
      }

      const pageText = text
        .trim()
        .split(/\t|\n/)
        .map(content => content.trim())

      if (
        pageText[0] === 'UCSD POLICE DEPARTMENT' &&
        pageText[1] === 'CRIME AND FIRE LOG/MEDIA BULLETIN'
      ) {
        // pageText[2] is the date
        pageText.splice(0, 3)
      } else {
        throw new Error(
          `${fileName}: page ${i} does not start with UCPD header:\n${pageText
            .slice(0, 5)
            .join('\n')}`
        )
      }

      const indices: number[] = []
      for (const [i, content] of pageText.entries()) {
        if (content === 'Date Reported') {
          indices.push(i - 2)
        }
      }

      if (indices[0] > 0) {
        // More text before first crime on page. This only happens for Sun God
        // (e.g. May 3, 2025)
        console.warn(
          `${fileName}: text before first crime on page:`,
          indices,
          'adding this text to last disposition'
        )
        if (reports.length > 0) {
          const lastReport = reports[reports.length - 1]
          lastReport.disposition +=
            ' ' + pageText.slice(0, indices[0]).join(' ')
        } else {
          throw new Error(`${fileName}: text before first crime`)
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
  if (reports.length === 0) {
    throw new Error(`No reports found in ${fileName}. Something went wrong.`)
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
function display (reports: Report[]): string[] {
  return reports.map(
    ({ type, location, dateOccurred, timeOccurred, summary, disposition }) =>
      [
        `**${type}**${summary ? ': ' : ''}${summary}\n`,
        disposition ? `Result: ${disposition}\n` : '',
        `-# ${dateOccurred} ${timeOccurred} · ${location}`
      ].join('')
  )
}

/**
 * Groups strings such that the resulting groups are at most `maxLength` characters
 * long.
 */
function group (
  strings: string[],
  separator = '\n\n',
  maxLength = 4096
): string[] {
  const groups: string[] = []
  for (const string of strings) {
    if (groups.length === 0) {
      groups.push(string)
      continue
    }
    const newGroup = groups[groups.length - 1] + separator + string
    if (newGroup.length > maxLength) {
      groups.push(string)
    } else {
      groups[groups.length - 1] = newGroup
    }
  }
  return groups
}

export async function showReport (message: Message, [fileName]: string[]) {
  if (!fileName) {
    fileName = (await getFileNames())[0]
  } else if (!fileName.endsWith('.pdf')) {
    fileName += '.pdf'
  }
  try {
    const descriptions = group(display(await getReports(fileName)))
    for (const [i, description] of descriptions.entries()) {
      const msg: BaseMessageOptions = {
        content:
          i === 0
            ? select([
              'oh look i did that',
              'my bad',
              'what did u do this time'
            ])
            : '',
        embeds: [
          {
            title:
              descriptions.length === 1
                ? fileName
                : `${fileName} (${i + 1}/${descriptions.length})`,
            url: BASE_URL + encodeURIComponent(fileName),
            description
          }
        ]
      }
      if (i === 0) {
        await message.reply(msg)
      } else {
        await message.channel.send(msg)
      }
    }
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
    // Show oldest report first; display other reports if any later on
    const fileName = unseen.at(-1)
    if (!fileName) {
      return
    }
    const descriptions = group(display(await getReports(fileName)))
    const embeds = descriptions.map(
      (description, i): APIEmbed => ({
        title:
          descriptions.length === 1
            ? fileName
            : `${fileName} (${i + 1}/${descriptions.length})`,
        url:
          BASE_URL +
          encodeURIComponent(fileName) +
          (i === 0 ? '' : `#${i + 1}`),
        description,
        footer:
          i === descriptions.length - 1
            ? {
              text: 'To turn off, reply "i renounce my life of crime"'
            }
            : undefined
      })
    )
    seen.set(fileName, 1)
    await seen.save()
    for (const [channelId] of channels) {
      const channel = await client.channels.fetch(channelId)
      if (!channel?.isTextBased()) {
        continue
      }
      for (const [i, embed] of embeds.entries()) {
        const embeds = [embed]
        if (unseen.length > 1 && i === descriptions.length - 1) {
          embeds.push({
            title: 'Multiple crime logs just dropped',
            description: `Reply \`florida man:\` followed by the date:\n${unseen.join(
              '\n'
            )}`
          })
        }
        await channel.send({
          content:
            i === 0
              ? select([
                'who did this',
                'exposed',
                'did u do this',
                'this reminds me of u',
                'inspirational 😍',
                'live love LIE',
                'i knew its not the trolley its YOU'
              ])
              : '',
          embeds
        })
      }
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
