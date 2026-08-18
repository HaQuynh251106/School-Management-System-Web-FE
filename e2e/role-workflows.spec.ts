import { expect, test, type Page } from '@playwright/test';

type Account = {
  role: string;
  username: string;
  password: string;
  landing: string;
  corePath: string;
  coreTitle: string;
};

const accounts: Account[] = [
  { role: 'Quản trị', username: 'admin', password: process.env.E2E_ADMIN_PASSWORD ?? '', landing: 'quan-tri', corePath: 'quan-tri/hoc-sinh', coreTitle: 'Học sinh' },
  { role: 'Giáo viên', username: 'gv.nguyenminh', password: process.env.E2E_TEACHER_PASSWORD ?? '', landing: 'giao-vien', corePath: 'giao-vien/diem-danh', coreTitle: 'Sổ điểm danh' },
  { role: 'Học sinh', username: 'hs.nguyenminhan', password: process.env.E2E_STUDENT_PASSWORD ?? '', landing: 'hoc-sinh', corePath: 'hoc-sinh/theo-doi-hoc-tap', coreTitle: 'Theo dõi học tập' },
  { role: 'Phụ huynh', username: 'ph.nguyenvanhung', password: process.env.E2E_PARENT_PASSWORD ?? '', landing: 'phu-huynh', corePath: 'phu-huynh/hoc-phi-thanh-toan', coreTitle: 'Học phí' },
];

async function login(page: Page, account: Account) {
  await page.goto('/#/dang-nhap');
  await page.locator('input[autocomplete="username"]').fill(account.username);
  await page.locator('input[autocomplete="current-password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(`#/${account.landing}/tong-quan$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan' })).toBeVisible();
}

test.beforeAll(async ({ request }) => {
  expect(accounts.every((account) => account.password.length > 0), 'Phải cấu hình đủ 4 biến E2E_*_PASSWORD').toBeTruthy();
  const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:4000';
  const health = await request.get(`${apiUrl}/health`);
  expect(health.ok(), 'Backend phải chạy trước khi thực hiện E2E').toBeTruthy();
});

for (const account of accounts) {
  test(`${account.role}: đăng nhập, khôi phục phiên và mở chức năng lõi`, async ({ page }) => {
    await login(page, account);

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`#/${account.landing}/tong-quan$`));
    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan' })).toBeVisible();

    await page.goto(`/#/${account.corePath}`);
    await expect(page).toHaveURL(new RegExp(`#/${account.corePath}`));
    await expect(page.getByRole('heading', { level: 1, name: account.coreTitle })).toBeVisible();
  });

  test(`${account.role}: không thể mở URL của vai trò khác`, async ({ page }) => {
    await login(page, account);
    const forbidden = account.landing === 'quan-tri' ? 'giao-vien/diem-danh' : 'quan-tri/hoc-sinh';
    await page.goto(`/#/${forbidden}`);
    await expect(page).toHaveURL(new RegExp(`#/${account.landing}/tong-quan$`));
  });
}
