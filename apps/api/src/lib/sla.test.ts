import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isWithinWorkingHours, parseInboxPolicy, slaLabel, type InboxPolicy } from './sla.js'

const policy: InboxPolicy = parseInboxPolicy({
  sla: { first_response: '1', resolution: '24' },
  workingHours: { start: '09:00', end: '18:00', timezone: 'Europe/London', awayMessage: 'Away now' },
})

test('parses inbox settings and keeps a custom away message', () => {
  assert.equal(policy.sla.firstResponseHours, 1)
  assert.equal(policy.sla.resolutionHours, 24)
  assert.equal(policy.workingHours.awayMessage, 'Away now')
})

test('treats London office hours in September as open at 11:00 and closed at 20:30', () => {
  assert.equal(isWithinWorkingHours(policy.workingHours, new Date('2026-09-22T10:00:00Z')), true)
  assert.equal(isWithinWorkingHours(policy.workingHours, new Date('2026-09-22T19:30:00Z')), false)
})

test('supports an overnight window', () => {
  const overnight = { ...policy.workingHours, start: '22:00', end: '06:00' }
  assert.equal(isWithinWorkingHours(overnight, new Date('2026-09-22T22:30:00Z')), true)
  assert.equal(isWithinWorkingHours(overnight, new Date('2026-09-22T12:00:00Z')), false)
})

test('shows time left until the first reply', () => {
  const createdAt = new Date('2026-09-22T12:00:00Z')
  const label = slaLabel({
    status: 'active',
    createdAt,
    resolvedAt: null,
    firstResponseDueAt: new Date('2026-09-22T13:00:00Z'),
    resolutionDueAt: new Date('2026-09-23T12:00:00Z'),
    firstRespondedAt: null,
    policy,
    now: new Date('2026-09-22T12:20:00Z'),
  })
  assert.equal(label, '40m left')
})

test('switches the clock to resolution after the first reply', () => {
  const label = slaLabel({
    status: 'active',
    createdAt: new Date('2026-09-22T12:00:00Z'),
    resolvedAt: null,
    firstResponseDueAt: new Date('2026-09-22T13:00:00Z'),
    resolutionDueAt: new Date('2026-09-23T12:00:00Z'),
    firstRespondedAt: new Date('2026-09-22T12:01:00Z'),
    policy,
    now: new Date('2026-09-22T18:00:00Z'),
  })
  assert.equal(label, '18h left')
})

test('marks an open conversation breached once the resolution clock runs out', () => {
  const label = slaLabel({
    status: 'active',
    createdAt: new Date('2026-09-20T12:00:00Z'),
    resolvedAt: null,
    firstResponseDueAt: new Date('2026-09-20T13:00:00Z'),
    resolutionDueAt: new Date('2026-09-21T12:00:00Z'),
    firstRespondedAt: new Date('2026-09-20T12:05:00Z'),
    policy,
    now: new Date('2026-09-22T12:00:00Z'),
  })
  assert.equal(label, 'Breached')
})

test('hides the chip when a conversation is resolved on time', () => {
  const label = slaLabel({
    status: 'resolved',
    createdAt: new Date('2026-09-22T12:00:00Z'),
    resolvedAt: new Date('2026-09-22T15:00:00Z'),
    firstResponseDueAt: new Date('2026-09-22T13:00:00Z'),
    resolutionDueAt: new Date('2026-09-23T12:00:00Z'),
    firstRespondedAt: new Date('2026-09-22T12:05:00Z'),
    policy,
    now: new Date('2026-09-22T16:00:00Z'),
  })
  assert.equal(label, null)
})
