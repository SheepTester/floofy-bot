export function displayBytes (bytes: number): string {
  if (bytes < 1e3) {
    return `${bytes} B`
  }
  if (bytes < 1e6) {
    return `${(bytes / 1e3).toPrecision(3)} kB`
  }
  if (bytes < 1e9) {
    return `${(bytes / 1e6).toPrecision(3)} MB`
  }
  return `${(bytes / 1e9).toPrecision(3)} GB`
}
