import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

const HEADER = "x-request-id";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header(HEADER);
  const id =
    typeof incoming === "string" &&
    incoming.length > 0 &&
    incoming.length <= 128 &&
    /^[A-Za-z0-9._-]+$/.test(incoming)
      ? incoming
      : randomUUID();

  req.id = id;
  res.setHeader(HEADER, id);
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs =
      Number(process.hrtime.bigint() - start) / 1_000_000;
    const userId = req.user?.id;
    const log = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId,
      contentLength: res.getHeader("content-length"),
    };
    if (res.statusCode >= 500) {
      logger.error("http_request", log);
    } else if (res.statusCode >= 400) {
      logger.warn("http_request", log);
    } else {
      logger.info("http_request", log);
    }
  });

  next();
}
