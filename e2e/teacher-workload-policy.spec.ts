import { expect, test } from '@playwright/test';
import { loginWithFirstPasswordChange } from './helpers/login';

const password = process.env.E2E_TEACHER_PASSWORD ?? '';

test('giáo viên chỉ gửi ngoại lệ lịch có căn cứ, không tự đăng ký tải dạy', async ({ page }) => {
  test.skip(!password, 'Cần cấu hình E2E_TEACHER_PASSWORD');
  await loginWithFirstPasswordChange(page, {
    username: 'gv.nguyenminh', password, landing: 'giao-vien',
  });

  await page.goto('/#/giao-vien/dieu-kien-giang-day');
  await expect(page).toHaveURL(/giao-vien\/de-nghi-han-che-lich-day/);
  await expect(page.getByRole('heading', { level: 1, name: 'Đề nghị hạn chế lịch dạy' })).toBeVisible();
  await expect(page.getByText('Định mức do hệ thống quản lý, không phải nội dung đăng ký')).toBeVisible();
  await expect(page.getByText(/Định mức cơ sở/)).toBeVisible();
  await expect(page.getByText(/17 tiết/).first()).toBeVisible();
  await expect(page.getByLabel(/Tổng số tiết|Số tiết mong muốn/i)).toHaveCount(0);
  await expect(page.getByText('Khối lớp ưu tiên')).toHaveCount(0);
  await expect(page.getByText('Ngày muốn được nghỉ')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tạo đề nghị' })).toBeVisible();
});
