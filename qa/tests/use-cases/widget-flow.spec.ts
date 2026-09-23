import { test, expect } from '@playwright/test'
import { bellaEmail, bellaPassword, signIn } from '../helpers'

const visitor = 'QA Widget Guest'
const sessionId = 'qa-widget-bella'
const line = 'QA check from the website widget'

test('a widget flow is processed and shows in the inbox and on the dashboard', { tag: '@smoke' }, async ({ page, request }) => {
  let token = ''
  for (let attempt = 0; attempt < 3 && !token; attempt++) {
    const login = await request.post('/api/v1/auth/login', {
      data: { email: bellaEmail, password: bellaPassword },
    })
    if (login.ok()) token = (await login.json()).data.token as string
    else if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  expect(token).toBeTruthy()
  const listed = await request.get('/api/v1/conversations?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const existing = listed.ok()
    ? ((await listed.json()).data as Array<{ id: string; contact?: { displayName?: string } }>)
        .find((conversation) => conversation.contact?.displayName === visitor)
    : undefined

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
