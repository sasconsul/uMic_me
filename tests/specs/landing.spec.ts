import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders the uMic.me brand name", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("uMic.me").first()).toBeVisible();
  });

  test('shows the "Host an Event" CTA button', async ({ page }) => {
    await page.goto("/");
    const cta = page
      .getByRole("link", { name: /Host an Event/i })
      .first();
    await expect(cta).toBeVisible();
  });

  test('shows a "Sign in" action when unauthenticated', async ({ page }) => {
    await page.goto("/");
    const signIn = page.getByText(/Sign in/i).first();
    await expect(signIn).toBeVisible();
  });

  test("page title is set", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
