import { test, expect } from '@playwright/test'

test('a wrong password stays on the sign-in page', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill('qa@acme.com')
  await page.getByLabel('Password').fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/sign-in/)
  await expect(page.getByText(/invalid|incorrect|password|unauthorized/i).first()).toBeVisible()
})

test('the recovery forms are on screen', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/forgot-password')
  await expect(page.getByLabel(/email/i)).toBeVisible()
  await page.goto('/reset-password')
  await expect(page.getByText(/password/i).first()).toBeVisible()
  await page.goto('/accept-invite')
  await expect(page.getByText(/invite|password|token/i).first()).toBeVisible()
})
