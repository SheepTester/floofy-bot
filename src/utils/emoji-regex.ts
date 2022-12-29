import emojiList from './emoji.json'

export const emojiRegex = new RegExp(
  `<a?:\\w+:(\\d+)>|${emojiList.join('|').replace(/[+*]/g, m => '\\' + m)}`,
  'g'
)
