import { test, expect } from "@playwright/test";

test.describe("PA Source Page", () => {
  test("renders without crashing for an invalid token", async ({ page }) => {
    await page.goto("/pa-source/1/bad-token-regression-test");
    await expect(page.locator("body")).toBeVisible();
  });

  test('shows the "PA Audio Source" label', async ({ page }) => {
    await page.goto("/pa-source/1/bad-token-regression-test");
    await expect(page.getByText("PA Audio Source").first()).toBeVisible({ timeout: 8000 });
  });

  test("shows a mic icon and streaming status text", async ({ page }) => {
    await page.goto("/pa-source/1/bad-token-regression-test");
    const status = page.getByText(/Ready to stream|Connecting|Disconnected/i);
    await expect(status.first()).toBeVisible({ timeout: 8000 });
    const micIcon = page.locator("svg").first();
    await expect(micIcon).toBeAttached({ timeout: 5000 });
  });

  test('shows the "Start Streaming" button', async ({ page }) => {
    await page.goto("/pa-source/1/bad-token-regression-test");
    const btn = page.getByRole("button", { name: /Start Streaming/i });
    await expect(btn).toBeVisible({ timeout: 8000 });
  });
});
