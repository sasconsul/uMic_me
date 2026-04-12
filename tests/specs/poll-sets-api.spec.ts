import { test, expect, type APIRequestContext } from "@playwright/test";

const TEST_USER_ID = "e2e-test-user-" + Date.now();

function authHeaders() {
  return { "X-Test-User-Id": TEST_USER_ID };
}

test.describe("Poll Sets API — Auth Guards (401 when unauthenticated)", () => {
  test("GET /api/poll-sets returns 401", async ({ request }) => {
    const res = await request.get("/api/poll-sets");
    expect(res.status()).toBe(401);
  });

  test("POST /api/poll-sets returns 401 with JSON body", async ({ request }) => {
    const res = await request.post("/api/poll-sets", { data: { title: "Test Set" } });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).not.toHaveProperty("id");
  });

  test("GET /api/poll-sets/:id returns 401", async ({ request }) => {
    expect((await request.get("/api/poll-sets/1")).status()).toBe(401);
  });

  test("PATCH /api/poll-sets/:id returns 401", async ({ request }) => {
    expect((await request.patch("/api/poll-sets/1", { data: { title: "X" } })).status()).toBe(401);
  });

  test("DELETE /api/poll-sets/:id returns 401", async ({ request }) => {
    expect((await request.delete("/api/poll-sets/1")).status()).toBe(401);
  });

  test("POST /api/poll-sets/:id/duplicate returns 401", async ({ request }) => {
    expect((await request.post("/api/poll-sets/1/duplicate", { data: {} })).status()).toBe(401);
  });

  test("POST /api/poll-sets/:id/questions returns 401", async ({ request }) => {
    expect((await request.post("/api/poll-sets/1/questions", { data: { question: "Q?", options: ["A", "B"] } })).status()).toBe(401);
  });

  test("PATCH /api/poll-sets/:id/questions/:qid returns 401", async ({ request }) => {
    expect((await request.patch("/api/poll-sets/1/questions/1", { data: { question: "X?" } })).status()).toBe(401);
  });

  test("DELETE /api/poll-sets/:id/questions/:qid returns 401", async ({ request }) => {
    expect((await request.delete("/api/poll-sets/1/questions/1")).status()).toBe(401);
  });

  test("POST /api/poll-sets/:id/share returns 401", async ({ request }) => {
    expect((await request.post("/api/poll-sets/1/share")).status()).toBe(401);
  });

  test("DELETE /api/poll-sets/:id/share returns 401", async ({ request }) => {
    expect((await request.delete("/api/poll-sets/1/share")).status()).toBe(401);
  });

  test("GET /api/poll-sets/:id/results.csv returns 401", async ({ request }) => {
    expect((await request.get("/api/poll-sets/1/results.csv")).status()).toBe(401);
  });

  test("unauthenticated response body contains error field", async ({ request }) => {
    const body = await (await request.get("/api/poll-sets")).json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });
});

