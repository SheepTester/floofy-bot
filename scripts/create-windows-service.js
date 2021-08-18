const { Service } = require('node-windows')
const path = require('path')

const svc = new Service({
  name: 'Floofy Bot',
  script: path.resolve(__dirname, '../index.js')
})

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', () => {
  svc.start()
})

svc.install()
