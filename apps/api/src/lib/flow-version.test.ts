import assert from 'node:assert/strict'
import { test } from 'node:test'
import { versionForEnvironment, versionsForEnvironmentList } from '@ybot/shared'

const versions = [
  { version: 14, status: 'published', environmentId: 'sandbox', graph: 'sandbox-welcome' },
  { version: 4, status: 'published', environmentId: 'production', graph: 'production-welcome' },
  { version: 2, status: 'draft', environmentId: null, graph: 'old-draft' },
  { version: 1, status: 'published', environmentId: 'production', graph: 'old-production' },
]

test('the list keeps the newest published graph for each environment', () => {
  const listed = versionsForEnvironmentList(versions)
  assert.deepEqual(listed.map((item) => item.version), [14, 4, 2])
})

test('sandbox opens its published graph and production does not open the sandbox one', () => {
  assert.equal(versionForEnvironment(versions, 'sandbox', 'sandbox')?.version, 14)
  assert.equal(versionForEnvironment(versions, 'production', 'production')?.version, 4)
})

test('a draft stays in sandbox and production shows nothing until it is published', () => {
  const draft = [{ version: 1, status: 'draft', environmentId: null }]
  assert.equal(versionForEnvironment(draft, 'sandbox', 'sandbox')?.version, 1)
  assert.equal(versionForEnvironment(draft, 'production', 'production'), undefined)
})
