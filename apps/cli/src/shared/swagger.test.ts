import { describe, expect, it } from "vitest";
import { swaggerSpec } from "./swagger";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
type OpenApiSpec = {
  paths: Record<string, Partial<Record<HttpMethod, unknown>>>;
  components: { schemas: Record<string, unknown> };
};

const spec = swaggerSpec as OpenApiSpec;

describe("Swagger specification", () => {
  it("documents every non-audit route and method", () => {
    const expected: Array<[string, HttpMethod]> = [];
    for (const resource of ["projects", "goals", "steps", "tickets"]) {
      expected.push([`/${resource}`, "get"], [`/${resource}`, "post"]);
      for (const method of ["get", "put", "patch", "delete"] as const) {
        expected.push([`/${resource}/{id}`, method]);
      }
    }
    expected.push(
      ["/projects/{id}/agents", "get"],
      ["/projects/{id}/agents/instructions", "put"],
      ["/goals/{id}/goal-tickets-snapshot", "get"],
      ["/goals/{id}/planning/start", "post"],
      ["/goals/{id}/planning/complete", "post"],
      ["/goals/{id}/execution/start", "post"],
      ["/goals/{id}/retrospective/start", "post"],
      ["/goals/{id}/retrospective/complete", "post"],
      ["/tickets/{id}/files", "post"],
      ["/tickets/{id}/report", "post"],
      ["/tickets/{id}/comments", "get"],
      ["/tickets/{id}/comments", "post"],
      ["/tickets/{id}/comments/{commentId}", "get"],
      ["/live", "get"],
      ["/health", "get"],
      ["/ready", "get"],
    );

    for (const [path, method] of expected) {
      expect(
        spec.paths[path]?.[method],
        `${method.toUpperCase()} ${path}`,
      ).toBeDefined();
    }
  });

  it("registers request, resource, and shared response schemas", () => {
    for (const schema of [
      "Project",
      "DiscoveredAgent",
      "DiscoveredAgentsResponse",
      "Goal",
      "Step",
      "Ticket",
      "TicketComment",
      "GoalTicketsSnapshot",
      "ErrorResponse",
      "Pagination",
    ]) {
      expect(spec.components.schemas[schema], schema).toBeDefined();
    }
  });

  it("preserves the existing audit log documentation", () => {
    expect(spec.paths["/audit-logs"]?.get).toBeDefined();
    expect(spec.components.schemas.AuditLog).toBeDefined();
  });
});
