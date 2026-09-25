/** The public Bella Hair Studio page. Old channel ids redirect here. */
export const BELLA_PUBLIC_CHANNEL = 'bella-web'

export interface DemoChannelTarget {
  channelId: string
  redirect: boolean
}

/**
 * The demo page is Bella's site. A live channel is used as-is.
 * A missing id opens the current Bella page when that channel is active.
 */
export function resolveDemoChannel(requestedId: string, activeIds: ReadonlySet<string>): DemoChannelTarget | null {
  if (activeIds.has(requestedId)) return { channelId: requestedId, redirect: false }
  if (activeIds.has(BELLA_PUBLIC_CHANNEL)) return { channelId: BELLA_PUBLIC_CHANNEL, redirect: true }
  return null
}
