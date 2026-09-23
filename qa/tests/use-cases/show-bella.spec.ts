import { test, expect } from '@playwright/test'
import { bellaEmail, bellaPassword, signIn } from '../helpers'

test('show the Bella demo', { tag: '@smoke' }, async ({ page }) => {
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

  await page.goto('/configure/channels')
  await expect(page.getByText('Website Chat').first()).toBeVisible()
  await expect(page.getByText('WhatsApp').first()).toBeVisible()
})
