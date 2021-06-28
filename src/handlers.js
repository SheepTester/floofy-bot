import * as pollReactions from './poll-reactions.js'

export function ready () {
  return Promise.all([
    pollReactions.onReady
  ].map(ready => ready()))
}

export const handlers = [
  pollReactions.handleMessage
]
