import fs from 'fs-extra'

export default class CachedMap<T> {
  #path: string
  #object: Record<string, T> = {}

  constructor (path: string) {
    this.#path = path
  }

  read = async (): Promise<void> => {
    this.#object = await fs
      .readFile(this.#path, 'utf-8')
      .then(json => (json === '' ? {} : JSON.parse(json)))
      .catch(err => (err.code === 'ENOENT' ? {} : Promise.reject(err)))
  }

  has (id: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.#object, id)
  }

  get (id: string | undefined): T | undefined
  get (id: string | undefined, defaultValue: T): T
  get (id: string | undefined, defaultValue?: T): T | undefined {
    if (id === undefined) {
      return defaultValue
    }
    return this.has(id) ? this.#object[id] : defaultValue
  }

  set (id: string, value: T): this {
    this.#object[id] = value
    return this
  }

  async save (): Promise<void> {
    await fs.writeFile(this.#path, JSON.stringify(this.#object, null, '\t'))
  }
}
