import { test, expect } from "@playwright/test";

test.describe("Join Page", () => {
  test("renders without crashing for an unknown token", async ({ page }) => {
    await page.goto("/join/invalid-token-xyz-regression-test");
    await expect(page.locator("body")).toBeVisible();
  });

  test("does not show a blank page — has some visible content", async ({ page }) => {
    await page.goto("/join/invalid-token-xyz-regression-test");
    const text = await page.locator("body").innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("does not render the React 404 fallback", async ({ page }) => {
    await page.goto("/join/invalid-token-xyz-regression-test");
    const notFound = page.getByRole("heading", { name: "404" });
    await expect(notFound).not.toBeVisible();
  });
});
