/** The widget asks for a rating only after the published flow has finished. */
export function streamDoneEvent(ended: boolean | undefined): { done: true; ended?: true } {
  return ended ? { done: true, ended: true } : { done: true }
}
