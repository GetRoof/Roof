import { test, expect } from '@playwright/test'

test.describe('Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/alerts')
    await page.waitForLoadState('networkidle')
  })

  test('alerts page loads with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible()
  })

  test('shows promo banner or existing alerts', async ({ page }) => {
    // Either the promo banner or the "Your alerts" section is visible
    const hasBanner = await page.getByText('Set up custom alerts').isVisible().catch(() => false)
    const hasAlerts = await page.getByText('Your alerts').isVisible().catch(() => false)
    expect(hasBanner || hasAlerts).toBeTruthy()
  })

  test('can open and close the alert creation sheet', async ({ page }) => {
    // Find the "Create alert" button (either in promo or floating)
    const createBtn = page.getByRole('button', { name: /create alert/i }).first()
    await createBtn.click()

    // Sheet should open with city input
    await expect(page.getByPlaceholder('Add a city')).toBeVisible()

    // Close sheet
    await page.keyboard.press('Escape')
  })

  test('city autocomplete shows suggestions', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /create alert/i }).first()
    await createBtn.click()

    const cityInput = page.getByPlaceholder('Add a city')
    await cityInput.fill('Amst')

    // Should show Amsterdam in dropdown
    await expect(page.getByRole('button', { name: 'Amsterdam' })).toBeVisible({ timeout: 3_000 })
  })

  test('city autocomplete shows empty state for no matches', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /create alert/i }).first()
    await createBtn.click()

    const cityInput = page.getByPlaceholder('Add a city')
    await cityInput.fill('zzzzz')

    await expect(page.getByText('No cities found')).toBeVisible({ timeout: 3_000 })
  })
})
