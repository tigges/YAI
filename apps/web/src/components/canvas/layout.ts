/** Positions for a flow graph. Handles sit on the top and bottom of each node, so a tidy graph reads top to bottom. */

export interface LayoutNode {
  id: string
  position: { x: number; y: number }
  data?: object
}

export interface LayoutEdge {
  source: string
  target: string
}

const COL_W = 240
const ROW_H = 130

function kindOf(node: LayoutNode): string {
  const data = node.data as { kind?: string } | undefined
  return data?.kind ?? ''
}

/** Spread each step of the flow onto its own row, with branches side by side. */
export function tidyLayout<T extends LayoutNode>(nodes: T[], edges: LayoutEdge[]): T[] {
  if (nodes.length === 0) return nodes
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()
  for (const node of nodes) {
    outgoing.set(node.id, [])
    incoming.set(node.id, [])
  }
  for (const edge of edges) {
    if (!outgoing.has(edge.source) || !incoming.has(edge.target)) continue
    outgoing.get(edge.source)!.push(edge.target)
    incoming.get(edge.target)!.push(edge.source)
  }

  const roots = nodes.filter((node) => (incoming.get(node.id)?.length ?? 0) === 0)
  const start =
    roots.find((node) => kindOf(node) === 'trigger_start' || kindOf(node) === 'start') ??
    roots[0] ??
    nodes[0]!

  const rank = new Map<string, number>()
  const walking = new Set<string>()
  function walk(id: string, depth: number) {
    const previous = rank.get(id)
    if (previous !== undefined && previous >= depth) return
    if (walking.has(id)) return
    walking.add(id)
    rank.set(id, depth)
    for (const next of outgoing.get(id) ?? []) walk(next, depth + 1)
    walking.delete(id)
  }
  walk(start.id, 0)
  for (const node of nodes) {
    if (!rank.has(node.id)) rank.set(node.id, 0)
  }

  const rows = new Map<number, string[]>()
  for (const node of nodes) {
    const row = rank.get(node.id) ?? 0
    const list = rows.get(row) ?? []
    list.push(node.id)
    rows.set(row, list)
  }

  const placed = new Map<string, { x: number; y: number }>()
  const rowIndexes = [...rows.keys()].sort((a, b) => a - b)
  for (const row of rowIndexes) {
    const ids = rows.get(row) ?? []
    ids.sort((a, b) => {
      const parentA = incoming.get(a)?.[0]
      const parentB = incoming.get(b)?.[0]
      return (placed.get(parentA ?? '')?.x ?? 0) - (placed.get(parentB ?? '')?.x ?? 0)
    })
    ids.forEach((id, index) => {
      placed.set(id, { x: index, y: 48 + row * ROW_H })
    })
  }

  let widest = 1
  for (const ids of rows.values()) widest = Math.max(widest, ids.length)
  const width = widest * COL_W
  for (const row of rowIndexes) {
    const ids = rows.get(row) ?? []
    const rowWidth = ids.length * COL_W
    const offset = (width - rowWidth) / 2
    ids.forEach((id, index) => {
      const point = placed.get(id)
      if (point) point.x = 48 + offset + index * COL_W
    })
  }

  return nodes.map((node) => {
    const point = placed.get(node.id)
    return point ? { ...node, position: point } : node
  })
}

/** One horizontal line, left to right, keeping the current left-to-right order. */
export function alignHorizontal<T extends LayoutNode>(nodes: T[]): T[] {
  const order = [...nodes].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
  const index = new Map(order.map((node, i) => [node.id, i]))
  return nodes.map((node) => ({
    ...node,
    position: { x: 48 + (index.get(node.id) ?? 0) * COL_W, y: 80 },
  }))
}

/** One vertical line, top to bottom, keeping the current top-to-bottom order. */
export function alignVertical<T extends LayoutNode>(nodes: T[]): T[] {
  const order = [...nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
  const index = new Map(order.map((node, i) => [node.id, i]))
  return nodes.map((node) => ({
    ...node,
    position: { x: 80, y: 40 + (index.get(node.id) ?? 0) * ROW_H },
  }))
}
