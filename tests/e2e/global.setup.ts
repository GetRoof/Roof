import { test as setup, expect } from '@playwright/test'

/**
 * Global auth setup: signs in once and saves browser state for
 * authenticated test projects.
 *
 * Required env vars (in .env.test):
 *   TEST_USER_EMAIL    - e.g. test@roof.app
 *   TEST_USER_PASSWORD - password for the test account
 *
 * The test account must already exist in Supabase.
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.test')
  }

  await page.goto('/login')

  // Expand the email form
  await page.getByRole('button', { name: /sign in with email/i }).click()

  // Fill credentials
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Your password').fill(password)

  // Submit
  await page.getByRole('button', { name: /^sign in$/i }).click()

  // Wait for redirect to the app
  await page.waitForURL('**/app/**', { timeout: 15_000 })

  // Save signed-in state
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' })
})
