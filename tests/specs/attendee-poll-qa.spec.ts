import { test, expect } from "@playwright/test";

test.describe("Attendee Page — Poll & Q&A UI", () => {
  const attendeePath = "/attend/test-token/42";

  const joinData = JSON.stringify({
    eventId: 1,
    displayName: "Test Attendee",
    sessionToken: "tok-123",
    eventTitle: "Demo Conference",
    eventPromoText: "Welcome to Demo",
    assignedId: 42,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: "event-join-42", value: joinData },
    );
  });

  test("attendee page renders event title from stored join data", async ({ page }) => {
    await page.goto(attendeePath);
    const title = page.locator("h1");
    await expect(title).toHaveText("Demo Conference");
  });

  test("attendee page shows welcome message with display name", async ({ page }) => {
    await page.goto(attendeePath);
    await expect(page.locator("text=Welcome, Test Attendee!")).toBeVisible();
  });

  test("attendee page shows promo text from event data", async ({ page }) => {
    await page.goto(attendeePath);
    await expect(page.locator("text=Welcome to Demo")).toBeVisible();
  });

  test("Raise Hand button is disabled with 'Q&A is not open yet' when Q&A is closed", async ({ page }) => {
    await page.goto(attendeePath);
    const raiseHandButton = page.locator("button", { has: page.locator("text=Raise Hand") });
    await expect(raiseHandButton).toBeVisible();
    await expect(raiseHandButton).toBeDisabled();
    await expect(page.locator("text=Q&A is not open yet")).toBeVisible();
  });

  test("Raise Hand button has correct aria-label when Q&A is closed", async ({ page }) => {
    await page.goto(attendeePath);
    const btn = page.locator("button[aria-pressed='false']", { has: page.locator("text=Raise Hand") });
    await expect(btn).toHaveAttribute("aria-label", "Raise hand (Q&A not open yet)");
  });

  test("question text input is hidden when Q&A is not open", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);
    expect(await page.locator("#question-text").count()).toBe(0);
  });

  test("poll card is not visible when no poll has been launched", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(1500);
    expect(await page.locator("text=Live Poll").count()).toBe(0);
    expect(await page.locator("text=Poll Results").count()).toBe(0);
  });

  test("audio status shows waiting state when no stream is active", async ({ page }) => {
    await page.goto(attendeePath);
    await expect(page.locator("text=Waiting for audio stream...")).toBeVisible();
  });

  test("attendee page has main content area with correct structure", async ({ page }) => {
    await page.goto(attendeePath);
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("connection indicator shows connecting state", async ({ page }) => {
    await page.goto(attendeePath);
    await expect(page.locator("text=Connecting...")).toBeVisible();
  });
});

