import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { APP_SETTINGS } from "../app-settings";
import { ensureStore } from "../file-store";

export function createHealthRouter(): Router {
  const router = createRouter();

  router.get("/live", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  router.get("/health", async (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: APP_SETTINGS.NODE_ENV,
    });
  });

  router.get("/ready", async (_req: Request, res: Response) => {
    try {
      await ensureStore();
      res.status(200).json({
        status: "ready",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: "not_ready",
        timestamp: new Date().toISOString(),
        error: APP_SETTINGS.IS_PRODUCTION
          ? "service unavailable"
          : (error as Error).message,
      });
    }
  });

  return router;
}
