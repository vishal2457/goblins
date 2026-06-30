import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

vi.mock("../../app-settings", () => ({
  APP_SETTINGS: {
    JWT_SECRET: "test-jwt-secret-for-middleware-tests-ok",
    JWT_ISSUER: "test-issuer",
    JWT_AUDIENCE: "test-audience",
  },
}));

import { secure, JwtPayload } from "../jwt-auth.middleware";

function mockReq(headers: Record<string, string> = {}): Partial<Request> {
  return {
    header: vi.fn((name: string) => headers[name.toLowerCase()] ?? undefined) as Request["header"],
    user: undefined,
  };
}

function mockRes(): Partial<Response> {
  return {};
}

describe("jwt-auth.middleware - secure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next() for valid Bearer token", () => {
    const payload: JwtPayload = { id: "user-1", email: "test@test.com" };
    const token = jwt.sign(payload, "test-jwt-secret-for-middleware-tests-ok", {
      algorithm: "HS256",
      issuer: "test-issuer",
      audience: "test-audience",
    });

    const req = mockReq({ authorization: `Bearer ${token}` });
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect((req as Request).user).toBeDefined();
    expect((req as Request).user?.id).toBe("user-1");
    expect((req as Request).user?.email).toBe("test@test.com");
  });

  it("attaches roleIds from JWT payload", () => {
    const payload: JwtPayload = { id: "user-1", email: "test@test.com", roleIds: ["role-1", "role-2"] };
    const token = jwt.sign(payload, "test-jwt-secret-for-middleware-tests-ok", {
      algorithm: "HS256",
      issuer: "test-issuer",
      audience: "test-audience",
    });

    const req = mockReq({ authorization: `Bearer ${token}` });
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    expect((req as Request).user?.roleIds).toEqual(["role-1", "role-2"]);
  });

  it("returns 401 UnauthorizedError when Authorization header is missing", () => {
    const req = mockReq({});
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as any).mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("missing_token");
  });

  it("returns 401 when Authorization header does not start with Bearer", () => {
    const req = mockReq({ authorization: "Basic dGVzdDp0ZXN0" });
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("missing_token");
  });

  it("returns 401 when token is empty after Bearer prefix", () => {
    const req = mockReq({ authorization: "Bearer " });
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("missing_token");
  });

  it("returns 401 with 'token_expired' for expired token", () => {
    const expiredToken = jwt.sign(
      { id: "user-1", email: "test@test.com" },
      "test-jwt-secret-for-middleware-tests-ok",
      { algorithm: "HS256", issuer: "test-issuer", audience: "test-audience", expiresIn: -3600 }
    );

    const req = mockReq({ authorization: `Bearer ${expiredToken}` });
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("token_expired");
  });

  it("returns 401 with 'invalid_token' for malformed JWT", () => {
    const req = mockReq({ authorization: "Bearer not.a.real.jwt" });
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("invalid_token");
  });

  it("returns 401 with 'invalid_token' for token signed with wrong secret", () => {
    const token = jwt.sign(
      { id: "user-1", email: "test@test.com" },
      "different-secret-key-that-does-not-match",
      { algorithm: "HS256", issuer: "test-issuer", audience: "test-audience" }
    );

    const req = mockReq({ authorization: `Bearer ${token}` });
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("invalid_token");
  });

  it("returns 401 with 'invalid_token' for token with wrong issuer", () => {
    const token = jwt.sign(
      { id: "user-1", email: "test@test.com" },
      "test-jwt-secret-for-middleware-tests-ok",
      { algorithm: "HS256", issuer: "wrong-issuer", audience: "test-audience" }
    );

    const req = mockReq({ authorization: `Bearer ${token}` });
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("invalid_token");
  });

  it("returns 401 with 'invalid_token' for token with wrong audience", () => {
    const token = jwt.sign(
      { id: "user-1", email: "test@test.com" },
      "test-jwt-secret-for-middleware-tests-ok",
      { algorithm: "HS256", issuer: "test-issuer", audience: "wrong-audience" }
    );

    const req = mockReq({ authorization: `Bearer ${token}` });
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    const error = (next as any).mock.calls[0][0];
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("invalid_token");
  });

  it("trims whitespace from token", () => {
    const payload: JwtPayload = { id: "user-1", email: "test@test.com" };
    const token = jwt.sign(payload, "test-jwt-secret-for-middleware-tests-ok", {
      algorithm: "HS256",
      issuer: "test-issuer",
      audience: "test-audience",
    });

    const req = mockReq({ authorization: `Bearer   ${token}  ` });
    const next = vi.fn() as NextFunction;

    secure(req as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect((req as Request).user?.id).toBe("user-1");
  });
});
