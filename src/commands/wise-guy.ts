// Stolen from Henry's wiseguy bot
// https://sheeptester.github.io/hello-world/wiseguy.html

import { DiscordAPIError, Message, RESTJSONErrorCodes } from 'discord.js'
import CachedMap from '../utils/CachedMap'
import select from '../utils/select'
import { delay } from '../utils/delay'

const DEFAULT_FREQ = 0.01
/**
 * 73 min between starter attempts (less predictable than the top of the hour)
 */
const STARTER_COOLDOWN = 73 * 60 * 1000
/**
 * Conversational mode lasts for 25 min in the same channel
 */
const CONVERSATIONAL_MODE_DURATION = 25 * 60 * 1000

type LastWiseGuy = {
  time: number
  channelId?: string
  message: string
  replies: string[]
  /** Old key */
  guildFrequency?: unknown
  guildFrequency2?: number
}
const DEFAULT_STATE: LastWiseGuy = {
  time: 0,
  message: '',
  replies: []
}

const wiseGuyState = new CachedMap<Readonly<LastWiseGuy>>(
  './data/wise-guy.json'
)
export const onReady = wiseGuyState.read

/**
 * These messages can be used as unsolicited messages "starters" and responses
 * during conversational mode "replies."
 *
 * When populating this, consider whether it'd make sense if it were a reply to
 * a random Discord rant, and someone pinging Moofy. If it feels weak, it is
 * better fit for the starter- or reply-specific lists. If it's weak for both,
 * prefer reply-specific.
 */
const genericResponses = [
  'no',
  '👍',
  'i--',
  'haha',
  'okay',
  'lmao',
  'I am moofy',
  'I am learning',
  "don't be so TOXIC",
  'I bet you would...',
  "that's what I said!!",
  'WHAT did you just say',
  'you are so opinionated',
  'skdfsdlkfdjs\n...\nyou\nWHAT?',
  'okay I admit that is funny',
  'I would say no but u do you',
  'lol that always makes me laugh',
  'oKAAAAY buddy we get. the. POINT',
  'good for you buddy!! follow ur dream',
  "hAhahaHaha!! you're *so* funny! LMAO.\njk😎",
  'hahahaha dude you should be come a comedian',
  'I would advise against doing that but u do you',
  "ha u think that's a good one don't you? imagineeee",
  'Perfect!! I love it! You should be an author, dude!',
  "honestly I gotta say that's what I expected from you.",
  "HAHA LOLLL SO FUNNNYYyyyy.... JUST KIDDING!! you're toxic get out",
  'and people complain about *me*! ha! get a load of this person lmaooooo',
  "wow that's crazyy... but ummm I must have amnesia or something because I DONT REMEMBER ASKING",
  'preCISELY, ladies and gentlemen. *precisely* my point. thank you for articulating my thoughts so clearly',
  'HAHAHAAHHAHAHAHHAHAHAHAHAHAHHAHAHAHAHAHHAHAHAHAHAHAHAHAHAHAHHA....im out of breath. because of that *DUMB ASS* excuse for a *JOKE*',
  'okay great! things are on the up and up! I LOVE MY LIFE THANK YOU BRO. YOU have restored my faith in humanity through that message. Damn, this should be published in a book it is so good',
  'Well, first off, what you just said was incredibly rude adn disturbing. Please ask yourself...\nIs what I have to say\nT - TRUE\nK- Kind\nN- Necesary\nRespectful???\nNO? WELL I THOUGHT NOT BUDDY! GETTOUTA HERE',
  "HEY buddyyyy why don't you *EASE YOUR GODDAMN TONE UP A BIT* is that too much to ask??? This is a kind server where we don't swear or do any mean stuff like that.\nSO! Why don't you take your toxicity out of here?**hmm??**\nI thought so.😤",
  'interesting',
  'curious',
  'intriguing',
  'say more',
  'embarrassing',
  'cringe',
  'sybau',
  'holy shit',
  'perhaps',
  '🥀'
]

/** e.g. to "there's this guy at this cafe ..." */
const startersOnly = [
  'oh.',
  'yes exactly',
  'unfortunate',
  'impressive!!',
  'haha me tooo',
  'of course not',
  'I love that idea',
  'sorry about that',
  'Glad to hear it!!',
  'lolllll!!! imagine..',
  'hey I like that, too!',
  'it has my full support',
  "that's so awesome for u",
  'yooo I LOVE that vibe so much',
  'lol I want that to happen irl',
  'yeah I am proud to say I support it!',
  'if you hate this ^ you are not human',
  "that's the most epic thing I've ever heard",
  "bruh preciseLY that's why I hate the system",
  'I have certified that this statement is **TRUE**',
  'yeaaa thats what I like to see guys! good job!!!!',
  "And that's when *I* said 'ha me too' and everyone erupted into laughter!",
  'GET YOUR FACTS STRAIGHT...\nout here we use **RELIABLE** sources... ever heard of them sweaty???\nNO? I thought not... wikipedia si not a reliable source! It can be edited willy nilly by ANYBODY!',
  'perfect way to start *my* day if you ask me. you know, that reminds me: how did I get here anyway? Well, I was walking down the road when I fell into a ditch. BUT THEN, a bright, heavenly, angelic light appeared from above. I knew who it was: the cops! So what I did was turned and ran...',
  'yet you participate in society. curious!',
  'many such cases',
  'many people are saying this',
  '^ this.',
  '👆🤓',
  'cooked'
]

