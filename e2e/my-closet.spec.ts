import { test, expect } from "@playwright/test";

test.describe("My Closet", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("initial state shows empty state UI", async ({ page }) => {
    await expect(page.getByPlaceholder("의류 제품 URL 붙여넣기")).toBeVisible();
    await expect(page.getByText("URL을 입력하고 조회하면")).toBeVisible();
  });

  test("조회 button is disabled when input is empty", async ({ page }) => {
    await expect(page.getByRole("button", { name: "조회" })).toBeDisabled();
  });

  test("shows loading skeleton while fetching", async ({ page }) => {
    await page.getByPlaceholder("의류 제품 URL 붙여넣기").fill("https://example.com");
    await page.getByRole("button", { name: "조회" }).click();
    // Loading state: input becomes disabled
    await expect(page.getByRole("textbox")).toBeDisabled();
  });

  test("shows error for invalid URL format", async ({ page }) => {
    await page.getByPlaceholder("의류 제품 URL 붙여넣기").fill("not-a-url");
    await page.getByRole("button", { name: "조회" }).click();
    await expect(page.getByText(/유효하지 않은 URL/)).toBeVisible({ timeout: 15000 });
  });

  test("clear button resets URL and product info", async ({ page }) => {
    // Simulate a result state by filling and clearing
    await page.getByPlaceholder("의류 제품 URL 붙여넣기").fill("not-a-url");
    await page.getByRole("button", { name: "조회" }).click();
    await expect(page.getByRole("button", { name: /지우기/ })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /지우기/ }).click();
    await expect(page.getByPlaceholder("의류 제품 URL 붙여넣기")).toBeVisible();
    await expect(page.getByPlaceholder("의류 제품 URL 붙여넣기")).toHaveValue("");
    await expect(page.getByText("URL을 입력하고 조회하면")).toBeVisible();
  });

  test("loading indicator disappears after fetch completes", async ({ page }) => {
    await page.getByPlaceholder("의류 제품 URL 붙여넣기").fill("not-a-url");
    await page.getByRole("button", { name: "조회" }).click();
    // Wait for fetch to complete (error or success)
    await expect(page.getByRole("button", { name: /지우기/ })).toBeVisible({ timeout: 15000 });
    // Skeleton should be gone
    await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
  });
});
