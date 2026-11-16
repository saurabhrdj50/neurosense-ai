// Responsive Layout & Viewport Quality Assurance
// Tests 375px, 768px, 1024px, and 1440px for overflow and console errors
import { test, expect } from '@playwright/test'

const VIEWPORTS = [
  { name: 'Mobile (375px)', width: 375, height: 812 },
  { name: 'Tablet (768px)', width: 768, height: 1024 },
  { name: 'Laptop (1024px)', width: 1024, height: 768 },
  { name: 'Desktop (1440px)', width: 1440, height: 900 },
]

test.describe('viewport responsive integrity & horizontal containment', () => {
  for (const vp of VIEWPORTS) {
    test(`renders landing page without horizontal overflow at ${vp.name}`, async ({ page }) => {
      const consoleErrors = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      page.on('pageerror', (err) => consoleErrors.push(err.message))

      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/')

      // Wait for content hydration
      await expect(page.getByRole('heading', { name: /NeuroSense AI/i }).first()).toBeVisible({ timeout: 15_000 })

      // Check document does not horizontally overflow viewport
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2
      })
      expect(isOverflowing).toBe(false)

      // Filter out benign browser warnings & offline font requests
      const fatalErrors = consoleErrors.filter(
        (err) =>
          !err.includes('AudioContext') &&
          !err.includes('favicon.ico') &&
          !err.includes('ERR_INTERNET_DISCONNECTED') &&
          !err.includes('fonts.googleapis.com')
      )
      expect(fatalErrors).toHaveLength(0)
    })

    test(`renders login page cleanly at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/login')

      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 15_000 })

      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2
      })
      expect(isOverflowing).toBe(false)
    })

    test(`renders dashboard workstation cleanly at ${vp.name}`, async ({ page, request }) => {
      // Ensure doctor exists
      try {
        await request.post('/api/auth/register', {
          data: {
            username: 'doctor',
            email: 'doctor@neurosense.ai',
            password: 'Doctor@123',
            full_name: 'Dr. Sarah Demo',
            date_of_birth: '1980-01-01',
            hospital: 'Demo General Hospital',
          },
        })
      } catch {
        // Ignore if exists
      }

      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/login')
      await page.getByPlaceholder('dr_sarah').fill('doctor')
      await page.getByPlaceholder('••••••••').fill('Doctor@123')
      await page.locator('form').getByRole('button', { name: 'Sign In' }).click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })

      // Wait for clinical triage heading to mount
      await expect(page.getByText(/Priority Clinical Attention/i)).toBeVisible({ timeout: 15_000 })

      // Verify no horizontal overflow on dashboard
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2
      })
      expect(isOverflowing).toBe(false)
    })
  }
})
