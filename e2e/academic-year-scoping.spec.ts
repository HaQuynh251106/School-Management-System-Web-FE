import { expect, test } from '@playwright/test';
import { loginWithFirstPasswordChange } from './helpers/login';

test('Giáo vụ chỉ thấy lớp và học kỳ thuộc đúng năm học khi xếp lịch', async ({ page }) => {
  const password = process.env.E2E_ACADEMIC_STAFF_PASSWORD ?? '';
  expect(password, 'Thiếu E2E_ACADEMIC_STAFF_PASSWORD').toBeTruthy();
  await loginWithFirstPasswordChange(page, {
    username: 'giaovu', password,
    changedPassword: process.env.E2E_ACADEMIC_STAFF_CHANGED_PASSWORD,
    landing: 'giao-vu',
  });

  await page.goto('/#/giao-vu/xep-thoi-khoa-bieu?tab=timetable');
  const year = page.getByLabel('Năm học xếp thời khóa biểu');
  const schoolClass = page.getByLabel('Lớp xếp thời khóa biểu');
  const semester = page.getByLabel('Học kỳ xếp thời khóa biểu');
  await expect(year).toBeVisible();

  const yearValues = await year.locator('option').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
  // Năm đã đóng cố ý không xuất hiện trong màn hình vận hành/xếp lịch.
  expect(yearValues.length).toBeGreaterThanOrEqual(1);
  const yearLabels = await year.locator('option').allTextContents();
  expect(yearLabels.some((label) => label.includes('Đã đóng'))).toBe(false);

  for (const yearId of yearValues) {
    await year.selectOption(yearId);
    await expect(schoolClass.locator('option')).not.toHaveCount(1);
    const classValues = await schoolClass.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
    const semesterValues = await semester.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
    expect(classValues.length).toBe(36);
    expect(new Set(classValues).size).toBe(classValues.length);
    expect(semesterValues.length).toBe(2);
    expect(new Set(semesterValues).size).toBe(semesterValues.length);
  }

});
