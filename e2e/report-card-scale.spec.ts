import { expect, test } from '@playwright/test';
import { loginWithFirstPasswordChange } from './helpers/login';

test('Học bạ dữ liệu lớn tải theo lớp rồi theo học sinh, không treo toàn trang', async ({ page }) => {
  const password = process.env.E2E_ACADEMIC_STAFF_PASSWORD ?? '';
  expect(password, 'Thiếu E2E_ACADEMIC_STAFF_PASSWORD').toBeTruthy();
  await loginWithFirstPasswordChange(page, {
    username: 'giaovu', password,
    changedPassword: process.env.E2E_ACADEMIC_STAFF_CHANGED_PASSWORD,
    landing: 'giao-vu',
  });

  await page.goto('/#/giao-vu/hoc-ba-dien-tu');
  await expect(page.getByRole('heading', { level: 1, name: '5. Học bạ điện tử' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Học bạ điện tử toàn trường' })).toBeVisible();

  const openClass = page.getByRole('button', { name: /Mở danh sách lớp/ }).first();
  await expect(openClass).toBeVisible({ timeout: 15_000 });
  await openClass.click();
  await expect(page.getByRole('heading', { level: 3, name: /Danh sách học sinh lớp/ })).toBeVisible({ timeout: 15_000 });

  const studentRows = page.locator('.report-student-table tbody tr');
  await expect(studentRows).not.toHaveCount(0);
  expect(await studentRows.count()).toBeLessThanOrEqual(10);

  await page.getByRole('button', { name: /Xem học bạ/ }).first().click();
  await expect(page.getByText('Chi tiết học bạ', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Đang tải dữ liệu')).toHaveCount(0);
});
