import { exec } from 'child_process'
import { Message } from 'discord.js'
import select from '../utils/select'
import { displayBytes } from '../utils/displayBytes'

type ExecutionResult = {
  // I don't know where `ExecException` comes from
  error: Parameters<NonNullable<Parameters<typeof exec>[2]>>[0]
  stdout: string
  stderr: string
}

function execute (command: string): Promise<ExecutionResult> {
  return new Promise(resolve => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr })
    })
  })
}

type Results = (string | undefined)[]

function displayResults (results: Results): string {
  return results
    .map(result => (result ? '```shell\n' + result + '\n```' : ''))
    .join('')
}

async function prepareUpdate (
  message: Message,
  results: Results
): Promise<void> {
  async function reportExec (command: string) {
    results.push(`$ ${command}`)
    await message.edit(displayResults(results))
    const { error, stdout, stderr } = await execute(command)
    results.push(stdout, stderr)
    if (error) {
      results.push(error?.stack)
    }
    await message.edit(displayResults(results))
    if (error) {
      throw error
    }
  }

  await reportExec('git checkout -- package-lock.json')
  await reportExec('git pull')
  await reportExec('npm install')
  await reportExec('npx playwright install firefox')
  await reportExec('npm run build')
}

export async function exit (message: Message): Promise<void> {
  if (message.author.id === process.env.OWNER) {
    const msg = await message.reply(
      select(['okay BYE', 'i go POOF now', 'weeee'])
    )
    const results: Results = []

    console.log('Restarting')
    prepareUpdate(msg, results)
    results.push('Exiting...')
    await msg.edit(displayResults(results))
    process.exit()
  } else {
    await message.reply(
      select([
        'shoo',
        `you are not <@${process.env.OWNER}>`,
        'out of here commoner',
        'scram plebian'
      ])
    )
  }
}

export async function softUpdate (message: Message): Promise<void> {
  if (message.author.id === process.env.OWNER) {
    const msg = await message.reply(select(['mmk', 'okie dokie', 'aight']))
    const results: Results = []

    console.log('Soft updating')
    prepareUpdate(msg, results)
    results.push('Done')
    await msg.edit(displayResults(results))
  } else {
    await message.reply(
      select([
        'shoo',
        `you are not <@${process.env.OWNER}>`,
        'out of here commoner',
        'scram plebian'
      ])
    )
  }
}

export async function memUsage (message: Message): Promise<void> {
  if (message.author.id !== process.env.OWNER) {
    await message.reply(
      select([
        'mmmmmmmmmmmmmmmmmmmmmm no.',
        'its too embarassing',
        'high probably',
        'ill HAVE you know i am VERY memory efficient for my age'
      ])
    )
    return
  }
  const { rss, heapUsed, heapTotal, external, arrayBuffers } =
    process.memoryUsage()
  await message.reply(
    `of total ${displayBytes(rss)}: heap ${displayBytes(
      heapTotal
    )} (${displayBytes(heapUsed)} used); C++ ${displayBytes(
      external
    )}; array buffers ${displayBytes(arrayBuffers)}`
  )
}
