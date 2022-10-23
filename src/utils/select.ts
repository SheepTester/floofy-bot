/** Randomly select from a list */
export default function select<T> (list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}
