const fs = require('fs-extra')

module.exports = class CachedMap {
  #path
  #object

  constructor (path) {
    this.#path = path
  }

  read = async () => {
    this.#object = JSON.parse(await fs.readFile(this.#path, 'utf-8').catch(() => '{}'))
  }

  has (id) {
    return Object.prototype.hasOwnProperty.call(this.#object, id)
  }

  get (id, defaultValue = undefined) {
    return this.has(id) ? this.#object[id] : defaultValue
  }

  set (id, value) {
    this.#object[id] = value
    return this
  }

  async save () {
    await fs.writeFile(this.#path, JSON.stringify(this.#object, null, '\t'))
  }
}
