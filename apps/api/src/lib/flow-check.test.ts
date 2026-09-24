import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectFlowGraph, repairFlowGraph, starterFlows } from '@ybot/shared'

test('a welcome with a loose start and untied lines can be repaired', () => {
  const graph = {
    nodes: [
      { id: 'start', data: { kind: 'trigger_start', label: 'Start', config: {} } },
      { id: 'route', data: { kind: 'route_topic', label: 'Route by topic', config: { routes: [{ handle: 'orders', phrases: ['order'], flowName: 'Order Status' }] } } },
      { id: 'go', data: { kind: 'execute_flow', label: 'Order Status', config: { flowName: 'Order Status' } } },
      { id: 'hi', data: { kind: 'send_message', label: 'Welcome', config: { text: 'Hello' } } },
      { id: 'end', data: { kind: 'end_flow', label: 'End', config: {} } },
    ],
    edges: [
      { id: 'named', source: 'route', target: 'go', sourceHandle: 'orders' },
      { id: 'other', source: 'route', target: 'hi', sourceHandle: 'other' },
      { id: 'loose', source: 'route', target: 'go', sourceHandle: 'out' },
      { id: 'menu', source: 'hi', target: 'end' },
    ],
  }
  const before = inspectFlowGraph(graph)
  assert.ok(before.some((issue) => issue.code === 'start-unlinked'))
  assert.ok(before.some((issue) => issue.code === 'stray-route'))

  const repaired = repairFlowGraph(graph)
  assert.ok(repaired.repairs.some((issue) => issue.message.includes('Start')))
  assert.equal(repaired.graph.edges.some((edge) => edge.sourceHandle === 'out' && edge.source === 'route'), false)
  assert.equal(repaired.graph.edges.some((edge) => edge.source === 'start' && edge.target === 'route'), true)

  const after = inspectFlowGraph(repaired.graph)
  assert.equal(after.some((issue) => issue.level === 'block' || issue.level === 'repair'), false)
})

test('yes and no are restored from true and false', () => {
  const graph = {
    nodes: [
      { id: 'start', data: { kind: 'trigger_start', label: 'Start', config: {} } },
      { id: 'check', data: { kind: 'condition', label: 'Order found?', config: { conditions: [{ field: 'response.status', operator: 'equals', value: '200' }] } } },
      { id: 'yes', data: { kind: 'send_message', label: 'Details', config: { text: 'On the way' } } },
      { id: 'no', data: { kind: 'handover', label: 'Hand over', config: { team: 'support' } } },
      { id: 'end', data: { kind: 'end_flow', label: 'End', config: {} } },
      { id: 'fetch', data: { kind: 'http_request', label: 'Fetch order', config: { url: 'https://api.acme.com/orders/1' } } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'fetch', sourceHandle: 'out' },
      { id: 'e2', source: 'fetch', target: 'check' },
      { id: 'e3', source: 'check', target: 'yes', sourceHandle: 'true' },
      { id: 'e4', source: 'check', target: 'no', sourceHandle: 'false' },
      { id: 'e5', source: 'yes', target: 'end' },
    ],
  }
  const repaired = repairFlowGraph(graph)
  const handles = repaired.graph.edges.filter((edge) => edge.source === 'check').map((edge) => edge.sourceHandle).sort()
  assert.deepEqual(handles, ['no', 'yes'])
  const after = inspectFlowGraph(repaired.graph)
  assert.ok(after.some((issue) => issue.code === 'condition-field' && issue.level === 'note'))
  assert.equal(after.some((issue) => issue.level === 'block' || issue.level === 'repair'), false)
})

test('standard templates have no broken connections', () => {
  const templates = starterFlows('Acme Corp')
  const names = templates.map((template) => template.name)
  for (const template of templates) {
    const issues = inspectFlowGraph(template.graph as Parameters<typeof inspectFlowGraph>[0], { flowNames: names })
    const blocking = issues.filter((issue) => issue.level === 'block' || issue.level === 'repair')
    assert.deepEqual(blocking, [], template.name)
  }
})
