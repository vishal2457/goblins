import type { Request, Response } from "express";
import { asyncHandler } from "../../../shared/utils/async-handler.util";
import { realtimeEvents } from "./events.bus";

export class EventsController {
  stream = asyncHandler(async (req: Request, res: Response) => {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const clientId = realtimeEvents.addClient(res);
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      realtimeEvents.removeClient(clientId);
    });
  });
}
