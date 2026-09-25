import assert from 'node:assert/strict'
import { test } from 'node:test'
import { messageForStatus } from './api-error.ts'

test('a gateway failure says the server is not responding', () => {
  assert.equal(messageForStatus(502, undefined), 'The server is not responding. Try again in a moment.')
  assert.equal(messageForStatus(503), 'The server is not responding. Try again in a moment.')
})

test('an API message is kept', () => {
  assert.equal(messageForStatus(404, { message: 'Bot not found' }), 'Bot not found')
})

test('other failures keep the status', () => {
  assert.equal(messageForStatus(500), 'The request failed (HTTP 500).')
})
