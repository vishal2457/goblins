#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoblinsClient } from "./client/goblins-client.js";
import { registerGoalTools } from "./features/goals/tools.js";
import { registerProjectTools } from "./features/projects/tools.js";
import { registerTicketTools } from "./features/tickets/tools.js";

const server = new McpServer({
  name: "goblins-mcp",
  version: "0.0.0",
});

const client = new GoblinsClient();

registerProjectTools(server, client);
registerGoalTools(server, client);
registerTicketTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
