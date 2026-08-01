import { expect, type Page } from '@playwright/test';

export type E2ELoginAccount = {
  username: string;
  password: string;
  changedPassword?: string;
  landing: string;
};

/**
 * Đăng nhập được cả tài khoản thường và tài khoản vừa được admin cấp/reset.
 * Khi gặp mật khẩu tạm, helper hoàn tất màn hình bắt buộc đổi mật khẩu rồi
 * đăng nhập lại bằng mật khẩu UAT mới.
 */
export async function loginWithFirstPasswordChange(page: Page, account: E2ELoginAccount) {
  const candidates = [...new Set([account.password, account.changedPassword].filter(Boolean) as string[])];
  let lastMessage = '';

  for (const password of candidates) {
    await page.goto('/#/dang-nhap');
    await page.locator('input[autocomplete="username"]').fill(account.username);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    try {
      await page.waitForURL(new RegExp(`#/${account.landing}/tong-quan$`), { timeout: 5_000 });
    } catch {
      lastMessage = await page.locator('.login-error').textContent().catch(() => '') || 'Đăng nhập không thành công';
      continue;
    }

    const firstChange = page.getByRole('heading', { level: 1, name: 'Đổi mật khẩu lần đầu' });
    if (await firstChange.count()) {
      expect(account.changedPassword, `Thiếu mật khẩu UAT mới cho ${account.username}`).toBeTruthy();
      expect(account.changedPassword).not.toBe(password);
      await page.getByLabel('Mật khẩu hiện tại').fill(password);
      const newPasswordFields = page.locator('input[autocomplete="new-password"]');
      await expect(newPasswordFields).toHaveCount(2);
      await newPasswordFields.nth(0).fill(account.changedPassword!);
      await newPasswordFields.nth(1).fill(account.changedPassword!);
      await page.getByRole('button', { name: 'Đổi mật khẩu và đăng nhập lại' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeVisible();

      await page.locator('input[autocomplete="username"]').fill(account.username);
      await page.locator('input[autocomplete="current-password"]').fill(account.changedPassword!);
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(new RegExp(`#/${account.landing}/tong-quan$`));
    }

    await expect(page.getByRole('heading', { level: 1, name: 'Tổng quan' })).toBeVisible();
    return;
  }

  throw new Error(`${account.username}: ${lastMessage}`);
}
