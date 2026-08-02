import { expect, test } from '@playwright/test';
import { loginWithFirstPasswordChange } from './helpers/login';

test('Giáo viên mở hồ sơ hỗ trợ học sinh theo đúng lớp được phân công', async ({ page }) => {
  const password = process.env.E2E_TEACHER_PASSWORD ?? '';
  expect(password, 'Phải cấu hình E2E_TEACHER_PASSWORD').not.toBe('');
  await loginWithFirstPasswordChange(page, {
    username: 'gv.nguyenminh', password, landing: 'giao-vien',
  });

  await page.goto('/#/giao-vien/ho-tro-hoc-sinh');
  await expect(page.getByRole('heading', { level: 1, name: 'Hỗ trợ học sinh' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Theo dõi đúng người, phối hợp đúng lúc' })).toBeVisible();
  await expect(page.getByText(/Chỉ hiển thị lớp được phân công/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thêm ghi nhận' })).toBeEnabled();

  await page.getByRole('button', { name: 'Thêm ghi nhận' }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Thêm ghi nhận hỗ trợ' })).toBeVisible();
  await expect(page.getByText(/Giáo viên bộ môn ghi nhận hỗ trợ học tập|Nhóm hỗ trợ/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Đóng' }).click();
});
