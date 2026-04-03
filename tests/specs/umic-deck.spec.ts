import { test, expect } from "@playwright/test";

test.describe("uMic Deck", () => {
  test("page title is 'uMic.me Presentation'", async ({ page }) => {
    await page.goto("/umic-deck/");
    await expect.poll(() => page.title()).toBe("uMic.me Presentation");
  });

  test("slide 1 (/umic-deck/slide1) renders visible text content", async ({ page }) => {
    await page.goto("/umic-deck/slide1");
    await page.waitForTimeout(1000);
    const slide = page.locator("[style*='display: block'], [style*='display:block']");
    await expect(slide.first()).toBeVisible({ timeout: 8000 });
  });

  test("slide 1 contains the headline text in the DOM", async ({ page }) => {
    await page.goto("/umic-deck/slide1");
    await page.waitForTimeout(1000);
    const headline = page.getByText(/Stream audio to every seat/i);
    await expect(headline.first()).toBeVisible({ timeout: 8000 });
  });

  test("clicking Next in SlideViewer advances the presentation to slide 2", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/umic-deck/");

    const iframe = page.locator("iframe");
    await expect(iframe).toBeVisible({ timeout: 8000 });

    await page.waitForFunction(
      () => {
        const el = document.querySelector("iframe") as HTMLIFrameElement | null;
        if (!el) return false;
        try {
          return !!el.contentWindow?.document.querySelector("#root");
        } catch {
          return false;
        }
      },
      { timeout: 8000 }
    );

    const nextBtn = page.getByRole("button", { name: "Next slide" });
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await nextBtn.click();

    await page.waitForFunction(
      () => {
        const el = document.querySelector("iframe") as HTMLIFrameElement | null;
        if (!el) return false;
        try {
          return el.contentWindow?.location.href.includes("slide2") ?? false;
        } catch {
          return false;
        }
      },
      { timeout: 5000 }
    );
  });

  test("slide 2 route (/umic-deck/slide2) renders without crashing", async ({ page }) => {
    await page.goto("/umic-deck/slide2");
    await page.waitForTimeout(1000);
    const root = await page.locator("#root").innerHTML().catch(() => "");
    expect(root.length).toBeGreaterThan(100);
  });
});
