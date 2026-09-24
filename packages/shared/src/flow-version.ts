export interface ListedVersion {
  version: number
  status: string
  environmentId?: string | null
}

/** Newest published version for one environment, plus the newest draft. */
export function versionsForEnvironmentList<T extends ListedVersion>(versions: T[]): T[] {
  const sorted = [...versions].sort((a, b) => b.version - a.version)
  const picked: T[] = []
  const seen = new Set<string>()
  let draft: T | undefined
  for (const version of sorted) {
    if (version.status === 'published' && version.environmentId) {
      if (seen.has(version.environmentId)) continue
      seen.add(version.environmentId)
      picked.push(version)
      continue
    }
    if (!draft && version.status !== 'published') draft = version
  }
  if (draft) picked.push(draft)
  return picked.sort((a, b) => b.version - a.version)
}

/**
 * The canvas and the connection check open this version.
 * Sandbox can show a draft. Production shows only a version published there.
 */
export function versionForEnvironment<T extends ListedVersion>(
  versions: T[] | undefined,
  environmentId: string | null | undefined,
  kind: string,
): T | undefined {
  const list = [...(versions ?? [])].sort((a, b) => b.version - a.version)
  if (list.length === 0 || !environmentId) return list[0]
  const published = list.find((item) => item.status === 'published' && item.environmentId === environmentId)
  if (published) return published
  if (kind === 'sandbox') return list.find((item) => item.status !== 'published')
  return undefined
}
