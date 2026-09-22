import { test, expect, type Page } from '@playwright/test'

const qaEmail = process.env['QA_EMAIL'] ?? 'qa@acme.com'
const qaPassword = process.env['QA_PASSWORD'] ?? 'QaDemo1234!'
const bellaEmail = process.env['BELLA_EMAIL'] ?? 'demo@bella.com'
const bellaPassword = process.env['BELLA_PASSWORD'] ?? 'Demo1234!'

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/overview')
}

test('Acme walkthrough stays on the real demo', async ({ page, request }) => {
  await signIn(page, qaEmail, qaPassword)

  // Overview lists only the five newest chats. Bob shares a timestamp with
  // the other seeded customers, so he is not always on that short list.
  await page.goto('/inbox/chats')
  await page.getByText('Bob Smith').first().click()
  await expect(page.getByText(/arrived damaged/i)).toBeVisible()

  await page.goto('/build/flows')
  await page.getByText('Order Status', { exact: true }).click()
  await expect(page.getByText('Ask order number')).toBeVisible()
  await expect(page.getByText('Order Status Trigger')).toBeVisible()
  await expect(page.getByText('Welcome Flow')).toHaveCount(0)

  await page.goto('/inbox/tickets')
  await expect(page.getByText('Feature request: bulk export')).toBeVisible()
  await expect(page.getByText('Something went wrong')).toHaveCount(0)

  const login = await request.post('/api/v1/auth/login', {
    data: { email: qaEmail, password: qaPassword },
  })
  expect(login.ok()).toBeTruthy()
  const token = (await login.json()).data.token as string
  const team = await request.get('/api/v1/team/members', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(team.ok()).toBeTruthy()
  expect(await team.text()).not.toContain('passwordHash')
})

test('Bella demo has the salon chats and a copy of the flows', async ({ page }) => {
  await signIn(page, bellaEmail, bellaPassword)

  await page.goto('/build/flows')
  await expect(page.getByText('Welcome & Routing')).toBeVisible()
  await expect(page.getByText('Order Status', { exact: true })).toBeVisible()

  await page.getByText('Welcome & Routing').click()
  await expect(page.getByText('Welcome Message')).toBeVisible()
  await page.getByText('Welcome Message').click()
  await expect(page.getByText('Bella Hair Studio')).toBeVisible()

  await page.goto('/inbox/chats')
  await page.getByText('Emma Clarke').first().click()
  await expect(page.getByText(/book a haircut/i)).toBeVisible()
})
