import { graphKeepsLearning } from '@ybot/shared'
import { graphAction } from './copy-graphs.js'

/** The retail starter welcome. Bella's public page should not speak it. */
export function isShopWelcomeGraph(name: string, graph: unknown): boolean {
  if (name !== 'Welcome & Routing') return false
  const text = JSON.stringify(graph).toLowerCase()
  return text.includes('billing') && (text.includes('return') || text.includes('order'))
}

/**
 * Pack refresh skips an environment whose published chart already carries
 * a learning route. Other environments still receive the pack when their
 * published copy is missing or older.
 */
export function environmentsToRefresh(
  graph: unknown,
  published: Array<{ environmentId: string; graph: unknown }>,
  environmentIds: string[],
): string[] {
  const open = environmentIds.filter((environmentId) => {
    const current = published.find((item) => item.environmentId === environmentId)
    return !current || !graphKeepsLearning(current.graph)
  })
  return environmentsNeedingGraph(graph, published, open)
}

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