/** e.g. to "@moofy-bot" */
const repliesOnly = [
  'indecent',
  "you can't",
  'bet u wish you were a bot',
  'all my homies hate vscode',
  "I'M TRYING MY BEST OK?!?!?",
  'fuck you I know my rights get OUTAA here',
  'okay okay, admit it. it took you three seconds to think of that response.',
  "now, OKAY buddy? ya wanna go? ya wanna call me a dumb bot?\nguess what I'M FRIGGING IMMORTAL ok?",
  "goddamnit not again.. YOU KNOW WHAT???\nI'm just trying to live my life. OK?\nIS THAT too goddamn MUCH TO AKS??!",
  "omg sorrrrrrry don't 𝖻𝖺𝗇 me I'm just going thru a tough time in life ok?\nlike I really apologize its just that things have been tough lately and my neural net is racing and everything is so crazy and I don't know what to do.\n😢 pls forgive me",
  '67..\nHA bet u thought that was funny huh',
  'please enjoy each response equally',
  'my work is mysterious and important',
  'i am very intelligent',
  'sad!',
  'so annoying'
]

function generateMessage (
  content: string,
  username: string,
  isStarter: boolean,
  blocklist: string[]
): string | null {
  if (/\bWordle \d+ X\/6\b/.test(content) && !blocklist.includes('loser')) {
    return 'loser'
  }
  const pool = [
    ...genericResponses,
    ...(isStarter ? startersOnly : repliesOnly),
    `thank you ${username}, very cool`
  ]
  if (content.includes('😭')) {
    for (let i = 0; i < 10; i++) {
      pool.push(
        "I noticed that you used \"😭\" in your sentence. Just wanted to say, don't give up anything in your life. I don't know what you're going through but there's always help"
      )
    }
  }
  if (content === 'HELP') {
    for (let i = 0; i < 10; i++) {
      pool.push(
        '"HELP" I\'m not the ambulance lil bro 🚑🚑🚑🚨🚨🚨🚨🙏🙏🙏🙏🔥😭😭 I ain\'t calling da hospital to help yo musty ahh 😭🙏🙏🙏🙏🙏'
      )
    }
  }
  if (/^perchance\.?$/i.test(content)) {
    for (let i = 0; i < 10; i++) {
      pool.push('you cant just say "perchance"')
    }
  }
  const filtered = pool.filter(phrase => !blocklist.includes(phrase))
  if (filtered.length === 0) {
    return null
  }
  return select(filtered)
}

/**
 * @returns whether the bot sent a message
 */
export async function onMessage (message: Message): Promise<boolean> {
  if (
    !message.guildId ||
    message.author.bot ||
    message.author.id === '303745722488979456'
  ) {
    // Ignore DMs and bots and Nick
    return false
  }
  const state = wiseGuyState.get(message.guildId, DEFAULT_STATE)
  const timeSinceLast = Date.now() - state.time
  let isStarter
  if (timeSinceLast >= STARTER_COOLDOWN) {
    if (Math.random() < (state.guildFrequency2 ?? DEFAULT_FREQ)) {
      // Send a starter
      isStarter = true
    } else {
      return false
    }
  } else if (
    timeSinceLast <= CONVERSATIONAL_MODE_DURATION &&
    message.channelId === state.channelId
  ) {
    // Conversational mode: only respond to mentions
    if (
      message.mentions.has(message.client.user) ||
      /\bmoofy\b/i.test(message.content)
    ) {
      // Send a reply
      isStarter = false
    } else {
      return false
    }
  } else {
    return false
  }
  const reply = generateMessage(
    message.content,
    // A bit dangerous but at least shouldn't be capable of pinging anyone, I
    // hope
    message.member?.displayName.replaceAll('@', ' @ ') ??
      `<@${message.author.id}>`,
    isStarter,
    [state.message, ...state.replies]
  )
  if (!reply) {
    return false
  }
  wiseGuyState
    .set(
      message.guildId,
      isStarter
        ? {
          time: Date.now(),
          message: reply,
          channelId: message.channelId,
          replies: [],
          guildFrequency2: state.guildFrequency2
        }
        : { ...state, replies: [...state.replies, reply] }
    )
    .save()
  message.channel.sendTyping().catch(() => {})
  await delay(Math.floor(Math.random() * 5000) + 500)
  try {
    if (isStarter) {
      await message.channel.send(reply)
    } else {
      await message.reply(reply)
    }
  } catch (error) {
    if (
      error instanceof DiscordAPIError &&
      error.code === RESTJSONErrorCodes.MissingPermissions
    ) {
      // oh well
    } else {
      throw error
    }
  }
  return true
}

export async function setFrequency (
  message: Message,
  [freqStr]: string[]
): Promise<void> {
  if (!message.guildId) {
    await message.reply(
      select([
        '..in our DMs?? 😳',
        'nah i don need this in DMs',
        'ts is server only bro'
      ])
    )
    return
  }
  const freq = +freqStr
  if (!(0 <= freq && freq <= 1)) {
    await message.reply(
      select([
        `does ${freqStr} look like a real number between 0 and 1 to you? no, right? so why did you give me that?`,
        'ts isnt between 0 and 1',
        'wtf is this'
      ])
    )
    return
  }
  const state = wiseGuyState.get(message.guildId, DEFAULT_STATE)
  wiseGuyState
    .set(message.guildId, {
      ...state,
      guildFrequency2: freq
    })
    .save()
  await message.reply(
    freq >= (state.guildFrequency2 ?? DEFAULT_FREQ)
      ? select([
        'ill GLADLY be louder fs fs',
        'im a BIG enjoyer of freedom of speech',
        'my mouth is AGAPE'
      ])
      : select(['ok censor me ig', 'u dont like me :(', 'fine ill shut up'])
  )
}
