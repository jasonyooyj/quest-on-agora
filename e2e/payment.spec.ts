import { test, expect } from '@playwright/test';

test.describe('Payment / Pricing', () => {
  test.setTimeout(20000);
  test.describe('Pricing Page', () => {
    test('가격 페이지가 로드되고 요금제 섹션이 보인다', async ({ page }) => {
      await page.goto('/ko/pricing');

      await expect(page.getByRole('heading', { name: /투명하고 합리적인 가격/i })).toBeVisible();
      await expect(page.locator('#pricing').getByText('요금제')).toBeVisible();
      await expect(page.getByText(/월 결제|연 결제/).first()).toBeVisible();
    });

    test('무료, Pro, Max, 기관 플랜 카드가 보인다', async ({ page }) => {
      await page.goto('/ko/pricing');

      await expect(page.getByText('무료', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Max', { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/Institution|기관/).first()).toBeVisible();
    });

    test('연/월 결제 토글이 있고 기본은 연 결제', async ({ page }) => {
      await page.goto('/ko/pricing');

      await expect(page.locator('#pricing').getByText(/연 결제|월 결제/).first()).toBeVisible();
      await expect(page.getByText('2개월 무료')).toBeVisible();
    });

    test('무료로 시작하기 클릭 시 회원가입 페이지로 이동', async ({ page }) => {
      await page.goto('/ko/pricing');

      const freeCta = page.locator('#pricing').getByRole('button', { name: /무료로 시작하기/ });
      await expect(freeCta).toBeVisible();
      await freeCta.click();

      await expect(page).toHaveURL(/\/ko\/register/);
    });

    test('기관 플랜 CTA는 도입 문의하기이고 클릭 시 checkout으로 가지 않음', async ({ page }) => {
      await page.goto('/ko/pricing');

      const institutionCta = page.locator('#pricing').getByRole('button', { name: /도입 문의하기/ });
      await expect(institutionCta).toBeVisible();
      await institutionCta.click();
      await page.waitForTimeout(500);
      await expect(page).not.toHaveURL(/\/checkout\/toss/);
    });
  });

  test.describe('Checkout (비로그인)', () => {
    test('Pro 시작하기 클릭 시 로그인 리다이렉트 또는 에러 처리', async ({ page }) => {
      await page.goto('/ko/pricing');

      const proCta = page.locator('#pricing').getByRole('button', { name: /Pro 시작하기/ });
      await proCta.waitFor({ state: 'visible', timeout: 15000 });
      await proCta.click();

      // 플랜 있음: 401 → /ko/login. 플랜 없음: 토스트 후 pricing 유지. 둘 다 checkout/toss로 가지 않으면 성공
      await page.waitForTimeout(3000);
      const url = page.url();
      expect(url).not.toMatch(/\/checkout\/toss/);
      if (url.includes('/login')) {
        expect(url).toMatch(/\/ko\/login/);
      }
    });

    test('Max 시작하기 클릭 시 로그인 리다이렉트 또는 에러 처리', async ({ page }) => {
      await page.goto('/ko/pricing');

      const maxCta = page.locator('#pricing').getByRole('button', { name: /Max 시작하기/ });
      await maxCta.waitFor({ state: 'visible', timeout: 15000 });
      await maxCta.click();

      await page.waitForTimeout(3000);
      const url = page.url();
      expect(url).not.toMatch(/\/checkout\/toss/);
      if (url.includes('/login')) {
        expect(url).toMatch(/\/ko\/login/);
      }
    });

    test('POST /api/checkout 비로그인 시 401 반환', async ({ request }) => {
      const response = await request.post('/api/checkout', {
        data: {
          planId: '00000000-0000-0000-0000-000000000002',
          billingInterval: 'monthly',
          locale: 'ko',
        },
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toMatch(/로그인|login/i);
    });
  });

  test.describe('Pricing page EN locale', () => {
    test('English pricing page shows plan names and toggle', async ({ page }) => {
      await page.goto('/en/pricing');

      await expect(page.getByText(/Monthly|Yearly/).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Max', { exact: true }).first()).toBeVisible();
    });
  });
});
