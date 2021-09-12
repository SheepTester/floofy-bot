const fs = require('fs-extra')

/**
 * @template T
 */
module.exports = class CachedMap {
  #path
  /** @type {T} */
  #object

  /**
   * @param {string} path
   */
  constructor (path) {
    this.#path = path
  }

  read = async () => {
    this.#object = await fs
      .readFile(this.#path, 'utf-8')
      .then(json => (json === '' ? {} : JSON.parse(json)))
      .catch(err => (err.code === 'ENOENT' ? {} : Promise.reject(err)))
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  has (id) {
    return Object.prototype.hasOwnProperty.call(this.#object, id)
  }

  /**
   * @type {<V = undefined>(id: string, defaultValue: V) => T | V}
   */
  get (id, defaultValue = undefined) {
    return this.has(id) ? this.#object[id] : defaultValue
  }

  /**
   * @param {string} id
   * @param {T} value
   * @returns {this}
   */
  set (id, value) {
    this.#object[id] = value
    return this
  }

  async save () {
    await fs.writeFile(this.#path, JSON.stringify(this.#object, null, '\t'))
  }
}
