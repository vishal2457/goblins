import type { NextFunction, Request, Response } from "express";

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith("$") || k.startsWith(".") || DANGEROUS_KEYS.has(k)) {
      continue;
    }
    out[k] = sanitizeValue(v);
  }
  return out;
}

export function sanitizeInputs(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.body && (isPlainObject(req.body) || Array.isArray(req.body))) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && isPlainObject(req.query)) {
    for (const key of Object.keys(req.query)) {
      if (key.startsWith("$") || key.startsWith(".")) {
        delete (req.query as Record<string, unknown>)[key];
      }
    }
  }
  if (req.params && isPlainObject(req.params)) {
    for (const key of Object.keys(req.params)) {
      if (key.startsWith("$") || key.startsWith(".")) {
        delete (req.params as Record<string, unknown>)[key];
      }
    }
  }
  next();
}
