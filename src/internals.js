const { exec } = require('child_process')
const { Message } = require('discord.js')
const select = require('./utils/select')

function execute (command) {
  return new Promise(resolve => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr })
    })
  })
}

function displayResults (results) {
  return results
    .map(result => (result ? '```sh\n' + result + '\n```' : '👌'))
    .join('\n')
}

module.exports.exit = async message => {
  if (message.author.id === process.env.OWNER) {
    /** @type {Message} */
    const msg = await message.reply(
      select(['okay BYE', 'i go POOF now', 'weeee'])
    )
    console.log('Restarting')
    const results = []

    async function reportExec (command) {
      const { error, stdout, stderr } = await execute(command)
      results.push(`$ ${command}`, stdout, stderr)
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
