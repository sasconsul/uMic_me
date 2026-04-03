import { test, expect } from "@playwright/test";

test.describe("uMic Deck", () => {
  test("page title is 'uMic.me Presentation'", async ({ page }) => {
    await page.goto("/umic-deck/");
    await expect.poll(() => page.title()).toBe("uMic.me Presentation");
  });

  test("slide 1 (/umic-deck/slide1) renders visible text content", async ({ page }) => {
    await page.goto("/umic-deck/slide1");
    await page.waitForTimeout(1000);
    const slides = page.locator("[style*='display: block'], [style*='display:block']");
    await expect(slides.first()).toBeVisible({ timeout: 8000 });
  });

  test("slide 1 contains the headline text in the DOM", async ({ page }) => {
    await page.goto("/umic-deck/slide1");
    await page.waitForTimeout(1000);
    const headline = page.getByText(/Stream audio to every seat/i);
    await expect(headline.first()).toBeVisible({ timeout: 8000 });
  });

  test("pressing ArrowRight from slide 1 navigates to slide 2", async ({ page }) => {
    await page.goto("/umic-deck/slide1");
    await page.waitForTimeout(1000);
    await page.keyboard.press("ArrowRight");
    await page.waitForURL(/slide\d+/, { timeout: 5000 });
    expect(page.url()).toMatch(/slide2/);
  });

  test("slide 2 route (/umic-deck/slide2) renders without crashing", async ({ page }) => {
    await page.goto("/umic-deck/slide2");
    await page.waitForTimeout(1000);
    const root = await page.locator("#root").innerHTML().catch(() => "");
    expect(root.length).toBeGreaterThan(100);
  });
});
