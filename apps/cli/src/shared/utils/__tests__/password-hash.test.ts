import { describe, it, expect } from "vitest";
import { hashPassword, checkPassword } from "../password-hash";

describe("password-hash", () => {
  describe("hashPassword", () => {
    it("generates a hash string", () => {
      const hash = hashPassword("myPassword123");
      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe("myPassword123");
    });

    it("generates different hashes for the same password", () => {
      const hash1 = hashPassword("myPassword123");
      const hash2 = hashPassword("myPassword123");
      expect(hash1).not.toBe(hash2);
    });

    it("generates a bcrypt-compatible hash (starts with $2a$ or $2b$)", () => {
      const hash = hashPassword("testPassword");
      expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
    });

    it("handles empty string", () => {
      const hash = hashPassword("");
      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("handles long passwords", () => {
      const longPassword = "a".repeat(100);
      const hash = hashPassword(longPassword);
      expect(hash).toBeTypeOf("string");
    });

    it("handles special characters", () => {
      const hash = hashPassword("!@#$%^&*()_+-=[]{}|;':\\\",./<>?");
      expect(hash).toBeTypeOf("string");
    });
  });

  describe("checkPassword", () => {
    it("returns true for correct password", () => {
      const hash = hashPassword("myPassword123");
      const result = checkPassword("myPassword123", hash);
      expect(result).toBe(true);
    });

    it("returns false for incorrect password", () => {
      const hash = hashPassword("myPassword123");
      const result = checkPassword("wrongPassword", hash);
      expect(result).toBe(false);
    });

    it("is case-sensitive", () => {
      const hash = hashPassword("Password123");
      expect(checkPassword("password123", hash)).toBe(false);
      expect(checkPassword("Password123", hash)).toBe(true);
    });

    it("returns false for empty password against non-empty hash", () => {
      const hash = hashPassword("myPassword");
      expect(checkPassword("", hash)).toBe(false);
    });

    it("works with freshly generated hashes", () => {
      for (let i = 0; i < 5; i++) {
        const password = `password${i}`;
        const hash = hashPassword(password);
        expect(checkPassword(password, hash)).toBe(true);
        expect(checkPassword("wrong", hash)).toBe(false);
      }
    });
  });
});
