import assert from 'node:assert/strict'
import { test } from 'node:test'
import { graphAction, publishedSource } from './copy-graphs.js'

test('the newest published graph for that environment is the copy', () => {
  const chosen = publishedSource([
    { version: 14, status: 'published', environmentId: 'sandbox', graph: { nodes: ['sandbox'] } },
    { version: 4, status: 'published', environmentId: 'production', graph: { nodes: ['production'] } },
    { version: 2, status: 'draft', environmentId: null, graph: { nodes: ['draft'] } },
  ], 'production')
  assert.equal(chosen?.version, 4)
})

test('an existing copy is updated only when the graph changed', () => {
  assert.equal(graphAction(null, { a: 1 }), 'create')
  assert.equal(graphAction({ b: 1, a: { d: 2, c: 3 } }, { a: { c: 3, d: 2 }, b: 1 }), 'keep')
  assert.equal(graphAction({ a: 1 }, { a: 2 }), 'update')
})
