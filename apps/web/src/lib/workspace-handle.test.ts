import assert from 'node:assert/strict'
import { test } from 'node:test'
import { workspaceIdentity } from './workspace-handle.ts'

test('Charles on Acme and Bella get different handles', () => {
  const acme = workspaceIdentity({
    displayName: 'Charles',
    email: 'charles@acme.com',
    tenantName: 'Acme Corp',
  })
  const bella = workspaceIdentity({
    displayName: 'Charles',
    email: 'charles@bella.com',
    tenantName: 'Bella Hair Studio',
  })
  assert.equal(acme.handle, 'CAcme')
  assert.equal(acme.avatarName, 'C Acme')
  assert.equal(bella.handle, 'CBella')
  assert.equal(bella.avatarName, 'C Bella')
})

test('email domain is the company until the workspace name loads', () => {
  const acme = workspaceIdentity({ displayName: 'Charles', email: 'charles@acme.com' })
  const bella = workspaceIdentity({ displayName: 'Charles', email: 'charles@bella.com' })
  assert.equal(acme.handle, 'CAcme')
  assert.equal(bella.handle, 'CBella')
})

test('workspace name wins over a personal email domain', () => {
  const identity = workspaceIdentity({
    displayName: 'Charles',
    email: 'charles@gmail.com',
    tenantName: 'Acme Corp',
  })
  assert.equal(identity.handle, 'CAcme')
  assert.equal(identity.company, 'Acme')
})

test('a missing company keeps the display name', () => {
  const identity = workspaceIdentity({ displayName: 'Charles' })
  assert.equal(identity.handle, 'Charles')
  assert.equal(identity.avatarName, 'Charles')
})
