import assert from 'node:assert/strict'
import { test } from 'node:test'
import { interpolate } from './utils.js'

test('an unknown contact name is addressed as there', () => {
  assert.equal(interpolate('Hi {{contact.name}}!', {}), 'Hi there!')
  assert.equal(interpolate('Hi {{contact.name}}!', { contact: {} }), 'Hi there!')
  assert.equal(interpolate('Hi {{contact.name}}!', { contact: { name: '' } }), 'Hi there!')
  assert.equal(interpolate('Hi {{contact.name}}!', { contact: { name: 'Visitor' } }), 'Hi there!')
  assert.equal(interpolate('Hi {{contact.name}}!', { contact: { name: 'Guest' } }), 'Hi there!')
  assert.equal(interpolate('Hi {{contact.name}}!', { contact: { name: 'there' } }), 'Hi there!')
})

test('a known contact name is used', () => {
  assert.equal(interpolate('Hi {{contact.name}}!', { contact: { name: 'Sarah' } }), 'Hi Sarah!')
})

test('other missing variables stay visible', () => {
  assert.equal(interpolate('Order {{order_number}}', {}), 'Order {{order_number}}')
})
