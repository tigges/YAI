import assert from 'node:assert/strict'
import { test } from 'node:test'
import { guidedFlowGraph, starterFlows } from '@ybot/shared'

test('a guided flow asks a question and can hand off', () => {
  const graph = guidedFlowGraph({ greeting: 'Hello', question: 'Order number?', handoff: true })
  const kinds = graph.nodes.map((node) => (node as { data: { kind: string } }).data.kind)
  assert.deepEqual(kinds, ['trigger_start', 'send_message', 'ask_question', 'send_message', 'handover'])
})

test('a guided flow with no question ends after the greeting', () => {
  const graph = guidedFlowGraph({ greeting: 'Hello', question: '  ', handoff: false })
  const kinds = graph.nodes.map((node) => (node as { data: { kind: string } }).data.kind)
  assert.deepEqual(kinds, ['trigger_start', 'send_message', 'end_flow'])
})

test('every new company gets the same standard templates', () => {
  const names = starterFlows('Acme Corp').map((flow) => flow.name)
  assert.ok(names.includes('Welcome & Routing'))
  assert.ok(names.includes('Cancel order'))
  assert.ok(names.includes('Change address'))
  assert.ok(names.includes('Talk to a person'))
  assert.equal(new Set(names).size, names.length)
})
