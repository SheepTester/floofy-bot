const fs = require('fs-extra')

module.exports = class CachedMap {
  #path
  #object

  constructor (path) {
    this.#path = path
  }

  read = async () => {
    this.#object = await fs
      .readFile(this.#path, 'utf-8')
      .then(json => (json === '' ? {} : JSON.parse(json)))
      .catch(err => (err.code === 'ENOENT' ? {} : Promise.reject(err)))
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
