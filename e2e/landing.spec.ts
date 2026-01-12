import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Agora/i);
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Check for login/register links or buttons
    const loginLink = page.getByRole('link', { name: /로그인|login/i });
    const registerLink = page.getByRole('link', { name: /회원가입|register|sign up/i });

    await expect(loginLink.or(registerLink)).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    const loginLink = page.getByRole('link', { name: /로그인|login/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
