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

/** Same label the app shows in the sidebar, from the image build. */
export function appBuildLabel(env: Record<string, string | undefined> = process.env): { short: string; title: string } {
  const version = env['APP_VERSION'] || '1.1.0'
  const build = env['APP_BUILD_NUMBER'] || 'local'
  const sha = (env['APP_GIT_SHA'] || 'dev').slice(0, 7)
  const short = build === 'local' ? `v${version}-dev` : `v${version}`
  const title = sha === 'dev' ? short : `${short} · ${sha}`
  return { short, title }
}
