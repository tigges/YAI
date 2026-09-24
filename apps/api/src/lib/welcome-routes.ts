import { prisma } from '@ybot/db'
import { DRAFT_RECIPES } from './draft-flows.js'

interface RouteConfig {
  handle: string
  phrases: string[]
  flowName?: string
}

interface GraphNode {
  id: string
  type?: string
  position?: { x: number; y: number }
  data: { kind: string; label: string; config: Record<string, unknown> }
}

interface GraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
}

interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

function handleFor(flowName: string): string {
  return flowName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function destinationPhrases(flowName: string): string[] | undefined {
  return DRAFT_RECIPES.find((recipe) => recipe.name === flowName)?.phrases
}

/** Add a handoff to a published flow. Returns false when the welcome graph has no router yet. */
export function withDestination(graph: Graph, flowName: string, phrases: string[]): Graph | null {
  if (!graph.nodes.some((node) => node.data.kind === 'route_topic')) return null
  const handle = handleFor(flowName)
  const nodes = graph.nodes.map((node) => {
    if (node.data.kind !== 'route_topic') return node
    const routes = [...((node.data.config['routes'] as RouteConfig[] | undefined) ?? [])]
    if (routes.some((route) => route.flowName === flowName || route.handle === handle)) return node
    return {
      ...node,
      data: {
        ...node.data,
        config: { ...node.data.config, routes: [...routes, { handle, phrases, flowName }] },
      },
    }
  })
  const execId = `go-${handle}`
  if (!nodes.some((node) => node.id === execId)) {
    nodes.push({
      id: execId,
      type: 'flow-node',
      position: { x: 1100, y: 40 },
      data: { kind: 'execute_flow', label: flowName, config: { flowName } },
    })
  }
  const edges = [...graph.edges]
  for (const node of nodes) {
    if (node.data.kind !== 'route_topic') continue
    if (edges.some((edge) => edge.source === node.id && edge.sourceHandle === handle)) continue
    edges.push({ id: `${node.id}-${handle}`, source: node.id, target: execId, sourceHandle: handle })
  }
  return { nodes, edges }
}

/**
 * After a person publishes a suggested flow, the welcome flow in that
 * environment learns the handoff. A second call changes nothing.
 */
export async function attachDestination(botId: string, environmentId: string, flowName: string): Promise<boolean> {
  const phrases = destinationPhrases(flowName)
  if (!phrases) return false
  const welcome = await prisma.flowVersion.findFirst({
    where: {
      status: 'published',
      environmentId,
      flow: { botId, OR: [{ tags: { has: 'welcome' } }, { name: 'Welcome & Routing' }, { name: 'Product welcome' }] },
    },
    include: { flow: true },
    orderBy: { publishedAt: 'desc' },
  })
  if (!welcome) return false
  const current = welcome.graph as unknown as Graph
  const handle = handleFor(flowName)
  const present = current.nodes.some((node) => node.data.kind === 'route_topic' && ((node.data.config['routes'] as RouteConfig[] | undefined) ?? []).some((route) => route.flowName === flowName || route.handle === handle))
  if (present) return false
  const next = withDestination(current, flowName, phrases)
  if (!next) return false
  const latest = await prisma.flowVersion.findFirst({
    where: { flowId: welcome.flowId },
    orderBy: { version: 'desc' },
  })
  const version = (latest?.version ?? welcome.version) + 1
  await prisma.flowVersion.create({
    data: {
      tenantId: welcome.tenantId,
      flowId: welcome.flowId,
      version,
      status: 'published',
      environmentId,
      graph: next as object,
      publishedAt: new Date(),
    },
  })
  return true
}