test.describe("Attendee Page — WebSocket-driven poll & Q&A state transitions", () => {
  const attendeePath = "/attend/test-token/42";

  const joinData = JSON.stringify({
    eventId: 1,
    displayName: "WS Test User",
    sessionToken: "tok-ws",
    eventTitle: "WS Conference",
    assignedId: 42,
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const _OrigWS = window.WebSocket;
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
            this._listeners[type] = this._listeners[type].filter(f => f !== fn);
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
      { key: "event-join-42", value: joinData },
    );
  });

  function sendWsMessage(page: any, msg: object) {
    return page.evaluate((data: string) => {
      (window as any).__mockWsSend(data);
    }, JSON.stringify(msg));
  }

  test("poll-launched message renders the poll card with question and options", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, {
      type: "qa-state",
      qaOpen: false,
      attendees: [],
    });

    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-1",
        question: "What is your favourite language?",
        options: ["TypeScript", "Rust", "Go"],
        counts: [0, 0, 0],
        totalVotes: 0,
        showResults: false,
        active: true,
      },
    });

    await expect(page.locator("text=What is your favourite language?")).toBeVisible();
    await expect(page.locator("text=TypeScript")).toBeVisible();
    await expect(page.locator("text=Rust")).toBeVisible();
    await expect(page.locator("text=Go")).toBeVisible();
  });

  test("poll with showResults=true shows vote percentages and total", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-2",
        question: "Best framework?",
        options: ["React", "Vue"],
        counts: [10, 5],
        totalVotes: 15,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=Best framework?")).toBeVisible();
    await expect(page.locator("text=67%")).toBeVisible();
    await expect(page.locator("text=33%")).toBeVisible();
    await expect(page.locator("text=15 votes")).toBeVisible();
  });

  test("poll-ended message shows results, disables voting, and displays total", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-3",
        question: "Active poll?",
        options: ["Yes", "No"],
        counts: [0, 0],
        totalVotes: 0,
        showResults: false,
        active: true,
      },
    });

    await expect(page.locator("text=Active poll?")).toBeVisible();
    const optionButtons = page.locator("[role='group'][aria-label='Poll options'] button");
    await expect(optionButtons.first()).toBeEnabled();

    await sendWsMessage(page, {
      type: "poll-ended",
      poll: {
        id: "poll-3",
        question: "Active poll?",
        options: ["Yes", "No"],
        counts: [3, 7],
        totalVotes: 10,
        showResults: true,
        active: false,
      },
    });

    await expect(page.locator("text=Active poll?")).toBeVisible();
    await expect(optionButtons.first()).toBeDisabled();
    await expect(optionButtons.last()).toBeDisabled();
    await expect(page.locator("text=30%")).toBeVisible();
    await expect(page.locator("text=70%")).toBeVisible();
    await expect(page.locator("text=10 votes")).toBeVisible();
  });

  test("clicking a poll option and receiving vote-confirmed disables voting and shows Voted badge", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-vote",
        question: "Pick one",
        options: ["Alpha", "Beta"],
        counts: [0, 0],
        totalVotes: 0,
        showResults: false,
        active: true,
      },
    });

    const optionButtons = page.locator("[role='group'][aria-label='Poll options'] button");
    await expect(optionButtons.first()).toBeEnabled();

    await optionButtons.first().click();

    await sendWsMessage(page, { type: "poll-vote-confirmed", optionIndex: 0 });

    await expect(optionButtons.first()).toBeDisabled();
    await expect(optionButtons.last()).toBeDisabled();
    await expect(page.locator("text=Voted")).toBeVisible();
    await expect(page.locator("text=Your vote has been recorded")).toBeVisible();
  });

  test("qa-opened message enables the Raise Hand button", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });

    const raiseBtn = page.locator("button", { has: page.locator("text=Raise Hand") });
    await expect(raiseBtn).toBeDisabled();

    await sendWsMessage(page, { type: "qa-opened" });

    await expect(raiseBtn).toBeEnabled();
  });

  test("qa-opened shows question text input", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    expect(await page.locator("#question-text").count()).toBe(0);

    await sendWsMessage(page, { type: "qa-opened" });

    await expect(page.locator("#question-text")).toBeVisible();
  });

  test("qa-closed message disables the Raise Hand button again", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: true, attendees: [] });

    const raiseBtn = page.locator("button", { has: page.locator("text=Raise Hand") });
    await expect(raiseBtn).toBeEnabled();

    await sendWsMessage(page, { type: "qa-closed" });

    await expect(raiseBtn).toBeDisabled();
  });

  test("poll-launched with pollType feature-board shows Feature Board heading and prompt", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-fb-1",
        pollType: "feature-board",
        question: "Submit your feature ideas!",
        options: [],
        counts: [],
        totalVotes: 0,
        showResults: false,
        active: true,
      },
    });

    await expect(page.getByText("Feature Board", { exact: true })).toBeVisible();
    await expect(page.locator("text=Submit your feature ideas!")).toBeVisible();
    await expect(page.locator("a", { hasText: "Open Feature Board" })).toBeVisible();
  });

  test("poll-launched with pollType feature-board does not show vote buttons or poll options", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-fb-2",
        pollType: "feature-board",
        question: "Vote for features you want!",
        options: [],
        counts: [],
        totalVotes: 0,
        showResults: false,
        active: true,
      },
    });

    await expect(page.getByText("Feature Board", { exact: true })).toBeVisible();
    expect(await page.locator("[role='group'][aria-label='Poll options']").count()).toBe(0);
    expect(await page.locator("text=Live Poll").count()).toBe(0);
    expect(await page.locator("text=Vote now").count()).toBe(0);
  });

  test("poll-launched with pollType feature-board Open Feature Board link points to /feature-board/", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-fb-3",
        pollType: "feature-board",
        question: "Share your ideas",
        options: [],
        counts: [],
        totalVotes: 0,
        showResults: false,
        active: true,
      },
    });

    const link = page.locator("a", { hasText: "Open Feature Board" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/feature-board/");
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("poll-launched with pollType feature-board shows toast notification", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-fb-toast",
        pollType: "feature-board",
        question: "Share your ideas!",
        options: [],
        counts: [],
        totalVotes: 0,
        showResults: false,
        active: true,
      },
    });

    await expect(
      page.locator("text=The host shared the Feature Board — check it out!")
    ).toBeVisible({ timeout: 5000 });
  });

  test("poll-launched without pollType feature-board shows 'A poll has started' toast", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-regular-toast",
        question: "What is your favourite colour?",
        options: ["Red", "Green", "Blue"],
        counts: [0, 0, 0],
        totalVotes: 0,
        showResults: false,
        active: true,
      },
    });

    await expect(
      page.locator("text=A poll has started — cast your vote!")
    ).toBeVisible({ timeout: 5000 });
  });

  test("percentages and vote count are hidden when showResults=false and attendee has not voted", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-hidden-pct",
        question: "Favourite colour?",
        options: ["Red", "Green", "Blue"],
        counts: [6, 10, 4],
        totalVotes: 20,
        showResults: false,
        active: true,
      },
    });

    await expect(page.locator("text=Favourite colour?")).toBeVisible();
    await expect(page.locator("text=Vote now")).toBeVisible();

    await expect(page.locator("text=30%")).toHaveCount(0);
    await expect(page.locator("text=50%")).toHaveCount(0);
    await expect(page.locator("text=20%")).toHaveCount(0);
    await expect(page.locator("text=20 votes")).toHaveCount(0);
  });

  test("poll-results-toggled makes result percentages and vote counts visible after showResults=false launch", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-toggle-1",
        question: "Favourite season?",
        options: ["Spring", "Summer", "Autumn", "Winter"],
        counts: [6, 10, 4, 5],
        totalVotes: 25,
        showResults: false,
        active: true,
      },
    });

    await expect(page.locator("text=Favourite season?")).toBeVisible();
    expect(await page.locator("text=40%").count()).toBe(0);
    expect(await page.locator("text=25 votes").count()).toBe(0);

    await sendWsMessage(page, {
      type: "poll-results-toggled",
      poll: {
        id: "poll-toggle-1",
        question: "Favourite season?",
        options: ["Spring", "Summer", "Autumn", "Winter"],
        counts: [6, 10, 4, 5],
        totalVotes: 25,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=40%")).toBeVisible();
    await expect(page.locator("text=25 votes")).toBeVisible();
  });

  test("poll-updated reflects updated vote counts in real-time", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-update-1",
        question: "Best database?",
        options: ["Postgres", "MySQL"],
        counts: [5, 5],
        totalVotes: 10,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=Best database?")).toBeVisible();
    await expect(page.locator("text=10 votes")).toBeVisible();
    await expect(page.locator("text=50%").first()).toBeVisible();

    await sendWsMessage(page, {
      type: "poll-updated",
      poll: {
        id: "poll-update-1",
        question: "Best database?",
        options: ["Postgres", "MySQL"],
        counts: [15, 5],
        totalVotes: 20,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=20 votes")).toBeVisible();
    await expect(page.locator("text=75%")).toBeVisible();
    await expect(page.locator("text=25%")).toBeVisible();
  });

  test("rapid sequential poll-updated messages each update vote counts without flash or broken state", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-rapid-1",
        question: "Best language?",
        options: ["TypeScript", "Python", "Go"],
        counts: [10, 5, 5],
        totalVotes: 20,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=Best language?")).toBeVisible();
    await expect(page.locator("text=20 votes")).toBeVisible();
    await expect(page.locator("text=50%")).toBeVisible();
    await expect(page.locator("text=25%").first()).toBeVisible();

    await sendWsMessage(page, {
      type: "poll-updated",
      poll: {
        id: "poll-rapid-1",
        question: "Best language?",
        options: ["TypeScript", "Python", "Go"],
        counts: [15, 5, 5],
        totalVotes: 25,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=25 votes")).toBeVisible();
    await expect(page.locator("text=60%")).toBeVisible();
    await expect(page.locator("text=20%").first()).toBeVisible();
    await expect(page.locator("text=20 votes")).toHaveCount(0);

    await sendWsMessage(page, {
      type: "poll-updated",
      poll: {
        id: "poll-rapid-1",
        question: "Best language?",
        options: ["TypeScript", "Python", "Go"],
        counts: [20, 5, 5],
        totalVotes: 30,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=30 votes")).toBeVisible();
    await expect(page.locator("text=67%")).toBeVisible();
    await expect(page.locator("text=17%").first()).toBeVisible();
    await expect(page.locator("text=25 votes")).toHaveCount(0);

    await sendWsMessage(page, {
      type: "poll-updated",
      poll: {
        id: "poll-rapid-1",
        question: "Best language?",
        options: ["TypeScript", "Python", "Go"],
        counts: [30, 5, 5],
        totalVotes: 40,
        showResults: true,
        active: true,
      },
    });

    await expect(page.locator("text=40 votes")).toBeVisible();
    await expect(page.locator("text=75%")).toBeVisible();
    await expect(page.locator("text=13%").first()).toBeVisible();
    await expect(page.locator("text=30 votes")).toHaveCount(0);

    await expect(page.locator("text=Best language?")).toBeVisible();
    await expect(page.locator("text=TypeScript")).toBeVisible();
    await expect(page.locator("text=Python")).toBeVisible();
    await expect(page.locator("text=Go")).toBeVisible();
  });

  test("poll-ended for feature-board removes the CTA card and Open Feature Board link from the DOM", async ({ page }) => {
    await page.goto(attendeePath);
    await page.waitForTimeout(500);

    await sendWsMessage(page, { type: "qa-state", qaOpen: false, attendees: [] });
    await sendWsMessage(page, {
      type: "poll-launched",
      poll: {
        id: "poll-fb-end",
        pollType: "feature-board",
        question: "Submit your feature ideas!",
        options: [],
        counts: [],
        totalVotes: 0,
        showResults: false,
        active: true,
      },
    });

    await expect(page.getByText("Feature Board", { exact: true })).toBeVisible();
    await expect(page.locator("a", { hasText: "Open Feature Board" })).toBeVisible();

    await sendWsMessage(page, {
      type: "poll-ended",
      poll: {
        id: "poll-fb-end",
        pollType: "feature-board",
        question: "Submit your feature ideas!",
        options: [],
        counts: [],
        totalVotes: 0,
        showResults: false,
        active: false,
      },
    });

    await expect(page.getByText("Feature Board", { exact: true })).toHaveCount(0);
    await expect(page.locator("a", { hasText: "Open Feature Board" })).toHaveCount(0);
  });
});

test.describe("Attendee Page — without stored join data", () => {
  test("attendee page falls back to default 'Live Event' title", async ({ page }) => {
    await page.goto("/attend/unknown-token/99999");
    await expect(page.locator("h1")).toHaveText("Live Event");
  });

  test("attendee page renders without crash even with invalid attendeeId", async ({ page }) => {
    const response = await page.goto("/attend/bad-token/0");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await expect(page.locator("#main-content")).toBeVisible();
  });
});
