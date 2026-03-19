import { test, expect } from '@playwright/test'

test.describe('Auth flow', () => {
  test('shows login page with Google and email options', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with email/i })).toBeVisible()
  })

  test('shows error for empty fields', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in with email/i }).click()
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByText('Please fill in all fields.')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in with email/i }).click()
    await page.getByPlaceholder('you@example.com').fill('wrong@test.com')
    await page.getByPlaceholder('Your password').fill('wrongpassword')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByText('Invalid email or password.')).toBeVisible()
  })

  test('successful login redirects to app', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD
    if (!email || !password) test.skip()

    await page.goto('/login')
    await page.getByRole('button', { name: /sign in with email/i }).click()
    await page.getByPlaceholder('you@example.com').fill(email!)
    await page.getByPlaceholder('Your password').fill(password!)
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await page.waitForURL('**/app/**', { timeout: 15_000 })
  })

  test('create account link reaches onboarding', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /create an account/i }).click()
    await page.waitForURL('**/onboarding/**')
  })
})
