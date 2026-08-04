import { expect, test } from '@playwright/test';
import { loginWithFirstPasswordChange } from './helpers/login';

test('Bảng điểm giữ bản nháp qua reload, import xem trước và hoàn tác không ghi dữ liệu thật', async ({ page }) => {
  const password = process.env.E2E_TEACHER_PASSWORD ?? '';
  expect(password, 'Phải cấu hình E2E_TEACHER_PASSWORD').not.toBe('');
  await loginWithFirstPasswordChange(page, {
    username: 'gv.nguyenminh', password, landing: 'giao-vien',
  });

  // Mỗi lượt chạy phải bắt đầu từ dữ liệu máy chủ; bản nháp từ lần chạy trước
  // không được làm thay đổi mốc so sánh của kịch bản hiện tại.
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('gradebook-draft:'))
      .forEach((key) => localStorage.removeItem(key));
  });

  await page.goto('/#/giao-vien/bang-diem');
  await expect(page.getByRole('heading', { level: 1, name: 'Bảng điểm' })).toBeVisible();
  await expect(page.getByText('Dữ liệu đã đồng bộ')).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/(?=.*class=)(?=.*semester=)(?=.*subject=)/);

  const firstScore = page.locator('.gradebook-score-input:not(.locked)').first();
  await expect(firstScore).toBeVisible();
  const original = await firstScore.inputValue();
  const replacement = original === '8.5' ? '7.5' : '8.5';
  await firstScore.fill(replacement);
  await expect(page.getByText('Có thay đổi chưa lưu')).toBeVisible();
  await expect(page.getByText(/Bản nháp tự động lưu lúc/)).toBeVisible({ timeout: 5_000 });

  page.once('dialog', (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByText('Đã khôi phục bản nháp')).toBeVisible({ timeout: 15_000 });
  await expect(firstScore).toHaveValue(replacement);

  await page.getByRole('button', { name: 'Hoàn tác chưa lưu' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Hoàn tác thay đổi' }).click();
  await expect(firstScore).toHaveValue(original);
  await expect(page.getByText('Dữ liệu đã đồng bộ')).toBeVisible();

  const firstStudentCode = (await page.locator('.teacher-gradebook-table tbody tr').first().locator('td').first().locator('small').textContent())?.trim();
  const firstColumnLabel = (await page.locator('.teacher-gradebook-table thead th').nth(1).locator('span').textContent())?.trim();
  expect(firstStudentCode).toBeTruthy();
  expect(firstColumnLabel).toBeTruthy();
  const fileInput = page.locator('input[type="file"][accept*="csv"]');
  await fileInput.setInputFiles({
    name: 'diem-xem-truoc.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`Mã học sinh;${firstColumnLabel}\n${firstStudentCode};9`, 'utf8'),
  });
  await expect(page.getByRole('heading', { level: 3, name: 'Xem trước dữ liệu điểm import' })).toBeVisible();
  await expect(page.getByText('Tệp hợp lệ và sẵn sàng')).toBeVisible();
  await expect(page.getByText('Điểm hợp lệ').locator('..').getByText('1')).toBeVisible();
  await page.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
  await expect(page.getByText('Có thay đổi chưa lưu')).toBeVisible();

  await page.getByRole('button', { name: 'Hoàn tác chưa lưu' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Hoàn tác thay đổi' }).click();
  await expect(page.getByText('Dữ liệu đã đồng bộ')).toBeVisible();
});

test('Bộ lọc nghiệp vụ giáo viên được đồng bộ vào URL', async ({ page }) => {
  const password = process.env.E2E_TEACHER_PASSWORD ?? '';
  await loginWithFirstPasswordChange(page, {
    username: 'gv.nguyenminh', password, landing: 'giao-vien',
  });

  await page.goto('/#/giao-vien/bai-tap');
  const search = page.getByPlaceholder('Tìm tiêu đề, môn hoặc lớp…');
  await expect(search).toBeVisible();
  await search.fill('ôn tập');
  await expect(page).toHaveURL(/q=%C3%B4n(?:%20|\+)t%E1%BA%ADp/i);
  await page.getByLabel('Lọc trạng thái bài tập').selectOption('PUBLISHED');
  await expect(page).toHaveURL(/status=PUBLISHED/);

  await page.goto('/#/giao-vien/so-dau-bai-dieu-chinh-lich');
  await page.getByPlaceholder('Tìm lớp, môn hoặc phòng').fill('10A1');
  await expect(page).toHaveURL(/q=10A1/i);
  await page.getByText('Trạng thái sổ').locator('..').getByRole('combobox').selectOption('MISSING');
  await expect(page).toHaveURL(/diary=MISSING/);
});
