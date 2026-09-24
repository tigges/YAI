export interface CopyVersion {
  version: number
  status: string
  environmentId: string | null
  graph: unknown
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as object).sort()) {
      sorted[key] = sortValue((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

export function sameGraph(left: unknown, right: unknown): boolean {
  return JSON.stringify(sortValue(left)) === JSON.stringify(sortValue(right))
}

export function publishedSource<T extends CopyVersion>(versions: T[], environmentId: string): T | undefined {
  return versions
    .filter((item) => item.status === 'published' && item.environmentId === environmentId)
    .sort((a, b) => b.version - a.version)[0]
}

export function graphAction(current: unknown | null, source: unknown): 'keep' | 'update' | 'create' {
  if (current == null) return 'create'
  return sameGraph(current, source) ? 'keep' : 'update'
}
