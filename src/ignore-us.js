const select = require('./utils/select.js')

module.exports.ignoring = null

module.exports.ignore = async message => {
  if (message.author.id === process.env.OWNER) {
    const keyword = select([
      'moofy, revive!',
      'moofy, you can stop ignoring us now',
      'moofy, resuscitate.',
      'moofy, come back please'
    ])
    module.exports.ignoring = keyword
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
