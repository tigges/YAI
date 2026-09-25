import assert from 'node:assert/strict'
import { test } from 'node:test'
import { selectedBotAfterLoad } from './app.ts'

test('a saved bot stays selected when it is still in the list', () => {
  assert.equal(selectedBotAfterLoad('bella-bot', [{ id: 'bella-bot' }, { id: 'other' }]), 'bella-bot')
})

test('a missing saved bot is replaced by the first real bot', () => {
  assert.equal(selectedBotAfterLoad('deleted-bot', [{ id: 'bella-bot' }]), 'bella-bot')
  assert.equal(selectedBotAfterLoad(null, []), null)
})
