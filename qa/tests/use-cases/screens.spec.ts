import { test, expect } from '@playwright/test'
import { expectNoCrash, qaEmail, qaPassword, signIn } from '../helpers'

const screens = [
  '/overview',
  '/build/flows',
  '/build/workflows',
  '/build/knowledge/intents',
  '/build/knowledge/entities',
  '/build/knowledge/faqs',
  '/build/knowledge/sources',
  '/build/knowledge/training',
  '/inbox/chats',
  '/inbox/tickets',
  '/inbox/contacts',
  '/inbox/settings',
  '/engage/campaigns',
  '/engage/templates',
  '/analytics',
  '/analytics/dashboards',
  '/analytics/reports',
  '/configure/channels',
  '/configure/optimizations',
  '/configure/integrations',
  '/configure/database',
  '/configure/webhooks',
  '/admin/team',
  '/admin/audit',
  '/admin/system-status',
  '/settings',
  '/bots',
]

test('every screen opens', { tag: '@smoke' }, async ({ page }) => {
  test.setTimeout(180_000)
  await signIn(page, qaEmail, qaPassword)
  for (const path of screens) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(path.replaceAll('/', '\\/')))
    await expectNoCrash(page)
  }
  await page.goto('/analytics/reports')
  await expect(page.getByText('Weekly conversation summary')).toBeVisible()
  await page.goto('/configure/database')
  await expect(page.getByText(/customers|orders|users/i).first()).toBeVisible()
  await page.goto('/configure/integrations')
  await expect(page.getByText('Stripe', { exact: true })).toBeVisible()
  await expect(page.getByText('Soon').first()).toBeVisible()
})
