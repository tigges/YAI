import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readSseEvents } from './hero-chat.ts'

test('a live chat frame keeps the reply and the conversation id', () => {
  const raw = 'data: {"conversationId":"c1"}\n\ndata: {"chunk":"Hi there. How can I help you today?"}\n\ndata: {"done":true}\n\n'
  const { events, rest } = readSseEvents(raw)
  assert.equal(rest, '')
  assert.equal(events[0]?.conversationId, 'c1')
  assert.equal(events[1]?.chunk, 'Hi there. How can I help you today?')
  assert.equal(events[2]?.done, true)
})

test('a split frame waits for the rest of the line', () => {
  const first = readSseEvents('data: {"chunk":"Hi')
  assert.equal(first.events.length, 0)
  assert.equal(first.rest, 'data: {"chunk":"Hi')
  const next = readSseEvents(`${first.rest} there."}\n`)
  assert.equal(next.events[0]?.chunk, 'Hi there.')
})
