export function displayError (error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`
  } else {
    return `unknown error ${String(error)}`
  }
}
