import { expect, test, type Page } from '@playwright/test';
import { loginWithFirstPasswordChange } from './helpers/login';

type UatRole = {
  label: string;
  username: string;
  password: string;
  changedPassword?: string;
  landing: string;
  pages: string[];
};

const roles: UatRole[] = [
  {
    label: 'Quản trị', username: 'admin', password: process.env.E2E_ADMIN_PASSWORD ?? '', landing: 'quan-tri',
    pages: ['tong-quan', 'hoc-sinh', 'giao-vien', 'phu-huynh', 'nhan-su-van-hanh', 'vong-doi-tai-khoan', 'lich-su-he-thong', 'bao-cao-thong-ke', 'trung-tam-thong-bao'],
  },
  {
    label: 'Giáo vụ', username: 'giaovu', password: process.env.E2E_ACADEMIC_STAFF_PASSWORD ?? '', changedPassword: process.env.E2E_ACADEMIC_STAFF_CHANGED_PASSWORD, landing: 'giao-vu',
    pages: ['tong-quan', 'co-cau-dao-tao', 'xep-thoi-khoa-bieu', 'tao-ky-thi', 'tong-ket-chuyen-nam', 'kho-luu-tru-nien-khoa', 'hoc-ba-dien-tu'],
  },
  {
    label: 'Kế toán', username: 'ketoan', password: process.env.E2E_ACCOUNTANT_PASSWORD ?? '', changedPassword: process.env.E2E_ACCOUNTANT_CHANGED_PASSWORD, landing: 'ke-toan',
    pages: ['tong-quan', 'tai-chinh-noi-bo'],
  },
  {
    label: 'Giáo viên', username: 'gv.nguyenminh', password: process.env.E2E_TEACHER_PASSWORD ?? '', landing: 'giao-vien',
    pages: ['tong-quan', 'lop-duoc-phan-cong', 'dang-ky-tai-day', 'so-dau-bai-dieu-chinh-lich', 'ho-tro-hoc-sinh', 'thoi-khoa-bieu', 'diem-danh', 'bang-diem', 'bai-tap', 'trao-doi', 'thong-bao', 'cong-no-lop-chu-nhiem', 'duyet-don-xin-nghi', 'bao-cao-giang-day', 'ho-so-cai-dat', 'khao-thi', 'hoc-ba-lop-chu-nhiem'],
  },
  {
    label: 'Học sinh', username: 'hs.nguyenminhan', password: process.env.E2E_STUDENT_PASSWORD ?? '', landing: 'hoc-sinh',
    pages: ['tong-quan', 'ho-so-ca-nhan', 'theo-doi-hoc-tap', 'chuyen-can', 'bai-tap', 'thong-bao', 'xin-nghi-hoc', 'trao-doi', 'bao-cao-ca-nhan', 'ho-so-cai-dat', 'thi-phuc-khao', 'hoc-ba-dien-tu'],
  },
  {
    label: 'Phụ huynh', username: 'ph.nguyenvanhung', password: process.env.E2E_PARENT_PASSWORD ?? '', landing: 'phu-huynh',
    pages: ['tong-quan', 'chon-hoc-sinh', 'hoc-tap-cua-con', 'lien-lac-giao-vien-chu-nhiem', 'hoc-phi-thanh-toan', 'thong-bao', 'xac-nhan-nghi-hoc', 'bao-cao-cua-con', 'ho-so-cai-dat', 'lich-thi-cua-con', 'hoc-ba-cua-con'],
  },
];

async function login(page: Page, role: UatRole) {
  await loginWithFirstPasswordChange(page, role);
}

test.beforeAll(async ({ request }) => {
  expect(roles.every((role) => role.password), 'Phải cấu hình đủ mật khẩu UAT cho sáu vai trò').toBeTruthy();
  const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:4000';
  expect((await request.get(`${apiUrl}/health`)).ok(), 'Backend UAT phải hoạt động').toBeTruthy();
});

for (const role of roles) {
  test(`${role.label}: mở toàn bộ chức năng không phát sinh lỗi giao diện hoặc HTTP 5xx`, async ({ page }) => {
    const pageErrors: string[] = [];
    const serverErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
    });

    await login(page, role);
    for (const path of role.pages) {
      await page.goto(`/#/${role.landing}/${path}`);
      await expect(page).toHaveURL(new RegExp(`#/${role.landing}/${path}(?:\\?|$)`));
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toHaveCount(0);
    }

    expect(pageErrors, `JavaScript errors của ${role.label}`).toEqual([]);
    expect(serverErrors, `HTTP 5xx của ${role.label}`).toEqual([]);
  });
}
