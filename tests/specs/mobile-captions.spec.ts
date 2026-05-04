import { test, expect } from "@playwright/test";

const attendeePath = "/attend/test-token/88";

const joinData = JSON.stringify({
  eventId: 2,
  displayName: "Mobile User",
  sessionToken: "tok-mobile",
  eventTitle: "Mobile Caption Event",
  assignedId: 88,
});

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("Mobile Captions — Attendee (390×844 / iPhone)", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const _instances: any[] = [];
      (window as any).__mockWsInstances = _instances;
      (window as any).__mockWsSend = (data: string) => {
        for (const inst of _instances) {
          if (inst.readyState === 1 && inst._onmessage) {
            inst._onmessage({ data });
          }
        }
      };
      (window as any).__mockWsClose = () => {
        const last = _instances[_instances.length - 1];
        if (last) last.close();
      };

      (window as any).WebSocket = class MockWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        CONNECTING = 0;
        OPEN = 1;
        CLOSING = 2;
        CLOSED = 3;
        readyState = 1;
        url: string;
        _onmessage: ((ev: any) => void) | null = null;
        _onopen: ((ev: any) => void) | null = null;
        _onclose: ((ev: any) => void) | null = null;
        _onerror: ((ev: any) => void) | null = null;
        _listeners: Record<string, Function[]> = {};
        constructor(url: string) {
          this.url = url;
          _instances.push(this);
          setTimeout(() => {
            if (this._onopen) this._onopen({});
            this._emit("open", {});
          }, 50);
        }
        set onmessage(fn: ((ev: any) => void) | null) { this._onmessage = fn; }
        get onmessage() { return this._onmessage; }
        set onopen(fn: ((ev: any) => void) | null) { this._onopen = fn; }
        get onopen() { return this._onopen; }
        set onclose(fn: ((ev: any) => void) | null) { this._onclose = fn; }
        get onclose() { return this._onclose; }
        set onerror(fn: ((ev: any) => void) | null) { this._onerror = fn; }
        get onerror() { return this._onerror; }
        addEventListener(type: string, fn: Function) {
          if (!this._listeners[type]) this._listeners[type] = [];
          this._listeners[type].push(fn);
          if (type === "message") this._onmessage = fn as any;
          if (type === "open") {
            this._onopen = fn as any;
            if (this.readyState === 1) setTimeout(() => (fn as any)({}), 10);
          }
        }
        removeEventListener(type: string, fn: Function) {
          if (this._listeners[type]) {
            this._listeners[type] = this._listeners[type].filter((f) => f !== fn);
          }
        }
        _emit(type: string, ev: any) {
          for (const fn of (this._listeners[type] || [])) fn(ev);
        }
        send(_data: string) {}
        close() {
          this.readyState = 3;
          if (this._onclose) this._onclose({});
          this._emit("close", {});
        }
      };
    });

    await page.goto("/");
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: "event-join-88", value: joinData },
    );
  });

  function sendWs(page: any, msg: object) {
    return page.evaluate((data: string) => {
      (window as any).__mockWsSend(data);
    }, JSON.stringify(msg));
  }

  test("caption toggle is hidden until transcription-enabled arrives on mobile", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    expect(await page.locator("[data-testid='attendee-captions-toggle']").count()).toBe(0);
    expect(await page.locator("[data-testid='caption-bar']").count()).toBe(0);
  });

  test("caption toggle appears and caption bar works at mobile viewport after transcription-enabled", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled" });

    const toggle = page.locator("[data-testid='attendee-captions-toggle']");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText(/Show Captions/);

    await toggle.click();
    const bar = page.locator("[data-testid='caption-bar']");
    await expect(bar).toBeVisible();

    await sendWs(page, { type: "transcript-chunk", text: "Hello mobile", isFinal: true });
    await expect(bar).toContainText("Hello mobile");

    await sendWs(page, { type: "transcript-chunk", text: "interim text", isFinal: false });
    await expect(page.locator("[data-testid='caption-interim']")).toHaveText("interim text");
  });

  test("caption bar has bottom padding style for iOS safe area", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "transcription-enabled" });
    await page.locator("[data-testid='attendee-captions-toggle']").click();

    const paddingBottom = await page.locator("[data-testid='caption-bar']").evaluate(
      (el: HTMLElement) => el.style.paddingBottom,
    );
    expect(paddingBottom).toContain("safe-area-inset-bottom");
  });

  test("'captioned by server' badge is shown when mode is server", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled", mode: "server", lang: "en-US" });

    const toggle = page.locator("[data-testid='attendee-captions-toggle']");
    await expect(toggle).toBeVisible();
    await toggle.click();

    const bar = page.locator("[data-testid='caption-bar']");
    await expect(bar).toBeVisible();

    await sendWs(page, { type: "transcript-chunk", text: "Server text", isFinal: true });
    await expect(bar).toContainText("Server text");

    const badge = page.locator("[data-testid='caption-server-badge']");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/Captioned by server/i);
  });

  test("'captioned by server' badge is hidden when mode is browser", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled", mode: "browser", lang: "en-US" });

    await page.locator("[data-testid='attendee-captions-toggle']").click();
    await sendWs(page, { type: "transcript-chunk", text: "Browser text", isFinal: true });

    const bar = page.locator("[data-testid='caption-bar']");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("Browser text");

    expect(await page.locator("[data-testid='caption-server-badge']").count()).toBe(0);
  });

  test("transcript-snapshot seeds caption bar for late-joining mobile attendees", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled", mode: "server" });
    await page.locator("[data-testid='attendee-captions-toggle']").click();

    await sendWs(page, {
      type: "transcript-snapshot",
      finals: ["first line", "second line"],
      interim: "live interim",
    });

    const bar = page.locator("[data-testid='caption-bar']");
    await expect(bar).toContainText("first line");
    await expect(bar).toContainText("second line");
    await expect(page.locator("[data-testid='caption-interim']")).toHaveText("live interim");
  });

  test("caption bar disappears on mobile when transcription-disabled received", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled", mode: "server" });
    await page.locator("[data-testid='attendee-captions-toggle']").click();
    await sendWs(page, { type: "transcript-chunk", text: "going away", isFinal: true });
    await expect(page.locator("[data-testid='caption-bar']")).toBeVisible();

    await sendWs(page, { type: "transcription-disabled" });
    expect(await page.locator("[data-testid='attendee-captions-toggle']").count()).toBe(0);
    expect(await page.locator("[data-testid='caption-bar']").count()).toBe(0);
  });

  test("caption toggle preference persists across reload on mobile", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "transcription-enabled", mode: "server" });
    await page.locator("[data-testid='attendee-captions-toggle']").click();
    await expect(page.locator("[data-testid='caption-bar']")).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem("captions-on-88"));
    expect(stored).toBe("true");

    await page.reload();
    await page.waitForTimeout(500);
    await sendWs(page, { type: "transcription-enabled", mode: "server" });
    await expect(page.locator("[data-testid='caption-bar']")).toBeVisible();
    await expect(page.locator("[data-testid='attendee-captions-toggle']")).toHaveText(/Hide Captions/);
  });

  test("viewport meta tag includes viewport-fit=cover for iOS safe areas", async ({ page }) => {
    await page.goto(attendeePath);
    const viewportContent = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta?.getAttribute("content") ?? "";
    });
    expect(viewportContent).toContain("viewport-fit=cover");
  });

  test("reconnect banner top padding accounts for iOS notch safe area", async ({ page }) => {
    await page.goto(attendeePath);
    // Wait for initial connection
    await page.waitForTimeout(300);

    // Trigger a disconnect via the mock's close helper
    await page.evaluate(() => (window as any).__mockWsClose());

    const banner = page.locator("[data-testid='reconnect-banner']");
    await expect(banner).toBeVisible({ timeout: 3000 });

    const paddingTop = await banner.evaluate(
      (el: HTMLElement) => el.style.paddingTop,
    );
    expect(paddingTop).toContain("safe-area-inset-top");
  });
});
