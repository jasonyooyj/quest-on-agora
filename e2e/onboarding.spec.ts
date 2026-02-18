import { test, expect } from '@playwright/test';

test.describe('Onboarding Page', () => {
  test('should display onboarding form', async ({ page }) => {
    await page.goto('/ko/onboarding');

    // Check for role selection buttons
    await expect(page.getByRole('button', { name: /강사|Instructor/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /학생|Student/i })).toBeVisible();
  });

  test('should have name input field', async ({ page }) => {
    await page.goto('/ko/onboarding');

    // Check for name input
    const nameInput = page.getByPlaceholder('홍길동');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
  });

  test('should toggle role selection', async ({ page }) => {
    await page.goto('/ko/onboarding');

    // Click student role
    const studentButton = page.getByRole('button', { name: /학생|Student/i });
    await studentButton.waitFor({ state: 'visible', timeout: 10000 });
    await studentButton.click();

    // Student fields should appear (학번, 학교, 학과)
    await expect(page.getByPlaceholder('20231234')).toBeVisible();
    await expect(page.getByPlaceholder('홍익대학교')).toBeVisible();
    await expect(page.getByPlaceholder('컴퓨터공학과')).toBeVisible();
  });

  test('should hide student fields when instructor is selected', async ({ page }) => {
    await page.goto('/ko/onboarding');

    // First click student to show fields
    const studentButton = page.getByRole('button', { name: /학생|Student/i });
    await studentButton.waitFor({ state: 'visible', timeout: 10000 });
    await studentButton.click();
    await expect(page.getByPlaceholder('20231234')).toBeVisible();

    // Then click instructor to hide them
    const instructorButton = page.getByRole('button', { name: /강사|Instructor/i });
    await instructorButton.click();
    await expect(page.getByPlaceholder('20231234')).not.toBeVisible();
  });

  test('should have submit button', async ({ page }) => {
    await page.goto('/ko/onboarding');

    const submitButton = page.getByRole('button', { name: /시작하기|완료|Submit|Start/i });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
  });

  test('should show validation error for empty name', async ({ page }) => {
    await page.goto('/ko/onboarding');

    // Try to submit without name
    const submitButton = page.getByRole('button', { name: /시작하기|완료|Submit|Start/i });
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    await submitButton.click();

    // Should show validation error
    await expect(page.getByText(/이름|name|필수|required/i)).toBeVisible({ timeout: 5000 });
  });
});
