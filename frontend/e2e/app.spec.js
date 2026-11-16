// End-to-end: login → wizard (sample data) → analysis → results.
// Exercises the real stack: FastAPI backend + vite frontend.
import { test, expect } from '@playwright/test'

/* The sign-in submit button shares its name with the mode-switch tab; the
   submit button always lives inside the form. */
const submitSignIn = (page) => page.locator('form').getByRole('button', { name: 'Sign In' })

test.describe('clinical workflows & authentication', () => {
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
    await page.getByRole('button', { name: /Ready for Analysis/ }).first().click()
    await page.getByLabel(/verified the patient identity/i).check()
    const runButton = page.getByRole('button', { name: /Run Analysis & Generate Report/ })
    await expect(runButton).toBeEnabled()
    await runButton.click()

    // ── 4. Results render — tolerant to MRI weight absence in CI ──────────
    // The pipeline completes even when the MRI model is unavailable (module
    // warning + retry card); cognitive/risk/fusion are rule-based and always
    // succeed. Assert on the results shell, patient identity, and health summary.
    await expect(
      page.getByRole('heading', { name: 'Eleanor Sample' }),
    ).toBeVisible({ timeout: 120_000 })
    await expect(page.getByText(/Cognitive Health Summary|Mild Cognitive Changes/i).first()).toBeVisible()

    // ── 5. Dual-lens perspective: Clinician Workstation CDS ───────────────
    const clinicianTab = page.getByRole('button', { name: 'Clinician Workstation' })
    await expect(clinicianTab).toBeVisible()
    await clinicianTab.click()
    await expect(page.getByText(/Clinical Decision Support \(CDS\)/i)).toBeVisible()
    await expect(page.getByText(/Multimodal Fusion/i).first()).toBeVisible()

    // ── 6. PDF Export Menu Dropdown ──────────────────────────────────────
    const exportButton = page.getByRole('button', { name: /Download \/ Export/i })
    await expect(exportButton).toBeVisible()
    await exportButton.click()
    await expect(page.getByRole('button', { name: /Download PDF Report/i })).toBeVisible()
  })

  test('login rejects bad credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('dr_sarah').fill('doctor')
    await page.getByPlaceholder('••••••••').fill('wrong-password')
    await submitSignIn(page).click()
    await expect(page.getByText(/invalid|incorrect|failed/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('dashboard displays patient triage, cohort progression, and assessment registry', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('dr_sarah').fill('doctor')
    await page.getByPlaceholder('••••••••').fill('Doctor@123')
    await submitSignIn(page).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })

    // Verify clinical triage, cohort statistics, and dossier registry
    await expect(page.getByText(/Priority Clinical Attention/i)).toBeVisible()
    await expect(page.getByText(/Total Patients/i)).toBeVisible()
    await expect(page.getByText(/Evaluations Run/i)).toBeVisible()
    await expect(page.getByText(/Recent Patient Assessments/i)).toBeVisible()
  })

  test('auth lifecycle: registration, forgot password view, and logout', async ({ page }) => {
    const rand = Math.floor(Math.random() * 900000) + 100000
    const testUser = `doctor_${rand}`
    const testEmail = `doctor_${rand}@hospital.org`

    await page.goto('/login')
    // Click Create Account tab
    await page.getByRole('button', { name: 'Create Account' }).click()
    await page.getByLabel(/Full Name/i).fill('Dr. Test Specialist')
    await page.getByPlaceholder('dr_sarah').fill(testUser)
    await page.getByPlaceholder('sarah@hospital.org').fill(testEmail)
    await page.getByPlaceholder('City General Hospital').fill('St. Jude Neurological Center')
    await page.locator('input[type="date"]').fill('1985-05-15')
    await page.getByPlaceholder('••••••••').fill('Specialist@2026')
    // Check Terms & Conditions
    await page.getByRole('checkbox').click()
    await page.locator('form').getByRole('button', { name: 'Create Account' }).click()

    // Registration switches to Sign In mode with credentials ready
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible({ timeout: 15_000 })
    await submitSignIn(page).click()

    // Should redirect to dashboard upon successful sign-in
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
    await expect(page.getByText('Dr. Test Specialist').first()).toBeVisible()

    // Test Logout
    const signOutBtn = page.getByRole('button', { name: 'Sign out' }).first()
    await signOutBtn.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })

    // Test Forgot Password interface
    await page.getByRole('button', { name: /Forgot Password\?/i }).click()
    await expect(page.getByText('Reset Password')).toBeVisible()
    await expect(page.getByPlaceholder('doctor@hospital.org')).toBeVisible()
    // Back to Sign In
    await page.getByRole('button', { name: /Back to Sign In/i }).click()
    await expect(page.getByText('Sign In').first()).toBeVisible()
  })
})
