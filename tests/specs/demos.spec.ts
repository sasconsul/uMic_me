import { test, expect } from "@playwright/test";

test.describe("Demos Page", () => {
  test("renders without crashing", async ({ page }) => {
    await page.goto("/demos");
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows a visible link to the uMic.me deck", async ({ page }) => {
    await page.goto("/demos");
    const deckLink = page.getByRole("link", { name: /deck|Deck|Presentation|slide/i }).first();
    await expect(deckLink).toBeVisible();
  });

  test("page does not show a React 404", async ({ page }) => {
    await page.goto("/demos");
    const h1 = page.getByRole("heading", { name: "404" });
    await expect(h1).not.toBeVisible();
  });

  test("shows the uMic.me brand name", async ({ page }) => {
    await page.goto("/demos");
    await expect(page.getByText("uMic.me").first()).toBeVisible();
  });
});
