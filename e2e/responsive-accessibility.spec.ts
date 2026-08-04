import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const viewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'wide-1920', width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`đăng nhập không mất chức năng ở ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#/dang-nhap');

    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    await expect(page.getByLabel('Tên đăng nhập')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Mật khẩu', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'Trang không được tràn ngang ngoài ý muốn').toBeLessThanOrEqual(1);

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });
}

test('dark mode giữ đầy đủ nhãn và trường nhập', async ({ page }) => {
  await page.goto('/#/dang-nhap');
  await page.getByRole('button', { name: 'Bật chế độ tối' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByLabel('Tên đăng nhập')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mật khẩu', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bật chế độ sáng' })).toBeVisible();
});

test('zoom 200% vẫn giữ thao tác đăng nhập', async ({ page }) => {
  await page.setViewportSize({ width: 683, height: 768 });
  await page.goto('/#/dang-nhap');
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await expect(page.getByLabel('Tên đăng nhập')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mật khẩu', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test(`không có lỗi accessibility nghiêm trọng ở chế độ ${theme}`, async ({ page }) => {
    await page.goto('/#/dang-nhap');
    if (theme === 'dark') await page.getByRole('button', { name: 'Bật chế độ tối' }).click();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const blocking = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''));
    const details = blocking.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`));
    expect(blocking.length, details.join('\n')).toBe(0);
  });
}
