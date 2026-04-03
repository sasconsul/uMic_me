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
