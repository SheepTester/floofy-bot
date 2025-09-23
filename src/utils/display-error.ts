export function displayError (error: unknown, maxLength = 1800): string {
  if (error instanceof Error) {
    return (error.stack ?? `${error.name}: ${error.message}`).slice(
      0,
      maxLength
    )
  } else {
    return `unknown error ${String(error)}`
  }
}
