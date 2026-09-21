/**
 * Build-time version constants injected by vite.config.ts.
 * At runtime these are replaced with literal strings — zero runtime cost.
 */

export interface AppBuildInfo {
  version:     string   // semver from package.json, e.g. "1.1.0"
  buildNumber: string   // CI run number, e.g. "42"; "local" in dev
  gitSha:      string   // short git SHA, e.g. "abc1234"; "dev" in local
  buildDate:   string   // ISO-8601 date, e.g. "2026-09-21T06:39:00Z"
}

export const buildInfo: AppBuildInfo = {
  version:     __APP_VERSION__,
  buildNumber: __BUILD_NUMBER__,
  gitSha:      __GIT_SHA__,
  buildDate:   __BUILD_DATE__,
}

/** Short label for compact display: "v1.1.26" (patch = build number) */
export function shortVersion(): string {
  const suffix = buildInfo.buildNumber === 'local' ? '-dev' : ''
  return `v${buildInfo.version}${suffix}`
}

/** Full label for tooltip: "v1.1.26 · abc1234 · 2026-09-21" */
export function fullVersion(): string {
  const date = buildInfo.buildDate ? new Date(buildInfo.buildDate).toLocaleDateString() : ''
  const sha  = buildInfo.gitSha !== 'dev' ? ` · ${buildInfo.gitSha.slice(0, 7)}` : ''
  return `v${buildInfo.version}${sha}${date ? ' · ' + date : ''}`
}
