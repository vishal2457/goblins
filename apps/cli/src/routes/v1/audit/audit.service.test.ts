import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request } from "express";

import { AuditService } from "./audit.service";
import { AuditAction, AuditModule } from "./audit.constants";

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({
    user: {
      id: "user_1",
      email: "tester@example.com",
      name: "Test User",
      roleIds: ["role_admin"],
    },
    ip: "203.0.113.7",
    method: "POST",
    originalUrl: "/api/v1/companies",
    headers: { "user-agent": "vitest-agent" },
    socket: { remoteAddress: "203.0.113.7" },
    ...overrides,
  } as unknown as Request);

const buildService = () => {
  const repo = { create: vi.fn() };
  const service = new AuditService();
  (service as unknown as { repo: typeof repo }).repo = repo;
  return { service, repo };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuditService.logChange", () => {
  it("captures user identity, IP, and user agent from the request", async () => {
    const { service, repo } = buildService();
    repo.create.mockResolvedValue(undefined);

    await service.logChange(makeReq(), {
      module: AuditModule.COMPANY,
      action: AuditAction.CREATE,
      entityId: "co_1",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        module: AuditModule.COMPANY,
        action: AuditAction.CREATE,
        entityId: "co_1",
        entityName: AuditModule.COMPANY,
        userId: "user_1",
        userName: "Test User",
        userEmail: "tester@example.com",
        ipAddress: "203.0.113.7",
        userAgent: "vitest-agent",
        metadata: expect.objectContaining({
          method: "POST",
          url: "/api/v1/companies",
        }),
      }),
    );
  });

  it("still creates a log entry when no request is provided (background jobs)", async () => {
    const { service, repo } = buildService();
    repo.create.mockResolvedValue(undefined);

    await service.logChange(undefined, {
      module: AuditModule.COMPANY,
      action: AuditAction.UPDATE,
      entityId: "co_1",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: undefined,
        userName: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        metadata: undefined,
      }),
    );
  });

  it("does not throw if the underlying repository fails", async () => {
    const { service, repo } = buildService();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    repo.create.mockRejectedValue(new Error("DB down"));

    await expect(
      service.logChange(makeReq(), {
        module: AuditModule.COMPANY,
        action: AuditAction.CREATE,
        entityId: "co_1",
      }),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
