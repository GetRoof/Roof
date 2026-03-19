import { test, expect } from '@playwright/test'

test.describe('Listings feed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/rooms')
    // Wait for at least one listing card to appear
    await page.locator('[data-testid="listing-card"]').first().waitFor({ timeout: 15_000 })
  })

  test('page loads and shows listings', async ({ page }) => {
    await expect(page.getByText('Listings from 10 platforms')).toBeVisible()
    const cards = page.locator('[data-testid="listing-card"]')
    await expect(cards.first()).toBeVisible()
  })

  test('platform filter chips are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^All/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Pararius/ })).toBeVisible()
  })

  test('clicking a platform chip filters listings', async ({ page }) => {
    const parariusChip = page.getByRole('button', { name: /^Pararius/ })
    await parariusChip.click()
    // Chip should be active (inverted colors)
    await expect(parariusChip).toHaveCSS('background-color', /rgb/)
  })

  test('filter sheet opens and shows live counter', async ({ page }) => {
    await page.locator('[data-testid="filter-button"]').click()
    await expect(page.getByText('Filters')).toBeVisible()

    // Apply "Under €700" preset
    await page.getByRole('button', { name: 'Under €700' }).click()

    // Button should show a count (not "Show all listings")
    await expect(page.getByRole('button', { name: /show \d+ listing/i })).toBeVisible()
  })

  test('save button toggles heart state', async ({ page }) => {
    const firstSaveBtn = page.locator('[data-testid="save-button"]').first()
    await firstSaveBtn.click()
    // Heart should now be filled (SVG fill changes from "none" to "currentColor")
    const svg = firstSaveBtn.locator('svg')
    await expect(svg).toHaveAttribute('fill', 'currentColor')

    // Unsave
    await firstSaveBtn.click()
    await expect(svg).toHaveAttribute('fill', 'none')
  })
})
