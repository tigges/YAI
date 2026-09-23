import { test, expect } from '@playwright/test'
import { bellaEmail, bellaPassword, signIn } from '../helpers'

const visitor = 'QA Widget Guest'
const sessionId = 'qa-widget-bella'
const line = 'QA check from the website widget'

test('a widget flow is processed and shows in the inbox and on the dashboard', { tag: '@smoke' }, async ({ page, request }) => {
  const login = await request.post('/api/v1/auth/login', {
    data: { email: bellaEmail, password: bellaPassword },
  })
  expect(login.ok()).toBeTruthy()
  const token = (await login.json()).data.token as string
  const listed = await request.get('/api/v1/conversations?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(listed.ok()).toBeTruthy()
  const existing = ((await listed.json()).data as Array<{ id: string; contact?: { displayName?: string } }>)
    .find((conversation) => conversation.contact?.displayName === visitor)

  const chat = await request.post('/api/v1/public/chat/bella-web', {
    data: {
      message: line,
      sessionId,
      visitorName: visitor,
      ...(existing ? { conversationId: existing.id } : {}),
    },
    timeout: 45_000,
  })
  expect(chat.ok()).toBeTruthy()
  const body = await chat.text()
  expect(body).not.toContain('outside our working hours')
  expect(body).toMatch(/Bella Hair Studio|What do you need help with/)

  await signIn(page, bellaEmail, bellaPassword)

  await page.goto('/inbox/chats')
  await page.getByText(visitor).first().click()
  await expect(page.getByText(line).first()).toBeVisible()
  await expect(page.getByText(/Bella Hair Studio|What do you need help with/).first()).toBeVisible()

  await page.goto('/overview')
  await expect(page.getByRole('heading', { name: 'Recent Conversations' })).toBeVisible()
  await expect(page.getByText(visitor).first()).toBeVisible()
})
