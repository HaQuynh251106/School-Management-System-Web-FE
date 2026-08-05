import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginWithFirstPasswordChange } from './helpers/login';

const password = process.env.E2E_ACADEMIC_STAFF_PASSWORD ?? '';

test.describe('Kho lưu trữ niên khóa', () => {
  test.skip(!password, 'Cần cấu hình E2E_ACADEMIC_STAFF_PASSWORD');

  test.beforeEach(async ({ page }) => {
    await loginWithFirstPasswordChange(page, {
      username: 'giaovu',
      password,
      changedPassword: process.env.E2E_ACADEMIC_STAFF_CHANGED_PASSWORD,
      landing: 'giao-vu',
    });
    await page.goto('/#/giao-vu/kho-luu-tru-nien-khoa');
    await expect(page.getByRole('heading', { name: 'Kho lưu trữ niên khóa', exact: true })).toBeVisible();
  });

  test('chọn khóa, lọc học sinh, mở hồ sơ ba năm và giữ bộ lọc khi quay lại', async ({ page }) => {
    const completedRow = page.locator('.archive-v2-cohort-table tbody tr').filter({ hasText: 'Hoàn thành' }).first();
    await expect(completedRow).toBeVisible();
    const cohortCode = (await completedRow.locator('td').first().locator('strong').textContent())?.trim() ?? '';
    await completedRow.getByRole('button').first().click();

    await expect(page).toHaveURL(/nien_khoa=/);
    await expect(page.getByRole('heading', { name: 'Danh sách học sinh niên khóa' })).toBeVisible();
    await expect(page.getByText(cohortCode, { exact: true }).first()).toBeVisible();

    const search = page.getByPlaceholder('Tên, mã học sinh hoặc email…');
    const firstStudentCode = await page.locator('.archive-v2-student-table tbody tr').first().locator('td').first().locator('small').textContent();
    const code = firstStudentCode?.split('·')[0].trim() ?? '';
    expect(code).not.toBe('');
    await search.fill(code);
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(code)}`));
    await expect(page.locator('.archive-v2-student-table tbody tr')).toHaveCount(1);

    await page.getByRole('button', { name: 'Xem hồ sơ' }).click();
    await expect(page).toHaveURL(/hoc_sinh=/);
    await expect(page.getByRole('heading', { name: 'Kết quả học tập lớp 10–12' })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(3);

    await page.getByRole('button', { name: 'Danh sách học sinh' }).click();
    await expect(page).not.toHaveURL(/hoc_sinh=/);
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(code)}`));
    await expect(search).toHaveValue(code);
  });

  test('xuất Excel và PDF theo đúng phạm vi đang lọc', async ({ page }) => {
    test.setTimeout(60_000);
    const completedRow = page.locator('.archive-v2-cohort-table tbody tr').filter({ hasText: 'Hoàn thành' }).first();
    await completedRow.getByRole('button').first().click();
    await expect(page.getByRole('heading', { name: 'Danh sách học sinh niên khóa' })).toBeVisible();
    await page.getByLabel('Lớp cuối cấp').selectOption({ index: 1 });
    await expect(page).toHaveURL(/lop=/);

    for (const name of ['Excel', 'PDF']) {
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name }).click();
      const download = await downloadPromise;
      expect(await download.failure()).toBeNull();
      expect(download.suggestedFilename().toLowerCase()).toMatch(name === 'Excel' ? /\.xlsx$/ : /\.pdf$/);
    }
  });

  test('không có lỗi accessibility nghiêm trọng trong phạm vi kho niên khóa', async ({ page }) => {
    const completedRow = page.locator('.archive-v2-cohort-table tbody tr').filter({ hasText: 'Hoàn thành' }).first();
    await completedRow.getByRole('button').first().click();
    await expect(page.getByRole('heading', { name: 'Danh sách học sinh niên khóa' })).toBeVisible();
    const result = await new AxeBuilder({ page }).include('.archive-v2').analyze();
    expect(result.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([]);
  });

  test('bố cục mobile không làm tràn toàn bộ trang', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Kho lưu trữ niên khóa', exact: true })).toBeVisible();
    const viewport = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(viewport.scroll).toBeLessThanOrEqual(viewport.width + 1);
    await expect(page.getByRole('button', { name: 'Làm mới' })).toBeVisible();
  });
});
