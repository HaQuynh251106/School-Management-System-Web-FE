import { expect, test, type Browser } from '@playwright/test';
import { loginWithFirstPasswordChange } from './helpers/login';

const enabled = process.env.E2E_TIMETABLE_PUBLICATION_MUTATION === '1';
const accounts = {
  academic: {
    username: process.env.E2E_ACADEMIC_USERNAME ?? 'giaovu',
    password: process.env.E2E_ACADEMIC_PASSWORD ?? '',
    landing: 'giao-vu',
  },
  teacher: {
    username: process.env.E2E_TEACHER_USERNAME ?? '',
    password: process.env.E2E_TEACHER_PASSWORD ?? '',
    landing: 'giao-vien',
  },
  student: {
    username: process.env.E2E_STUDENT_USERNAME ?? '',
    password: process.env.E2E_STUDENT_PASSWORD ?? '',
    landing: 'hoc-sinh',
  },
  parent: {
    username: process.env.E2E_PARENT_USERNAME ?? '',
    password: process.env.E2E_PARENT_PASSWORD ?? '',
    landing: 'phu-huynh',
  },
};

type RecipientAccount = (typeof accounts)[keyof typeof accounts];

async function verifyRecipient(browser: Browser, account: RecipientAccount, route: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await loginWithFirstPasswordChange(page, account);
    await page.goto(route);
    const notification = page
      .locator('.notification-inbox-item')
      .filter({ hasText: /Thời khóa biểu chính thức/i })
      .first();
    await expect(notification).toBeVisible();
    await notification.getByRole('button', { name: 'Mở thời khóa biểu' }).click();
    await expect(page).toHaveURL(/thoi-khoa-bieu|theo-doi-hoc-tap|hoc-tap-cua-con/);
  } finally {
    await context.close();
  }
}

test('phát hành lịch gửi đúng thông báo và liên kết cho các vai trò', async ({ page, browser }) => {
  test.skip(
    !enabled,
    'Bật E2E_TIMETABLE_PUBLICATION_MUTATION=1 để cho phép phát hành lịch trên DB kiểm thử',
  );
  test.skip(
    Object.values(accounts).some((account) => !account.password || !account.username),
    'Cần cấu hình tài khoản Giáo vụ, Giáo viên, Học sinh và Phụ huynh',
  );

  await loginWithFirstPasswordChange(page, accounts.academic);
  await page.goto('/#/giao-vu/xep-thoi-khoa-bieu?tab=planning&buoc=phat-hanh-thoi-khoa-bieu');
  const publish = page.getByRole('button', { name: /^Phát hành$/ }).first();
  test.skip(await publish.count() === 0, 'DB kiểm thử chưa có phiên bản nháp hợp lệ để phát hành');
  await publish.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Bản nháp và bản xem trước không tạo thông báo/)).toBeVisible();
  await dialog.getByLabel('Tên phiên bản chính thức *').fill(`TKB E2E ${Date.now()}`);
  await dialog
    .getByLabel('Lý do phát hành hoặc thay thế *')
    .fill('Kiểm thử end-to-end thông báo phát hành thời khóa biểu');
  await dialog.getByRole('button', { name: 'Xác nhận phát hành' }).click();
  await expect(page.getByText(/Đã chuyển thông báo|Đang chuyển thông báo/)).toBeVisible();

  await verifyRecipient(browser, accounts.teacher, '/#/giao-vien/thong-bao');
  await verifyRecipient(browser, accounts.student, '/#/hoc-sinh/thong-bao');
  await verifyRecipient(browser, accounts.parent, '/#/phu-huynh/thong-bao');
});
