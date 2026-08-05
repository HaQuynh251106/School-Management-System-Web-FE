import { expect, test } from "@playwright/test";
import { loginWithFirstPasswordChange } from "./helpers/login";

const password = process.env.E2E_ACADEMIC_PASSWORD ?? "";

test("Giáo vụ sử dụng một quy trình phân công và xếp lịch gồm 7 bước", async ({
  page,
}) => {
  test.skip(!password, "Cần cấu hình E2E_ACADEMIC_PASSWORD");
  await loginWithFirstPasswordChange(page, {
    username: "giaovu",
    password,
    landing: "giao-vu",
  });

  await page.goto("/#/giao-vu/xep-thoi-khoa-bieu?tab=planning");
  await expect(page).toHaveURL(/buoc=du-lieu-dau-vao/);
  const workflow = page.getByRole("navigation", {
    name: "Quy trình phân công và xếp thời khóa biểu",
  });
  await expect(workflow).toBeVisible();
  await expect(workflow.getByRole("button")).toHaveCount(7);
  await expect(page.getByText(/duyệt tải dạy/i)).toHaveCount(0);
  await expect(page.getByText(/đăng ký tải dạy/i)).toHaveCount(0);

  await workflow.getByRole("button", { name: /Giáo viên & ngoại lệ/ }).click();
  await expect(page).toHaveURL(/buoc=giao-vien-ngoai-le/);
  await expect(
    page.getByRole("heading", { name: "Chỉ tiêu tải dạy và ngoại lệ lịch" }),
  ).toBeVisible();
  await expect(page.getByLabel("Tìm kiếm và lọc tải giáo viên")).toBeVisible();
  await expect(
    page.getByText(
      "Giáo viên không đăng ký tổng số tiết hoặc ngày nghỉ theo sở thích",
    ),
  ).toBeVisible();

  await workflow.getByRole("button", { name: /Kiểm tra & phát hành/ }).click();
  await expect(page).toHaveURL(/buoc=phat-hanh-thoi-khoa-bieu/);
  await expect(
    page.getByRole("heading", { name: "Kiểm tra và phát hành thời khóa biểu" }),
  ).toBeVisible();
  await expect(page.getByText("SUPERSEDED", { exact: true })).toHaveCount(0);
  await expect(page.getByText("VALIDATED", { exact: true })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(workflow).toBeVisible();
  const viewport = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    page: document.documentElement.clientWidth,
  }));
  expect(viewport.body).toBeLessThanOrEqual(viewport.page);
});
