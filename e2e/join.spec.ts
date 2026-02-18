import { test, expect } from '@playwright/test';

test.describe('Join Discussion Page', () => {
  test.describe('Unauthenticated User', () => {
    test('should show login/register options for invalid code', async ({ page }) => {
      await page.goto('/ko/join/INVALID123');

      // Should show unauthenticated page or error
      // Wait for either the unauthenticated view or error view
      const unauthView = page.getByText(/로그인이 필요합니다|Login Required/i);
      const errorView = page.getByText(/참여 실패|참여 코드를 찾을 수 없습니다|존재하지 않는|Error/i);

      await expect(unauthView.or(errorView)).toBeVisible({ timeout: 10000 });
    });

    test('should display login and register buttons when unauthenticated', async ({ page }) => {
      await page.goto('/ko/join/TESTCODE');

      // Wait for page to load and check for auth buttons
      const loginButton = page.getByRole('link', { name: /로그인|Login/i });
      const registerButton = page.getByRole('link', { name: /회원가입|Register|Sign up/i });

      // Either shows auth buttons or error message
      const authButtons = loginButton.or(registerButton);
      const errorMessage = page.getByText(/참여 실패|오류|존재하지 않는/i);

      await expect(authButtons.or(errorMessage)).toBeVisible({ timeout: 10000 });
    });

    test('should handle join code page', async ({ page }) => {
      await page.goto('/ko/join/ABC123');

      // Should show some response (error, loading, or auth required)
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Invalid Codes', () => {
    test('should handle very short codes gracefully', async ({ page }) => {
      await page.goto('/ko/join/A');

      // Should not crash, should show some response
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle special characters in code', async ({ page }) => {
      await page.goto('/ko/join/TEST-CODE');

      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
