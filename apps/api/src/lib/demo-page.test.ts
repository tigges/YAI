import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appBuildLabel, resolveDemoChannel } from './demo-page.js'

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

test('the public page uses the same build label as the app', () => {
  assert.deepEqual(appBuildLabel({ APP_VERSION: '1.1.71', APP_BUILD_NUMBER: '71', APP_GIT_SHA: '8e308105ca3e' }), {
    short: 'v1.1.71',
    title: 'v1.1.71 · 8e30810',
  })
  assert.equal(appBuildLabel({ APP_VERSION: '1.1.0', APP_BUILD_NUMBER: 'local' }).short, 'v1.1.0-dev')
})
