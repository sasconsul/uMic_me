import { test, expect, type Page } from "@playwright/test";

const EVENT_ID = 1;
const HOST_EVENT_PATH = `/events/${EVENT_ID}`;

function buildMockEvent() {
  return {
    event: {
      id: EVENT_ID,
      title: "Host Test Event",
      status: "live",
      qrCodeToken: "test-qr-token",
      promoText: null,
      startTime: null,
      logoUrl: null,
      createdAt: new Date().toISOString(),
    },
  };
}

test.describe("Host EventPage — poll-updated live vote count updates", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const mockUser = { id: "test-user-id" };
      const mockSession = {
        id: "test-session-id",
        status: "active",
        lastActiveToken: { jwt: { claims: { sub: "test-user-id" } } },
      };
      const mockClient = { sessions: [mockSession] };
      const mockResources = {
        session: mockSession,
        user: mockUser,
        client: mockClient,
        organization: null,
        lastOrganizationInvitation: null,
        lastOrganizationMembershipUpdate: null,
      };

      const clerkMock: Record<string, unknown> = {
        loaded: true,
        isSignedIn: true,
        session: mockSession,
        user: mockUser,
        client: mockClient,
        __internal_lastEmittedResources: undefined,

        addListener(listener: (res: unknown) => void) {
          clerkMock.__internal_lastEmittedResources = mockResources;
          setTimeout(() => listener(mockResources), 0);
          return () => {};
        },

        on(event: string, listener: (val: unknown) => void) {
          if (event === "status") setTimeout(() => listener("ready"), 0);
          return () => {};
        },

        off() {},
        buildSignInUrl: () => "/sign-in",
        buildSignUpUrl: () => "/sign-up",
        buildAfterSignInUrl: () => "/",
        buildAfterSignUpUrl: () => "/",
        buildAfterSignOutUrl: () => "/",
      };

      (window as Window & { Clerk?: unknown }).Clerk = clerkMock;
    });

    await page.addInitScript(() => {
      const instances: {
        readyState: number;
        _onopen: ((ev: unknown) => void) | null;
        _onmessage: ((ev: unknown) => void) | null;
        _onclose: ((ev: unknown) => void) | null;
        _onerror: ((ev: unknown) => void) | null;
        _listeners: Record<string, ((...args: unknown[]) => void)[]>;
      }[] = [];

      (window as Window & { __mockWsSend?: (d: string) => void }).__mockWsSend =
        (data: string) => {
          for (const inst of instances) {
            if (inst.readyState === 1) {
              const ev = { data, type: "message" };
              if (inst._onmessage) inst._onmessage(ev);
              for (const fn of inst._listeners["message"] ?? []) fn(ev);
            }
          }
        };

      (window as Window & { WebSocket: unknown }).WebSocket = class MockWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;

        readyState = 0;
        url: string;
        _onopen: ((ev: unknown) => void) | null = null;
        _onmessage: ((ev: unknown) => void) | null = null;
        _onclose: ((ev: unknown) => void) | null = null;
        _onerror: ((ev: unknown) => void) | null = null;
        _listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

        constructor(url: string) {
          this.url = url;
          instances.push(this);
          setTimeout(() => {
            this.readyState = 1;
            if (this._onopen) this._onopen({});
            for (const fn of this._listeners["open"] ?? []) fn({});
          }, 30);
        }

        set onopen(fn: ((ev: unknown) => void) | null) {
          this._onopen = fn;
        }
        get onopen() {
          return this._onopen;
        }
        set onmessage(fn: ((ev: unknown) => void) | null) {
          this._onmessage = fn;
        }
        get onmessage() {
          return this._onmessage;
        }
        set onclose(fn: ((ev: unknown) => void) | null) {
          this._onclose = fn;
        }
        get onclose() {
          return this._onclose;
        }
        set onerror(fn: ((ev: unknown) => void) | null) {
          this._onerror = fn;
        }
        get onerror() {
          return this._onerror;
        }

        addEventListener(type: string, fn: (...args: unknown[]) => void) {
          if (!this._listeners[type]) this._listeners[type] = [];
          this._listeners[type].push(fn);
          if (type === "message") this._onmessage = fn;
          if (type === "open") {
            this._onopen = fn;
            if (this.readyState === 1) setTimeout(() => fn({}), 10);
          }
        }

        removeEventListener(type: string, fn: (...args: unknown[]) => void) {
          if (this._listeners[type]) {
            this._listeners[type] = this._listeners[type].filter(
              (f) => f !== fn,
            );
          }
        }

        send(_data: string) {}

        close() {
          this.readyState = 3;
          if (this._onclose) this._onclose({});
          for (const fn of this._listeners["close"] ?? []) fn({});
        }
      };
    });

    await page.route(`**/api/events/${EVENT_ID}`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(buildMockEvent()),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/api/events/${EVENT_ID}/poll-sets**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ pollSets: [] }),
      });
    });

    await page.route(`**/api/events/${EVENT_ID}/feedback**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [] }),
      });
    });
  });

  function sendWsMessage(page: Page, msg: object) {
    return page.evaluate((data: string) => {
      (window as Window & { __mockWsSend?: (d: string) => void }).__mockWsSend?.(data);
    }, JSON.stringify(msg));
  }

  test("sequential poll-updated messages update totalVotes and percentages on the host dashboard without stale render", async ({
    page,
  }) => {
    await page.goto(HOST_EVENT_PATH);
    await expect(page.locator("h2", { hasText: "Polls" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Connected", { exact: true }).first()).toBeVisible({ timeout: 5000 });

    await sendWsMessage(page, {
      type: "room-state",
      attendees: [],
      qaOpen: false,
      activePoll: {
        id: "poll-host-live-1",
        question: "Best testing framework?",
        options: ["Playwright", "Cypress", "Jest"],
        counts: [10, 5, 5],
        totalVotes: 20,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=Best testing framework?")).toBeVisible();
    await expect(page.locator("text=20 votes total")).toBeVisible();
    await expect(page.locator("text=10 votes (50%)")).toBeVisible();

    await sendWsMessage(page, {
      type: "poll-updated",
      poll: {
        id: "poll-host-live-1",
        question: "Best testing framework?",
        options: ["Playwright", "Cypress", "Jest"],
        counts: [15, 5, 5],
        totalVotes: 25,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=25 votes total")).toBeVisible();
    await expect(page.locator("text=15 votes (60%)")).toBeVisible();
    await expect(page.locator("text=20 votes total")).toHaveCount(0);

    await sendWsMessage(page, {
      type: "poll-updated",
      poll: {
        id: "poll-host-live-1",
        question: "Best testing framework?",
        options: ["Playwright", "Cypress", "Jest"],
        counts: [20, 5, 5],
        totalVotes: 30,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=30 votes total")).toBeVisible();
    await expect(page.locator("text=20 votes (67%)")).toBeVisible();
    await expect(page.locator("text=25 votes total")).toHaveCount(0);

    await sendWsMessage(page, {
      type: "poll-updated",
      poll: {
        id: "poll-host-live-1",
        question: "Best testing framework?",
        options: ["Playwright", "Cypress", "Jest"],
        counts: [30, 5, 5],
        totalVotes: 40,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=40 votes total")).toBeVisible();
    await expect(page.locator("text=30 votes (75%)")).toBeVisible();
    await expect(page.locator("text=30 votes total")).toHaveCount(0);

    await expect(page.locator("text=Best testing framework?")).toBeVisible();
    await expect(page.locator("text=Playwright")).toBeVisible();
    await expect(page.locator("text=Cypress")).toBeVisible();
    await expect(page.locator("text=Jest")).toBeVisible();
  });

  test("host dashboard shows vote counts regardless of showResults flag", async ({
    page,
  }) => {
    await page.goto(HOST_EVENT_PATH);
    await expect(page.locator("h2", { hasText: "Polls" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Connected", { exact: true }).first()).toBeVisible({ timeout: 5000 });

    await sendWsMessage(page, {
      type: "room-state",
      attendees: [],
      qaOpen: false,
      activePoll: {
        id: "poll-host-hidden-1",
        question: "Hidden results poll",
        options: ["Alpha", "Beta"],
        counts: [3, 7],
        totalVotes: 10,
        showResults: false,
        active: true,
      },
    });

    await expect(page.locator("text=Hidden results poll")).toBeVisible();
    await expect(page.locator("text=10 votes total")).toBeVisible();
    await expect(page.locator("text=3 votes (30%)")).toBeVisible();
    await expect(page.locator("text=7 votes (70%)")).toBeVisible();

    await sendWsMessage(page, {
      type: "poll-updated",
      poll: {
        id: "poll-host-hidden-1",
        question: "Hidden results poll",
        options: ["Alpha", "Beta"],
        counts: [8, 12],
        totalVotes: 20,
        showResults: false,
        active: true,
      },
    });

    await expect(page.locator("text=20 votes total")).toBeVisible();
    await expect(page.locator("text=8 votes (40%)")).toBeVisible();
    await expect(page.locator("text=12 votes (60%)")).toBeVisible();
    await expect(page.locator("text=10 votes total")).toHaveCount(0);

    await sendWsMessage(page, {
      type: "poll-updated",
      poll: {
        id: "poll-host-hidden-1",
        question: "Hidden results poll",
        options: ["Alpha", "Beta"],
        counts: [15, 15],
        totalVotes: 30,
        showResults: false,
        active: true,
      },
    });

    await expect(page.locator("text=30 votes total")).toBeVisible();
    await expect(page.locator("text=15 votes (50%)").first()).toBeVisible();
    await expect(page.locator("text=20 votes total")).toHaveCount(0);

    await sendWsMessage(page, {
      type: "poll-updated",
      poll: {
        id: "poll-host-hidden-1",
        question: "Hidden results poll",
        options: ["Alpha", "Beta"],
        counts: [22, 18],
        totalVotes: 40,
        showResults: false,
        active: true,
      },
    });

    await expect(page.locator("text=40 votes total")).toBeVisible();
    await expect(page.locator("text=22 votes (55%)")).toBeVisible();
    await expect(page.locator("text=18 votes (45%)")).toBeVisible();
    await expect(page.locator("text=30 votes total")).toHaveCount(0);
  });

  test("poll question label is stable across rapid poll-updated messages", async ({
    page,
  }) => {
    await page.goto(HOST_EVENT_PATH);
    await expect(page.locator("h2", { hasText: "Polls" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Connected", { exact: true }).first()).toBeVisible({ timeout: 5000 });

    await sendWsMessage(page, {
      type: "room-state",
      attendees: [],
      qaOpen: false,
      activePoll: {
        id: "poll-host-rapid-1",
        question: "What is your preferred cloud?",
        options: ["AWS", "GCP", "Azure"],
        counts: [5, 5, 5],
        totalVotes: 15,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=What is your preferred cloud?")).toBeVisible();
    await expect(page.getByText("Live", { exact: true })).toBeVisible();
    await expect(page.locator("text=15 votes total")).toBeVisible();

    const updates = [
      { counts: [10, 5, 5], totalVotes: 20 },
      { counts: [15, 5, 5], totalVotes: 25 },
      { counts: [20, 5, 5], totalVotes: 30 },
    ];

    for (const { counts, totalVotes } of updates) {
      await sendWsMessage(page, {
        type: "poll-updated",
        poll: {
          id: "poll-host-rapid-1",
          question: "What is your preferred cloud?",
          options: ["AWS", "GCP", "Azure"],
          counts,
          totalVotes,
          showResults: true,
          active: true,
        },
      });

      await expect(page.locator(`text=${totalVotes} votes total`)).toBeVisible();
      await expect(page.locator("text=What is your preferred cloud?")).toBeVisible();
      await expect(page.getByText("Live", { exact: true })).toBeVisible();
    }

    await expect(page.locator("text=AWS")).toBeVisible();
    await expect(page.locator("text=GCP")).toBeVisible();
    await expect(page.locator("text=Azure")).toBeVisible();
    await expect(page.locator("text=30 votes total")).toBeVisible();
    await expect(page.locator("text=20 votes (67%)")).toBeVisible();
  });
});
