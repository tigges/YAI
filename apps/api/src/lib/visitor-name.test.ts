import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fillNameTokens } from '@ybot/shared'
import { finishBotLines, planNameTurn, presentChatText } from './visitor-name.js'

test('a stored welcome with no name reads as there', () => {
  const stored = 'Hi {{contact.name}}! 👋 Welcome to Bella Hair Studio. How can I help you today?'
  assert.equal(presentChatText(stored, 'hi'), 'Hi there! 👋 Welcome to Bella Hair Studio. How can I help you today?')
  assert.equal(presentChatText(stored, 'Visitor'), 'Hi there! 👋 Welcome to Bella Hair Studio. How can I help you today?')
  assert.equal(fillNameTokens(stored, 'Sarah Jones'), 'Hi Sarah! 👋 Welcome to Bella Hair Studio. How can I help you today?')
  assert.equal(presentChatText(stored, '{{contact.name}}').includes('{{'), false)
})

test('an unknown visitor is greeted, then asked once', () => {
  const first = planNameTurn({ id: 'c', displayName: 'hi' }, 'hi')
  assert.equal(first.spoken, 'there')
  assert.equal(first.thanks, undefined)

  const asked = finishBotLines(
    ['Hi there! Welcome to Bella Hair Studio.'],
    { id: 'c', displayName: 'hi' },
    first.spoken,
  )
  assert.deepEqual(asked.lines, ['Hi there! Welcome to Bella Hair Studio.', "What's your name?"])
  assert.equal(asked.metadata?.['nameAsked'], true)
  assert.equal(asked.metadata?.['awaitingName'], true)

  const again = finishBotLines(
    ['We are open Monday to Saturday.'],
    { id: 'c', displayName: 'hi', metadata: asked.metadata },
    'there',
  )
  assert.deepEqual(again.lines, ['We are open Monday to Saturday.'])
  assert.equal(again.metadata, undefined)
})

test('a real name is used and a later reply is saved', () => {
  const opened = planNameTurn({ id: 'c', displayName: 'Visitor' }, 'Sarah Jones')
  assert.equal(opened.spoken, 'Sarah')
  assert.equal(opened.displayName, 'Sarah Jones')

  const waiting = planNameTurn(
    { id: 'c', displayName: 'hi', metadata: { nameAsked: true, awaitingName: true } },
    'Mary-Jane',
  )
  assert.equal(waiting.thanks, 'Thanks, Mary-Jane.')
  assert.equal(waiting.displayName, 'Mary-Jane')

  const notAName = planNameTurn(
    { id: 'c', displayName: 'Visitor', metadata: { nameAsked: true, awaitingName: true } },
    'I want a haircut',
  )
  assert.equal(notAName.thanks, undefined)
  assert.equal(notAName.spoken, 'there')
  assert.equal(notAName.metadata?.['awaitingName'], false)
})
