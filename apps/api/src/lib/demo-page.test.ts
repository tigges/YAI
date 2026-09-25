import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveDemoChannel } from './demo-page.js'

const active = new Set(['bella-web', 'bella-web-sandbox'])

test('the old Bella demo link opens the current public page', () => {
  assert.deepEqual(resolveDemoChannel('cmucmsmng0001pb013iwc9sf5', active), {
    channelId: 'bella-web',
    redirect: true,
  })
})

test('a live demo channel stays on its own page', () => {
  assert.deepEqual(resolveDemoChannel('bella-web', active), { channelId: 'bella-web', redirect: false })
  assert.deepEqual(resolveDemoChannel('bella-web-sandbox', active), {
    channelId: 'bella-web-sandbox',
    redirect: false,
  })
})

test('a missing demo channel has nowhere to go when Bella is inactive', () => {
  assert.equal(resolveDemoChannel('cmucmsmng0001pb013iwc9sf5', new Set()), null)
})
