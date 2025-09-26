export let isDev = false
// TEMP until i work out why prod thinks it's dev
export let proofOfDevness = ''

try {
  require('node-windows')
} catch (error) {
  isDev = true
  proofOfDevness = (error instanceof Error && error.stack) || String(error)
}
