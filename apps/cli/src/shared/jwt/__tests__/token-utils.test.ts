import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../app-settings", () => ({
  APP_SETTINGS: {
    JWT_SECRET: "test-secret-key-for-unit-tests-min-length-32",
    JWT_ISSUER: "test-issuer",
    JWT_AUDIENCE: "test-audience",
    JWT_EXPIRES_IN: "15m",
  },
}));

vi.mock("../jwt-auth.middleware", async () => {
  const actual = await vi.importActual("../jwt-auth.middleware");
  return actual;
});

import { generateToken, decodeToken, generateOauthState, verifyOauthState } from "../token-utils";

describe("token-utils", () => {
  describe("generateToken", () => {
    it("generates a valid JWT string", () => {
      const token = generateToken({ id: "user-1", email: "test@test.com" });
      expect(token).toBeTypeOf("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("includes custom options", () => {
      const token = generateToken(
        { id: "user-1" },
        { subject: "custom-subject" }
      );
      expect(token).toBeTypeOf("string");
    });

    it("generates different tokens for different payloads", () => {
      const token1 = generateToken({ id: "user-1" });
      const token2 = generateToken({ id: "user-2" });
      expect(token1).not.toBe(token2);
    });

    it("includes role IDs in payload", () => {
      const token = generateToken({
        id: "user-1",
        email: "test@test.com",
        roleIds: ["role-1", "role-2"],
      });
      const decoded = decodeToken<{ roleIds: string[] }>(token);
      expect(decoded).not.toBe(false);
      if (decoded) {
        expect(decoded.roleIds).toEqual(["role-1", "role-2"]);
      }
    });
  });

  describe("decodeToken", () => {
    it("decodes a valid token", () => {
      const token = generateToken({ id: "user-1", email: "test@test.com" });
      const decoded = decodeToken<{ id: string; email: string }>(token);
      expect(decoded).not.toBe(false);
      if (decoded) {
        expect(decoded.id).toBe("user-1");
        expect(decoded.email).toBe("test@test.com");
      }
    });

    it("returns false for invalid token", () => {
      const decoded = decodeToken("invalid-token-string");
      expect(decoded).toBe(false);
    });

    it("returns false for malformed JWT", () => {
      const decoded = decodeToken("not.a.jwt.token.at.all");
      expect(decoded).toBe(false);
    });

    it("returns false for empty string", () => {
      const decoded = decodeToken("");
      expect(decoded).toBe(false);
    });
  });

  describe("generateOauthState", () => {
    it("generates a state string with dot separator", () => {
      const state = generateOauthState({ redirectPath: "/dashboard", teamId: "team-1" });
      expect(state).toBeTypeOf("string");
      expect(state).toContain(".");
    });

    it("generates different states for different payloads", () => {
      const state1 = generateOauthState({ id: "a" });
      const state2 = generateOauthState({ id: "b" });
      expect(state1).not.toBe(state2);
    });

    it("handles empty payload", () => {
      const state = generateOauthState({});
      expect(state).toBeTypeOf("string");
      expect(state).toContain(".");
    });
  });

  describe("verifyOauthState", () => {
    it("verifies a valid state and returns the payload", () => {
      const payload = { redirectPath: "/dashboard", teamId: "team-1" };
      const state = generateOauthState(payload);
      const verified = verifyOauthState(state);
      expect(verified).toEqual(payload);
    });

    it("returns null for tampered state", () => {
      const state = generateOauthState({ redirectPath: "/dashboard" });
      const parts = state.split(".");
      parts[0] = Buffer.from(JSON.stringify({ redirectPath: "/evil" })).toString("base64url");
      const tampered = parts.join(".");
      expect(verifyOauthState(tampered)).toBeNull();
    });

    it("returns null for invalid state format (no dot)", () => {
      expect(verifyOauthState("justsomestring")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(verifyOauthState("")).toBeNull();
    });

    it("returns null for non-string input", () => {
      expect(verifyOauthState(undefined as any)).toBeNull();
      expect(verifyOauthState(null as any)).toBeNull();
      expect(verifyOauthState(123 as any)).toBeNull();
    });

    it("returns null when body part is empty", () => {
      expect(verifyOauthState(".signature")).toBeNull();
    });

    it("returns null when signature part is empty", () => {
      const body = Buffer.from(JSON.stringify({ key: "value" })).toString("base64url");
      expect(verifyOauthState(`${body}.`)).toBeNull();
    });
  });
});
