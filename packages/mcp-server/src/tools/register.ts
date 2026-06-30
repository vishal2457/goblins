import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  GoblinsApiError,
  type GoblinsClient,
} from "../client/goblins-client.js";

export type RegisterTools = (
  server: McpServer,
  client: GoblinsClient,
) => void;

export function toJsonResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function toErrorResult(error: unknown) {
  const data =
    error instanceof GoblinsApiError
      ? {
          error: error.message,
          statusCode: error.statusCode,
          responseBody: error.responseBody,
        }
      : {
          error: error instanceof Error ? error.message : String(error),
        };

  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function withApiErrors<TArgs extends object>(
  handler: (args: TArgs) => Promise<unknown>,
) {
  return async (args: TArgs) => {
    try {
      return toJsonResult(await handler(args));
    } catch (error) {
      return toErrorResult(error);
    }
  };
}
