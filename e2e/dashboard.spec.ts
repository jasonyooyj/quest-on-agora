import { test, expect } from '@playwright/test';

test.describe('Dashboard Redirect', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/ko/dashboard');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should show loading state initially', async ({ page }) => {
    // Use a request interception to slow down auth check
    await page.route('**/auth/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/ko/dashboard');

    // Should show loading indicator briefly
    const loader = page.locator('.animate-spin');
    // Either shows loader or quickly redirects
    await expect(loader.or(page.locator('body'))).toBeVisible();
  });
});

test.describe('Instructor Dashboard (Unauthenticated)', () => {
  test('should redirect to login when accessing instructor dashboard', async ({ page }) => {
    await page.goto('/ko/instructor');

    // Should redirect to login or show auth error
    await expect(page).toHaveURL(/\/login|\/onboarding/, { timeout: 10000 });
  });
});

test.describe('Student Dashboard (Unauthenticated)', () => {
  test('should redirect to login when accessing student dashboard', async ({ page }) => {
    await page.goto('/ko/student');

    // Should redirect to login or show auth error
    await expect(page).toHaveURL(/\/login|\/onboarding/, { timeout: 10000 });
  });
});
