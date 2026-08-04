import { expect, test } from '@playwright/test';

const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1366', width: 1366, height: 768 },
  { name: '1920', width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  for (const theme of ['light', 'dark'] as const) {
    test(`visual đăng nhập ${theme} tại ${viewport.name}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript((selectedTheme) => localStorage.setItem('theme', selectedTheme), theme);
      await page.goto('/#/dang-nhap');
      await page.getByRole('heading', { name: 'Đăng nhập' }).waitFor();
      await page.locator('.login-visual img').evaluate((image: HTMLImageElement) => image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => image.addEventListener('load', () => resolve(), { once: true })));
      await expect(page).toHaveScreenshot(`login-${theme}-${viewport.name}.png`, {
        animations: 'disabled',
        fullPage: true,
      });
    });
  }
}
