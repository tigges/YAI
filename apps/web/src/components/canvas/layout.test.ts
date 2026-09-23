import assert from 'node:assert/strict'
import { test } from 'node:test'
import { alignHorizontal, alignVertical, tidyLayout, type LayoutNode } from './layout.ts'

const nodes: LayoutNode[] = [
  { id: 'a', position: { x: 900, y: 10 }, data: { kind: 'trigger_start' } },
  { id: 'b', position: { x: 10, y: 400 }, data: { kind: 'send_message' } },
  { id: 'c', position: { x: 500, y: 200 }, data: { kind: 'end_flow' } },
]
const edges = [
  { source: 'a', target: 'b' },
  { source: 'b', target: 'c' },
]

test('tidy layout stacks a straight flow from top to bottom', () => {
  const placed = tidyLayout(nodes, edges)
  const byId = new Map(placed.map((node) => [node.id, node.position]))
  assert.ok(byId.get('a')!.y < byId.get('b')!.y)
  assert.ok(byId.get('b')!.y < byId.get('c')!.y)
  assert.equal(byId.get('a')!.x, byId.get('b')!.x)
})

test('row and column alignment share one axis', () => {
  const row = alignHorizontal(nodes)
  assert.equal(new Set(row.map((node) => node.position.y)).size, 1)
  const rowX = new Map(row.map((node) => [node.id, node.position.x]))
  assert.ok(rowX.get('b')! < rowX.get('c')!)
  assert.ok(rowX.get('c')! < rowX.get('a')!)

  const column = alignVertical(nodes)
  assert.equal(new Set(column.map((node) => node.position.x)).size, 1)
  const columnY = new Map(column.map((node) => [node.id, node.position.y]))
  assert.ok(columnY.get('a')! < columnY.get('c')!)
  assert.ok(columnY.get('c')! < columnY.get('b')!)
})
