import { expect, test, type Page } from '@playwright/test';

const accounts = {
  admin: { username: 'admin', password: 'Admin123@@', route: 'quan-tri' },
  academic: { username: 'giaovu', password: 'Giaovu123@@', route: 'giao-vu' },
  accountant: { username: 'ketoan', password: 'Ketoan123@@', route: 'ke-toan' },
  teacher: { username: 'gv.nguyenminh', password: 'nguyenminh123@', route: 'giao-vien' },
} as const;

async function login(page: Page, account: (typeof accounts)[keyof typeof accounts]) {
  await page.goto('/#/dang-nhap');
  await page.locator('input[autocomplete="username"]').fill(account.username);
  await page.locator('input[autocomplete="current-password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(`#/${account.route}/tong-quan$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan' })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test('Dashboard Admin chỉ giữ chỉ số điều hành và lịch cấp trường', async ({ page }) => {
  await login(page, accounts.admin);
  await expect(page.getByRole('heading', { name: 'Người dùng hoạt động' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lịch tuần' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Phân bố vai trò' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('Dashboard Giáo vụ hiển thị trung tâm điều phối học vụ', async ({ page }) => {
  await login(page, accounts.academic);
  await expect(page.getByRole('heading', { name: 'Kế hoạch học vụ từ Thứ 2 đến Thứ 6' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tiến độ năm học' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Các vấn đề ảnh hưởng tiến độ' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('Dashboard Giáo vụ không vỡ bố cục trên máy tính bảng', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await login(page, accounts.academic);
  await expect(page.getByRole('region', { name: 'Chỉ số học vụ quan trọng' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tiến độ năm học' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('Dashboard Kế toán hiển thị tiền quá hạn và trạng thái đối soát', async ({ page }) => {
  await login(page, accounts.accountant);
  await expect(page.getByRole('heading', { name: 'Đối soát VietQR' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Biên nhận' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Theo dõi theo nhóm trạng thái' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('Dashboard Giáo viên ưu tiên công việc, lịch tuần và cơ cấu lớp chủ nhiệm', async ({ page }) => {
  await login(page, accounts.teacher);
  await expect(page.getByRole('heading', { name: 'Tuần làm việc từ Thứ 2 đến Thứ 6' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Lớp 10A1/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lịch vận hành học vụ' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('Dashboard Giáo viên dùng được ở màn hình nhỏ và dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, accounts.teacher);
  await page.getByRole('button', { name: 'Bật chế độ tối' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { name: 'Tuần làm việc từ Thứ 2 đến Thứ 6' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
