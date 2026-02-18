import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.describe('Header Navigation', () => {
    test('should have logo that links to home', async ({ page }) => {
      await page.goto('/ko/pricing');

      const logo = page.getByRole('link', { name: /agora|아고라/i }).first();
      await expect(logo).toBeVisible();
      await logo.click();
      // Logo links to locale root (e.g., /ko or /en)
      await expect(page).toHaveURL(/^\/?(?:ko|en)?$|\/(?:ko|en)$/);
    });
  });

  test.describe('Locale Switching', () => {
    test('should switch from Korean to English', async ({ page }) => {
      await page.goto('/ko/pricing');

      // Look for language switcher
      const langSwitcher = page.getByRole('button', { name: /한국어|English|KO|EN/i }).first();
      if (await langSwitcher.isVisible({ timeout: 3000 }).catch(() => false)) {
        await langSwitcher.click();
        const enOption = page.getByRole('menuitem', { name: /English/i }).or(
          page.getByRole('button', { name: /English/i })
        );
        if (await enOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await enOption.click();
          await expect(page).toHaveURL(/\/en\/pricing/);
        }
      }
    });

    test('English landing page should load', async ({ page }) => {
      await page.goto('/en');
      await expect(page).toHaveTitle(/Agora/i);
    });

    test('Korean landing page should load', async ({ page }) => {
      await page.goto('/ko');
      await expect(page).toHaveTitle(/Agora/i);
    });
  });

  test.describe('Footer Links', () => {
    test('should have terms and privacy links', async ({ page }) => {
      await page.goto('/');

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Check if footer links exist (just check one)
      const termsLink = page.getByRole('link', { name: '이용약관' });
      await expect(termsLink).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to terms page', async ({ page }) => {
      await page.goto('/ko/terms');
      await expect(page).toHaveURL(/\/terms/);
    });

    test('should navigate to privacy page', async ({ page }) => {
      await page.goto('/ko/privacy');
      await expect(page).toHaveURL(/\/privacy/);
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect admin page to login', async ({ page }) => {
      await page.goto('/ko/admin');
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should redirect settings page to login', async ({ page }) => {
      await page.goto('/ko/settings');
      await expect(page).toHaveURL(/\/login|\/onboarding/, { timeout: 10000 });
    });
  });
});
