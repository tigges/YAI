/**
 * The Acme walkthrough looks up one sample order without calling the sample shop.
 * Any other number still uses the sample address, which fails and hands over.
 */

export const SAMPLE_ORDER_NUMBER = '1001'
export const SAMPLE_ORDER_REPLY = 'Order 1001 is on its way. It shipped this morning.'
export const SAMPLE_ORDER_QUESTION = 'Please share your order number. The sample order is 1001.'

interface GraphNode {
  id: string
  type?: string
  position?: { x: number; y: number }
  data?: { kind?: string; label?: string; config?: Record<string, unknown> }
}

interface GraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
}

interface OrderGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

function isSampleLookup(node: GraphNode): boolean {
  const url = String(node.data?.config?.['url'] ?? '')
  return node.data?.kind === 'http_request' && url.includes('api.acme.com/orders/')
}

export function withSampleOrder<T extends OrderGraph>(graph: T): { graph: T; changed: boolean } {
  const branched = addSampleBranch(graph)
  const asked = mentionSampleOrder(branched.graph)
  return { graph: asked.graph, changed: branched.changed || asked.changed }
}

function addSampleBranch<T extends OrderGraph>(graph: T): { graph: T; changed: boolean } {
  const nodes = graph.nodes ?? []
  const edges = graph.edges ?? []
  if (nodes.some((node) => node.id === 'sample-order')) return { graph, changed: false }
  const http = nodes.find(isSampleLookup)
  if (!http) return { graph, changed: false }
  const incoming = edges.find((edge) => edge.target === http.id)
  if (!incoming) return { graph, changed: false }

  const x = http.position?.x ?? 480
  const y = http.position?.y ?? 120
  const nodeType = http.type ?? 'flow-node'
  const end = nodes.find((node) => node.data?.kind === 'end_flow')
  const sampleCheck: GraphNode = {
    id: 'sample-order',
    type: nodeType,
    position: { x, y },
    data: {
      kind: 'condition',
      label: 'Sample order?',
      config: { conditions: [{ field: 'order_number', operator: 'equals', value: SAMPLE_ORDER_NUMBER }] },
    },
  }
  const sampleReply: GraphNode = {
    id: 'sample-reply',
    type: nodeType,
    position: { x: x + 220, y: y - 140 },
    data: { kind: 'send_message', label: 'Sample order', config: { text: SAMPLE_ORDER_REPLY } },
  }
  const nextEdges: GraphEdge[] = edges.map((edge) => (
    edge.id === incoming.id ? { ...edge, target: 'sample-order' } : edge
  ))
  nextEdges.push(
    { id: 'e-sample-yes', source: 'sample-order', target: 'sample-reply', sourceHandle: 'yes' },
    { id: 'e-sample-no', source: 'sample-order', target: http.id, sourceHandle: 'no' },
  )
  if (end) nextEdges.push({ id: 'e-sample-end', source: 'sample-reply', target: end.id })

  const shifted = nodes.map((node) => {
    if (node.id !== http.id || !node.position) return node
    return { ...node, position: { x: node.position.x + 220, y: node.position.y + 140 } }
  })

  return {
    changed: true,
    graph: { ...graph, nodes: [...shifted, sampleCheck, sampleReply], edges: nextEdges },
  }
}

function mentionSampleOrder<T extends OrderGraph>(graph: T): { graph: T; changed: boolean } {
  let changed = false
  const nodes = (graph.nodes ?? []).map((node) => {
    if (node.data?.kind !== 'ask_question') return node
    if (node.data.config?.['variable'] !== 'order_number') return node
    const question = String(node.data.config?.['question'] ?? '')
    if (question.includes(SAMPLE_ORDER_NUMBER)) return node
    changed = true
    return {
      ...node,
      data: {
        ...node.data,
        config: { ...node.data.config, question: SAMPLE_ORDER_QUESTION },
      },
    }
  })
  if (!changed) return { graph, changed: false }
  return { graph: { ...graph, nodes }, changed: true }
}
