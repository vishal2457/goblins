import type { Response } from "express";
import type { RealtimeEvent, RealtimeEventType } from "@goblins/shared-constants";
import { randomUUID } from "crypto";

type Client = {
  id: string;
  response: Response;
};

const clients = new Map<string, Client>();

function writeEvent(response: Response, event: RealtimeEvent): void {
  response.write(`id: ${event.id}\n`);
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

export const realtimeEvents = {
  addClient(response: Response): string {
    const id = randomUUID();
    clients.set(id, { id, response });
    writeEvent(response, {
      id: randomUUID(),
      type: "connected",
      payload: { clientId: id },
      createdAt: new Date().toISOString(),
    });
    return id;
  },

  removeClient(id: string): void {
    clients.delete(id);
  },

  publish<TPayload>(type: RealtimeEventType, payload: TPayload): void {
    const event: RealtimeEvent<TPayload> = {
      id: randomUUID(),
      type,
      payload,
      createdAt: new Date().toISOString(),
    };

    for (const client of clients.values()) {
      writeEvent(client.response, event);
    }
  },
};
