// From https://github.com/SheepTester/ucsd-event-scraper/blob/main/explore/police/parse.ts

import { Message } from 'discord.js'
import { getDocument, VerbosityLevel } from 'pdfjs-dist'
import select from '../utils/select'

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
    await message.reply({
      content: select([
        'oh look i did that',
        'my bad',
        'what did u do this time'
      ]),
      embeds: [
        {
          title: fileName,
          description: display(await getReports(fileName))
        }
      ]
    })
  } catch (error) {
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
        }
      ]
    })
  }
}