test.describe("Poll Sets API — Public share routes", () => {
  test("GET /api/poll-sets/share/:token returns 404 for invalid token", async ({ request }) => {
    const res = await request.get("/api/poll-sets/share/nonexistent-token-12345");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("GET /api/poll-sets/share/ with empty path returns error", async ({ request }) => {
    expect((await request.get("/api/poll-sets/share/")).ok()).toBe(false);
  });

  test("GET /api/poll-sets/share/:token returns JSON content type", async ({ request }) => {
    const res = await request.get("/api/poll-sets/share/test-token-xyz");
    expect(res.headers()["content-type"] ?? "").toContain("json");
  });

  test("GET /api/poll-sets/share/:token 404s for multiple invalid tokens", async ({ request }) => {
    for (const token of ["bad-1", "00000000-0000-0000-0000-000000000000", "aaa"]) {
      expect((await request.get(`/api/poll-sets/share/${token}`)).status()).toBe(404);
    }
  });
});

test.describe("Poll Sets API — Authenticated CRUD lifecycle", () => {
  test.describe.configure({ mode: "serial" });

  let pollSetId: number;
  let questionId: number;
  let shareToken: string;

  test("POST /api/poll-sets creates a new poll set", async ({ request }) => {
    const res = await request.post("/api/poll-sets", {
      headers: authHeaders(),
      data: { title: "E2E Test Poll Set" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.pollSet).toBeDefined();
    expect(body.pollSet.title).toBe("E2E Test Poll Set");
    expect(body.pollSet.id).toBeGreaterThan(0);
    pollSetId = body.pollSet.id;
  });

  test("GET /api/poll-sets lists the created poll set", async ({ request }) => {
    const res = await request.get("/api/poll-sets", { headers: authHeaders() });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.pollSets).toBeInstanceOf(Array);
    expect(body.pollSets.some((s: any) => s.id === pollSetId)).toBe(true);
  });

  test("GET /api/poll-sets/:id returns the poll set with questions", async ({ request }) => {
    const res = await request.get(`/api/poll-sets/${pollSetId}`, { headers: authHeaders() });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.pollSet.id).toBe(pollSetId);
    expect(body.questions).toBeInstanceOf(Array);
  });

  test("PATCH /api/poll-sets/:id updates the title", async ({ request }) => {
    const res = await request.patch(`/api/poll-sets/${pollSetId}`, {
      headers: authHeaders(),
      data: { title: "Updated Title" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.pollSet.title).toBe("Updated Title");
  });

  test("POST /api/poll-sets/:id/questions creates a question", async ({ request }) => {
    const res = await request.post(`/api/poll-sets/${pollSetId}/questions`, {
      headers: authHeaders(),
      data: { question: "Favourite colour?", options: ["Red", "Blue", "Green"] },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.question.question).toBe("Favourite colour?");
    expect(body.question.options).toEqual(["Red", "Blue", "Green"]);
    questionId = body.question.id;
  });

  test("POST /api/poll-sets/:id/questions rejects with < 2 options", async ({ request }) => {
    const res = await request.post(`/api/poll-sets/${pollSetId}/questions`, {
      headers: authHeaders(),
      data: { question: "Bad?", options: ["Only"] },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/poll-sets/:id/questions rejects empty question", async ({ request }) => {
    const res = await request.post(`/api/poll-sets/${pollSetId}/questions`, {
      headers: authHeaders(),
      data: { question: "", options: ["A", "B"] },
    });
    expect(res.status()).toBe(400);
  });

  test("PATCH /api/poll-sets/:id/questions/:qid updates the question", async ({ request }) => {
    const res = await request.patch(`/api/poll-sets/${pollSetId}/questions/${questionId}`, {
      headers: authHeaders(),
      data: { question: "Updated question?", options: ["A", "B", "C", "D"] },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.question.question).toBe("Updated question?");
    expect(body.question.options).toEqual(["A", "B", "C", "D"]);
  });

  test("POST /api/poll-sets/:id/duplicate duplicates the poll set", async ({ request }) => {
    const res = await request.post(`/api/poll-sets/${pollSetId}/duplicate`, {
      headers: authHeaders(),
      data: { title: "Duplicated Set" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.pollSet.title).toBe("Duplicated Set");
    expect(body.pollSet.id).not.toBe(pollSetId);
    expect(body.questions.length).toBeGreaterThanOrEqual(1);

    await request.delete(`/api/poll-sets/${body.pollSet.id}`, { headers: authHeaders() });
  });

  test("POST /api/poll-sets/:id/share generates a share token", async ({ request }) => {
    const res = await request.post(`/api/poll-sets/${pollSetId}/share`, { headers: authHeaders() });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.shareToken).toBeTruthy();
    expect(typeof body.shareToken).toBe("string");
    shareToken = body.shareToken;
  });

  test("GET /api/poll-sets/share/:token returns the shared poll set (public)", async ({ request }) => {
    const res = await request.get(`/api/poll-sets/share/${shareToken}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.pollSet.id).toBe(pollSetId);
    expect(body.pollSet.title).toBe("Updated Title");
    expect(body.questions).toBeInstanceOf(Array);
  });

  test("DELETE /api/poll-sets/:id/share revokes the share token", async ({ request }) => {
    const res = await request.delete(`/api/poll-sets/${pollSetId}/share`, { headers: authHeaders() });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const publicRes = await request.get(`/api/poll-sets/share/${shareToken}`);
    expect(publicRes.status()).toBe(404);
  });

  test("GET /api/poll-sets/:id/results.csv returns CSV data", async ({ request }) => {
    const res = await request.get(`/api/poll-sets/${pollSetId}/results.csv`, { headers: authHeaders() });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "").toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("Question");
    expect(text).toContain("Option");
  });

  test("DELETE /api/poll-sets/:id/questions/:qid deletes the question", async ({ request }) => {
    const res = await request.delete(`/api/poll-sets/${pollSetId}/questions/${questionId}`, {
      headers: authHeaders(),
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  test("DELETE /api/poll-sets/:id deletes the poll set", async ({ request }) => {
    const res = await request.delete(`/api/poll-sets/${pollSetId}`, { headers: authHeaders() });
    expect(res.status()).toBe(200);
    expect((await res.json()).success).toBe(true);

    const getRes = await request.get(`/api/poll-sets/${pollSetId}`, { headers: authHeaders() });
    expect(getRes.status()).toBe(404);
  });
});
