import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resumeVariables } from './flow-runner.js'

test('a saved session with no flow scope still keeps the latest reply', () => {
  const variables = resumeVariables(null, 'what are your hours?', 'there')
  assert.equal(variables.flow['_last_user_message'], 'what are your hours?')
  assert.equal(variables.contact['name'], 'there')
  assert.deepEqual(variables.global, {})
})

test('a saved topic survives the next reply', () => {
  const variables = resumeVariables(
    { flow: { topic: 'book a colour' }, contact: { name: 'there' } },
    'Sophie',
    'Sophie',
  )
  assert.equal(variables.flow['topic'], 'book a colour')
  assert.equal(variables.flow['_last_user_message'], 'Sophie')
  assert.equal(variables.contact['name'], 'Sophie')
})
