/** Randomly select from a list */
module.exports = function select (list) {
  return list[Math.floor(Math.random() * list.length)]
}
