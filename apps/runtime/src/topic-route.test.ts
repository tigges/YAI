import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SessionMachine, type FlowGraph } from './engine.js'
import type { ExecutionServices, Session } from './types.js'
import { matchTopic } from './topic-route.js'

test('matchTopic picks the first handle', () => {
  const routes = [
    { handle: 'orders', phrases: ['order', 'where is'] },
    { handle: 'returns', phrases: ['return'] },
  ]
  assert.equal(matchTopic('Where is my order?', routes), 'orders')
  assert.equal(matchTopic('I need to return a kettle', routes), 'returns')
  assert.equal(matchTopic('hello', routes), 'other')
})

test('execute_flow hands off and route_topic selects a branch', async () => {
  const services = { llm: {}, db: {}, httpFetch: fetch } as unknown as ExecutionServices
  const machine = new SessionMachine(services)
  const graph: FlowGraph = {
    nodes: [
      { id: 'start', data: { kind: 'trigger_start', label: 'Start', config: {} } },
      { id: 'route', data: { kind: 'route_topic', label: 'Route', config: { routes: [{ handle: 'orders', phrases: ['order'] }] } } },
      { id: 'go', data: { kind: 'execute_flow', label: 'Order Status', config: { flowName: 'Order Status' } } },
      { id: 'hi', data: { kind: 'send_message', label: 'Hi', config: { text: 'How can I help?' } } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'route' },
      { id: 'e2', source: 'route', target: 'go', sourceHandle: 'orders' },
      { id: 'e3', source: 'route', target: 'hi', sourceHandle: 'other' },
    ],
  }
  const session: Session = {
    id: 's1',
    conversationId: 'c1',
    botId: 'b1',
    tenantId: 't1',
    flowId: 'f1',
    flowVersionId: 'v1',
    currentNodeId: 'start',
    variables: { flow: { _last_user_message: 'where is my order' }, global: {}, contact: { name: 'there' } },
    status: 'running',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const jumped = await machine.run(session, graph, 'where is my order')
  assert.equal(jumped.jumpToFlow, 'Order Status')

  const greeting: Session = {
    ...session,
    id: 's2',
    currentNodeId: 'start',
    variables: { flow: { _last_user_message: 'hello' }, global: {}, contact: { name: 'there' } },
  }
  const welcomed = await machine.run(greeting, graph, 'hello')
  assert.equal(welcomed.jumpToFlow, undefined)
  assert.match(welcomed.newMessages.map((message) => message.content.text).join('\n'), /How can I help/)
})
