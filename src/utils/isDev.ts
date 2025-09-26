export let isDev = false

try {
  require('node-windows')
} catch {
  isDev = true
}
