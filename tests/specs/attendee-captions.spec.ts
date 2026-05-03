import { test, expect } from "@playwright/test";

const attendeePath = "/attend/test-token/77";

const joinData = JSON.stringify({
  eventId: 1,
  displayName: "Caption User",
  sessionToken: "tok-cap",
  eventTitle: "Caption Conference",
  assignedId: 77,
});

test.describe("Attendee Page — Live Captions", () => {
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
      { key: "event-join-77", value: joinData },
    );
  });

  function sendWs(page: any, msg: object) {
    return page.evaluate((data: string) => {
      (window as any).__mockWsSend(data);
    }, JSON.stringify(msg));
  }

  test("captions toggle is hidden until transcription-enabled is received", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    expect(await page.locator("[data-testid='attendee-captions-toggle']").count()).toBe(0);
  });

  test("toggle appears after transcription-enabled and caption bar shows text after enabling and receiving chunks", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled" });

    const toggle = page.locator("[data-testid='attendee-captions-toggle']");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText(/Show Captions/);

    // Bar hidden until attendee opts in
    expect(await page.locator("[data-testid='caption-bar']").count()).toBe(0);

    await toggle.click();
    await expect(page.locator("[data-testid='caption-bar']")).toBeVisible();

    await sendWs(page, { type: "transcript-chunk", text: "Hello attendees", isFinal: true });
    await expect(page.locator("[data-testid='caption-bar']")).toContainText("Hello attendees");

    await sendWs(page, { type: "transcript-chunk", text: "this is interim", isFinal: false });
    await expect(page.locator("[data-testid='caption-interim']")).toHaveText("this is interim");
  });

  test("toggle preference persists across reload via localStorage", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled" });
    await page.locator("[data-testid='attendee-captions-toggle']").click();
    await expect(page.locator("[data-testid='caption-bar']")).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem("captions-on-77"));
    expect(stored).toBe("true");

    await page.reload();
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled" });
    // Bar should auto-show on reload because preference is stored.
    await expect(page.locator("[data-testid='caption-bar']")).toBeVisible();
    await expect(page.locator("[data-testid='attendee-captions-toggle']")).toHaveText(/Hide Captions/);
  });

  test("caption bar and toggle disappear when transcription-disabled arrives", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled" });
    await page.locator("[data-testid='attendee-captions-toggle']").click();
    await sendWs(page, { type: "transcript-chunk", text: "live text", isFinal: true });
    await expect(page.locator("[data-testid='caption-bar']")).toBeVisible();

    await sendWs(page, { type: "transcription-disabled" });
    expect(await page.locator("[data-testid='attendee-captions-toggle']").count()).toBe(0);
    expect(await page.locator("[data-testid='caption-bar']").count()).toBe(0);
  });

  test("transcript-snapshot hydrates rolling buffer for late-joining attendees", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled" });
    await page.locator("[data-testid='attendee-captions-toggle']").click();

    await sendWs(page, {
      type: "transcript-snapshot",
      finals: ["line one", "line two", "line three"],
      interim: "current interim",
    });

    const bar = page.locator("[data-testid='caption-bar']");
    await expect(bar).toContainText("line one");
    await expect(bar).toContainText("line three");
    await expect(page.locator("[data-testid='caption-interim']")).toHaveText("current interim");

    // A subsequent live final appends without losing the snapshot text.
    await sendWs(page, { type: "transcript-chunk", text: "live final", isFinal: true });
    await expect(bar).toContainText("live final");
    await expect(bar).toContainText("line three");
  });

  test("caption bar disappears when stream-ended arrives", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    await sendWs(page, { type: "qa-state", qaOpen: false });
    await sendWs(page, { type: "transcription-enabled" });
    await page.locator("[data-testid='attendee-captions-toggle']").click();
    await sendWs(page, { type: "transcript-chunk", text: "before stream end", isFinal: true });
    await expect(page.locator("[data-testid='caption-bar']")).toBeVisible();

    await sendWs(page, { type: "stream-ended" });
    expect(await page.locator("[data-testid='attendee-captions-toggle']").count()).toBe(0);
    expect(await page.locator("[data-testid='caption-bar']").count()).toBe(0);
  });
});
