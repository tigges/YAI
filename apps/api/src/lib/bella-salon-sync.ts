import { graphAction } from './copy-graphs.js'

/** The retail starter welcome. Bella's public page should not speak it. */
export function isShopWelcomeGraph(name: string, graph: unknown): boolean {
  if (name !== 'Welcome & Routing') return false
  const text = JSON.stringify(graph).toLowerCase()
  return text.includes('billing') && (text.includes('return') || text.includes('order'))
}

/**
 * Environments whose published copy is missing or older than the pack graph.
 * The caller publishes a new version there and leaves a matching copy alone.
 */
export function environmentsNeedingGraph(
  graph: unknown,
  published: Array<{ environmentId: string; graph: unknown }>,
  environmentIds: string[],
): string[] {
  return environmentIds.filter((environmentId) => {
    const current = published.find((item) => item.environmentId === environmentId)
    return graphAction(current?.graph ?? null, graph) !== 'keep'
  })
}
