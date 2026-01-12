import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      // Check for email and password inputs by placeholder
      await expect(page.getByPlaceholder('you@university.edu')).toBeVisible();
      await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByPlaceholder('you@university.edu').fill('invalid@test.com');
      await page.getByPlaceholder('••••••••').fill('wrongpassword');

      const submitButton = page.getByRole('button', { name: /로그인/ }).last();
      await submitButton.click();

      // Wait for error toast message
      await expect(page.getByText(/Invalid|잘못된|error|실패|login credentials/i)).toBeVisible({ timeout: 10000 });
    });

    test('should have link to register page', async ({ page }) => {
      await page.goto('/login');

      const registerLink = page.getByRole('link', { name: /회원가입/ });
      await expect(registerLink).toBeVisible();
    });

    test('should have OAuth buttons', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByRole('button', { name: /Google로 계속하기/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /카카오로 계속하기/ })).toBeVisible();
    });
  });

  test.describe('Register Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/register');

      // Check for name, email, password inputs
      await expect(page.getByPlaceholder('홍길동')).toBeVisible();
      await expect(page.getByPlaceholder('you@university.edu')).toBeVisible();
      await expect(page.getByPlaceholder('••••••••').first()).toBeVisible();
    });

    test('should have role selection buttons', async ({ page }) => {
      await page.goto('/register');

      await expect(page.getByRole('button', { name: /교수|강사/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /학생/ })).toBeVisible();
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/register');

      const loginLink = page.getByRole('link', { name: /로그인/ });
      await expect(loginLink).toBeVisible();
    });
  });
});
