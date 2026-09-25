export interface VisitorTurn {
  /** Text the published flow reads. */
  text: string
  /** An opening greeting has no visitor line in the transcript. */
  showVisitor: boolean
}

/**
 * A normal message is shown and answered.
 * Opening the chat, with no message yet, is read as hello so the flow can greet.
 */
export function visitorTurn(input: { message?: string; opening?: boolean }): VisitorTurn | null {
  const message = (input.message ?? '').trim()
  if (message) return { text: message, showVisitor: true }
  if (input.opening) return { text: 'hi', showVisitor: false }
  return null
}
