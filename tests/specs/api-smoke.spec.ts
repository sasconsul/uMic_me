import { test, expect } from "@playwright/test";

test.describe("API Smoke Tests", () => {
  test("GET /api/health returns 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
  });

  test("POST /api/events/1/pa-token returns 401 when unauthenticated", async ({
    request,
  }) => {
    const response = await request.post("/api/events/1/pa-token");
    expect(response.status()).toBe(401);
  });

  test("GET /api/events returns 401 when unauthenticated", async ({
    request,
  }) => {
    const response = await request.get("/api/events");
    expect(response.status()).toBe(401);
  });
});

test.describe("Server-side Transcription Endpoint — mobile STT fallback", () => {
  test("POST /api/events/1/transcribe returns 401 when unauthenticated", async ({
    request,
  }) => {
    // The transcribe route is the server-side STT path used by iOS Safari and
    // Firefox Android hosts (which lack the Web Speech API). It must be auth-gated.
    const response = await request.post("/api/events/1/transcribe", {
      data: Buffer.alloc(3000, 0),
      headers: { "Content-Type": "audio/mp4" },
    });
    expect(response.status()).toBe(401);
  });

  test("POST /api/events/0/transcribe returns 400 for invalid event id", async ({
    request,
  }) => {
    const response = await request.post("/api/events/0/transcribe", {
      data: Buffer.alloc(3000, 0),
      headers: { "Content-Type": "audio/webm" },
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/events/1/transcribe response is JSON with error field when unauthenticated", async ({
    request,
  }) => {
    const response = await request.post("/api/events/1/transcribe", {
      data: Buffer.alloc(3000, 0),
      headers: { "Content-Type": "audio/mp4" },
    });
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});
