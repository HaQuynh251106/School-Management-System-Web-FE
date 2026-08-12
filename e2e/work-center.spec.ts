import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const accounts = {
  admin: { username: 'admin', password: 'Admin123@@', route: 'quan-tri' },
  academic: { username: 'giaovu', password: 'Giaovu123@@', route: 'giao-vu' },
} as const;

async function login(browser: Browser, account: (typeof accounts)[keyof typeof accounts]) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/#/dang-nhap');
  await page.locator('input[autocomplete="username"]').fill(account.username);
  await page.locator('input[autocomplete="current-password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(`#/${account.route}/tong-quan$`));
  return { context, page };
}

async function openTask(page: Page, route: string, title: string) {
  await page.goto(`/#/${route}`);
  await expect(page.getByRole('heading', { name: 'Danh sách cần theo dõi' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm kiếm', exact: true }).fill(title);
  await expect(page).toHaveURL(/q=/);
  await page.locator('button.work-task-row').filter({ hasText: title }).click();
  await expect(page.getByRole('dialog', { name: 'Chi tiết công việc' })).toBeVisible();
}

test('giao việc, tiếp nhận và xác nhận hoàn thành giữa Admin và Giáo vụ', async ({ browser }) => {
  const title = `[E2E] Nghiệm thu điều phối ${Date.now()}`;
  const admin = await login(browser, accounts.admin);
  await admin.page.goto('/#/quan-tri/trung-tam-cong-viec');
  await admin.page.getByRole('button', { name: 'Giao công việc' }).click();
  const modal = admin.page.getByRole('dialog', { name: 'Tạo công việc mới' });
  await modal.getByLabel('Tiêu đề công việc *').fill(title);
  await modal.getByLabel('Mô tả kết quả cần đạt').fill('Kiểm tra luồng liên vai trò trên PostgreSQL thật');
  await modal.getByLabel('Hạn hoàn thành *').fill('2026-08-15');
  await modal.getByLabel('Checklist (mỗi dòng một việc)').fill('Đối chiếu dữ liệu\nXác nhận kết quả');
  await modal.getByRole('button', { name: 'Giao công việc' }).click();
  await expect(admin.page.getByRole('dialog', { name: 'Chi tiết công việc' })).toContainText(title);
  await admin.page.getByRole('button', { name: 'Đóng', exact: true }).click();

  const academic = await login(browser, accounts.academic);
  await openTask(academic.page, 'giao-vu/cong-viec-hoc-vu', title);
  const drawer = academic.page.getByRole('dialog', { name: 'Chi tiết công việc' });
  await drawer.getByRole('button', { name: 'Đã tiếp nhận' }).click();
  await drawer.getByRole('button', { name: 'Đang thực hiện' }).click();
  await drawer.locator('.work-actions textarea').fill('Đã kiểm tra và gửi xác nhận');
  await drawer.getByRole('button', { name: 'Chờ xác nhận' }).click();
  await expect(drawer.getByRole('button', { name: 'Hoàn thành' })).toHaveCount(0);

  await openTask(admin.page, 'quan-tri/trung-tam-cong-viec', title);
  await admin.page.getByRole('button', { name: 'Hoàn thành' }).click();
  await expect(admin.page.locator('.work-detail-meta .work-status')).toHaveText('Hoàn thành');

  await academic.context.close();
  await admin.context.close();
});

test('trung tâm công việc dùng được trên mobile, dark mode và không có lỗi accessibility nghiêm trọng', async ({ browser }) => {
  const academic = await login(browser, accounts.academic);
  await academic.page.setViewportSize({ width: 390, height: 844 });
  await academic.page.goto('/#/giao-vu/cong-viec-hoc-vu');

  await expect(academic.page.getByRole('heading', { name: 'Danh sách cần theo dõi' })).toBeVisible();
  await expect(academic.page.getByRole('textbox', { name: 'Tìm kiếm', exact: true })).toBeVisible();
  const overflow = await academic.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'Trang trung tâm công việc không được tràn ngang').toBeLessThanOrEqual(1);

  const darkToggle = academic.page.getByRole('button', { name: /chế độ tối/i });
  if (await darkToggle.count()) await darkToggle.click();
  const result = await new AxeBuilder({ page: academic.page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const blocking = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''));
  expect(blocking, blocking.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`)).join('\n')).toEqual([]);

  await academic.context.close();
});
