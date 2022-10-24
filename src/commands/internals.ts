import { exec } from 'child_process'
import { Message } from 'discord.js'
import select from '../utils/select'

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
    .map(result => (result ? '```sh\n' + result + '\n```' : '👌'))
    .join('\n')
}

export async function exit (message: Message): Promise<void> {
  if (message.author.id === process.env.OWNER) {
    const msg = await message.reply(
      select(['okay BYE', 'i go POOF now', 'weeee'])
    )
    console.log('Restarting')
    const results: Results = []

    async function reportExec (command: string) {
      results.push(`$ ${command}`)
      await msg.edit(displayResults(results))
      const { error, stdout, stderr } = await execute(command)
      results.push(stdout, stderr)
      if (error) {
        results.push(error?.stack)
      }
      await msg.edit(displayResults(results))
      if (error) {
        throw error
      }
    }

    await reportExec('git checkout -- package-lock.json')
    await reportExec('git pull')
    await reportExec('npm install')
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
