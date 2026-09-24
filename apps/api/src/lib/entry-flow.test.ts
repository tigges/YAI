import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pickEntry } from './entry-flow.js'
import { recipesToPropose } from './draft-flows.js'
import { DRAFT_RECIPES } from './draft-flows.js'
import { withDestination } from './welcome-routes.js'

test('pickEntry keeps the newest welcome flow in front of a later publish', () => {
  const chosen = pickEntry([
    { publishedAt: new Date('2026-09-01'), flow: { name: 'Order Status', tags: [] } },
    { publishedAt: new Date('2026-09-03'), flow: { name: 'Welcome & Routing', tags: ['welcome'] } },
    { publishedAt: new Date('2026-09-04'), flow: { name: 'Billing', tags: [] } },
  ])
  assert.equal(chosen?.flow.name, 'Welcome & Routing')
})

test('three password chats propose a draft and a second pass does not', () => {
  const messages = [
    'I forgot my password',
    'Can you reset my password?',
    'I cannot sign in',
  ]
  const recipe = DRAFT_RECIPES.filter((item) => item.name === 'Password Reset')
  assert.deepEqual(recipesToPropose(messages, recipe, []), ['Password Reset'])
  assert.deepEqual(recipesToPropose(messages, recipe, ['Password Reset']), [])
})

test('publishing a destination adds one handoff to the welcome router', () => {
  const graph = {
    nodes: [
      { id: 'route', data: { kind: 'route_topic', label: 'Route', config: { routes: [{ handle: 'orders', phrases: ['order'] }] } } },
    ],
    edges: [] as Array<{ id: string; source: string; target: string; sourceHandle?: string }>,
  }
  const phrases = DRAFT_RECIPES.find((item) => item.name === 'Password Reset')!.phrases
  const next = withDestination(graph, 'Password Reset', phrases)
  assert.ok(next)
  const routes = next!.nodes.find((node) => node.id === 'route')!.data.config['routes'] as Array<{ flowName?: string }>
  assert.equal(routes.filter((route) => route.flowName === 'Password Reset').length, 1)
  const again = withDestination(next!, 'Password Reset', phrases)
  const routesAgain = again!.nodes.find((node) => node.id === 'route')!.data.config['routes'] as Array<{ flowName?: string }>
  assert.equal(routesAgain.filter((route) => route.flowName === 'Password Reset').length, 1)
})
