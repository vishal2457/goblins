import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Express } from "express";

vi.mock("../socket", () => ({
  initializeSocketServer: vi.fn(),
  closeSocketServer: vi.fn().mockResolvedValue(undefined),
}));

let app: Express;

describe("Production security headers & health", () => {
  beforeAll(async () => {
    const mod = await import("../express-app.js");
    app = mod.default as unknown as Express;
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  it("GET /live returns ok", async () => {
    const res = await request(app).get("/live");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
  });

  it("GET /ready returns 200 when file storage is available", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
  });

  it("sets helmet default headers", async () => {
    const res = await request(app).get("/live");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["x-dns-prefetch-control"]).toBe("off");
    expect(res.headers["x-download-options"]).toBe("noopen");
    expect(res.headers["x-permitted-cross-domain-policies"]).toBe("none");
    expect(res.headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("echoes X-Request-Id and generates one when missing", async () => {
    const provided = await request(app)
      .get("/live")
      .set("X-Request-Id", "abc-123");
    expect(provided.headers["x-request-id"]).toBe("abc-123");

    const generated = await request(app).get("/live");
    expect(generated.headers["x-request-id"]).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
  });

  it("rejects injection-style keys in body", async () => {
    const res = await request(app)
      .post("/api/v1/projects")
      .set("Authorization", "Bearer not-a-real-token")
      .send({ name: "x", "$ne": null, "$$root": 1 });
    // Should fail validation/auth, but importantly, it must not crash and
    // should not echo the prototype keys.
    expect([400, 401, 403]).toContain(res.status);
    expect(res.body).not.toHaveProperty("$ne");
    expect(res.body).not.toHaveProperty("$$root");
  });

  it("returns 404 JSON for unknown routes", async () => {
    const res = await request(app).get("/this-does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Route not found",
      statusCode: 404,
    });
  });

  it("CORS preflight sets Access-Control-Max-Age", async () => {
    const res = await request(app)
      .options("/api/v1/users")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET");
    expect([200, 204]).toContain(res.status);
    expect(res.headers["access-control-max-age"]).toBeDefined();
  });
});
