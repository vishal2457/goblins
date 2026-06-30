import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { APP_SETTINGS } from "../app-settings";
import { JWT_SIGN_OPTIONS, JWT_VERIFY_OPTIONS } from "./jwt-auth.middleware";

export const generateToken = (
  payload: Record<string, unknown>,
  options: jwt.SignOptions = {},
): string => {
  return jwt.sign(payload, APP_SETTINGS.JWT_SECRET, {
    ...JWT_SIGN_OPTIONS,
    ...options,
  });
};

export const decodeToken = <T = unknown>(token: string): T | false => {
  try {
    return jwt.verify(token, APP_SETTINGS.JWT_SECRET, JWT_VERIFY_OPTIONS) as T;
  } catch {
    return false;
  }
};

export function generateOauthState(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", APP_SETTINGS.JWT_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyOauthState(state: string): Record<string, unknown> | null {
  if (typeof state !== "string" || !state.includes(".")) return null;
  const [body, signature] = state.split(".");
  if (!body || !signature) return null;
  const expected = crypto
    .createHmac("sha256", APP_SETTINGS.JWT_SECRET)
    .update(body)
    .digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
