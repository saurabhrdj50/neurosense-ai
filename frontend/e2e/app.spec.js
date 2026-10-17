// End-to-end: login → wizard (sample data) → analysis → results.
// Exercises the real stack: FastAPI backend + vite frontend.
import { test, expect } from '@playwright/test'

/* The sign-in submit button shares its name with the mode-switch tab; the
   submit button always lives inside the form. */
const submitSignIn = (page) => page.locator('form').getByRole('button', { name: 'Sign In' })

test.describe('login → wizard → results', () => {
  test('first-session walkthrough with sample data', async ({ page, request }) => {
    // ── 0. Ensure the demo doctor exists (self-registers if not yet provisioned) ──
    try {
      await request.post('/api/auth/register', {
        data: {
          username: 'doctor',
          email: 'doctor@neurosense.ai',
          password: 'Doctor@123',
          full_name: 'Dr. Sarah Demo',
          date_of_birth: '1980-01-01',
          hospital: 'Demo General Hospital'
        }
      })
    } catch {
      // Ignore if user already exists
    }

    // ── 1. Sign in as the demo doctor ──────────────────────────────
    await page.goto('/login')
    await page.getByPlaceholder('dr_sarah').fill('doctor')
    await page.getByPlaceholder('••••••••').fill('Doctor@123')
    await submitSignIn(page).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })

    // ── 2. Open the wizard and load the sample patient ────────────────────
    await page.goto('/analysis')
    await page.getByRole('button', { name: /Sample Case/i }).click()
    await expect(page.getByText(/Sample patient loaded/i)).toBeVisible({ timeout: 20_000 })

    // The patient step should be pre-filled and marked complete.
    await expect(page.getByText('Eleanor Sample').first()).toBeVisible()
    await expect(page.getByText('✓ Done').first()).toBeVisible()

    // ── 3. Jump straight to review and run the analysis ───────────────────
    await page.getByRole('button', { name: /Ready for Analysis/ }).click()
    const runButton = page.getByRole('button', { name: /Run Analysis & Generate Report/ })
    await expect(runButton).toBeEnabled()
    await runButton.click()

    // ── 4. Results render — tolerant to MRI weight absence in CI ──────────
    // The pipeline completes even when the MRI model is unavailable (module
    // warning + retry card); cognitive/risk/fusion are rule-based and always
    // succeed. Assert on the results shell, not on a specific stage.
    await expect(
      page.getByText(/Main Result/i).first(),
    ).toBeVisible({ timeout: 120_000 })
    await expect(page.getByText(/How sure is the AI/i)).toBeVisible()
  })

  test('login rejects bad credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('dr_sarah').fill('doctor')
    await page.getByPlaceholder('••••••••').fill('wrong-password')
    await submitSignIn(page).click()
    await expect(page.getByText(/invalid|incorrect|failed/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
