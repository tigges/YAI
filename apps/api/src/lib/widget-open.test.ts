import assert from 'node:assert/strict'
import { test } from 'node:test'
import { visitorTurn } from './widget-open.js'

test('opening an empty chat is a greeting, not a visitor line', () => {
  assert.deepEqual(visitorTurn({ opening: true }), { text: 'hi', showVisitor: false })
  assert.deepEqual(visitorTurn({ message: '   ', opening: true }), { text: 'hi', showVisitor: false })
})

test('a typed message stays in the transcript', () => {
  assert.deepEqual(visitorTurn({ message: 'what are your hours?', opening: true }), {
    text: 'what are your hours?',
    showVisitor: true,
  })
  assert.equal(visitorTurn({ message: '  ' }), null)
})
