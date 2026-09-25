import { test, expect } from '@playwright/test'
import { bellaEmail, bellaPassword, signIn } from '../helpers'

test('show the Bella demo', { tag: '@smoke' }, async ({ page }) => {
  await signIn(page, bellaEmail, bellaPassword)

  await page.goto('/build/flows')
  await expect(page.getByText('Salon welcome')).toBeVisible()
  await expect(page.getByText('Book an appointment', { exact: true })).toBeVisible()

  await page.getByText('Salon welcome').click()
  await expect(page.getByText('Hello').first()).toBeVisible()
  await page.getByText('Hello').first().click()
  await expect(page.getByText('Bella Hair Studio')).toBeVisible()

  await page.goto('/inbox/chats')
  await page.getByText('Emma Clarke').first().click()
  await expect(page.getByText(/book a haircut/i)).toBeVisible()

  await page.goto('/configure/channels')
  await expect(page.getByText('Website Chat').first()).toBeVisible()
  await expect(page.getByText('WhatsApp').first()).toBeVisible()
})
