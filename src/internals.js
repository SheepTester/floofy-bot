const { exec } = require('child_process')
const { Message } = require('discord.js')
const select = require('./utils/select')

function execute (command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

function displayResults (results) {
  return results
    .map(result => (result ? '```\n' + result + '\n```' : '👌'))
    .join('\n')
}

module.exports.exit = async message => {
  if (message.author.id === process.env.OWNER) {
    /** @type {Message} */
    const msg = await message.lineReply(
      select(['okay BYE', 'i go POOF now', 'weeee'])
    )
    const gitPullResult = await execute('git pull')
    await msg.edit(displayResults([gitPullResult.stdout, gitPullResult.stderr]))
    const npmInstallResult = await execute('npm install')
    await msg.edit(
      displayResults([
        gitPullResult.stdout,
        gitPullResult.stderr,
        npmInstallResult.stdout,
        npmInstallResult.stderr
      ])
    )
    process.exit()
  } else {
    await message.lineReply(
      select([
        'shoo',
        `you are not <@${process.env.OWNER}>`,
        'out of here commoner',
        'scram plebian'
      ])
    )
  }
}
