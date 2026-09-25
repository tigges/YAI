import assert from 'node:assert/strict'
import { test } from 'node:test'
import { environmentsNeedingGraph, isShopWelcomeGraph } from './bella-salon-sync.js'

test('the shop welcome is the retail menu, not the salon greeting', () => {
  assert.equal(isShopWelcomeGraph('Welcome & Routing', { text: 'I can help with an order, a return, billing' }), true)
  assert.equal(isShopWelcomeGraph('Welcome & Routing', { text: 'Hi, I am Bella at Bella Hair Studio.' }), false)
  assert.equal(isShopWelcomeGraph('Salon welcome', { text: 'billing return order' }), false)
})

test('a salon graph is published only where the saved copy differs', () => {
  const graph = { nodes: [{ id: 'start' }] }
  const same = { nodes: [{ id: 'start' }] }
  const other = { nodes: [{ id: 'other' }] }
  assert.deepEqual(
    environmentsNeedingGraph(graph, [
      { environmentId: 'sandbox', graph: same },
      { environmentId: 'production', graph: other },
    ], ['sandbox', 'production']),
    ['production'],
  )
  assert.deepEqual(environmentsNeedingGraph(graph, [], ['sandbox', 'production']), ['sandbox', 'production'])
})
