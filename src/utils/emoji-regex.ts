import emojiList from './emoji.json'

// Match the longest surrogate sequence first
emojiList.sort((a, b) => b.length - a.length)

export const emojiRegex = new RegExp(
  `<a?:\\w+:(\\d+)>|${emojiList.join('|').replace(/[+*]/g, m => '\\' + m)}`,
  'g'
)
