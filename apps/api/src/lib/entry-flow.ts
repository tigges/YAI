export interface EntryCandidate {
  publishedAt: Date | null
  flow: { name: string; tags: string[] }
}

const ENTRY_NAMES = new Set(['Welcome & Routing', 'Product welcome'])

export function isEntryFlow(flow: { name: string; tags: string[] }): boolean {
  return flow.tags.includes('welcome') || ENTRY_NAMES.has(flow.name)
}

/** Prefer the newest published welcome flow. Other published flows are destinations. */
export function pickEntry<T extends EntryCandidate>(versions: T[]): T | undefined {
  const sorted = [...versions].sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
  return sorted.find((version) => isEntryFlow(version.flow)) ?? sorted[0]
}
