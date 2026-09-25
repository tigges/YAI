/** Words for a failed response. A gateway 502 has no JSON body. */
export function messageForStatus(status: number, body?: { message?: string }): string {
  if (body?.message) return body.message
  if (status === 502 || status === 503 || status === 504) {
    return 'The server is not responding. Try again in a moment.'
  }
  return `The request failed (HTTP ${status}).`
}
