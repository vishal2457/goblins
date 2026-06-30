import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Ticket,
  TicketComment,
} from "../../../../shared/db/schema/tickets";
import { NotFoundError } from "../../../../shared/utils/http-errors.util";
import { TicketsRepository } from "../tickets.repo";
import { TicketCommentsService } from "./ticket-comments.service";
import { TicketCommentsRepository } from "./ticket-comments.repo";

const ticketId = "a2a6b450-b647-45f4-bd39-6cb1aa809e62";
const projectId = "21a759ff-944d-4336-a522-4e0b3c57172e";
const goalId = "d97660f9-3a71-413f-8751-f32bd27d2c4a";

const ticket = {
  id: ticketId,
  goalId,
  moduleId: "1f33c48c-fdb1-4904-9b0d-97852f0d81f4",
  currentStepId: null,
  title: "Implement lifecycle",
  shortDescription: "Implement lifecycle changes.",
  description: "",
  type: "implementation",
  status: "backlog",
  priority: "medium",
  retryCount: 0,
  maximumRetries: 3,
  worktreePath: null,
  branchName: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
} satisfies Ticket;

const baseComment = {
  id: "cc4b5648-3840-4ebb-b1ca-9b41a0608bc9",
  ticketId,
  body: "First note",
  authorName: "agent-1",
  kind: "note" as const,
  createdAt: new Date("2026-01-01T00:00:00Z"),
} satisfies TicketComment;

describe("TicketCommentsService", () => {
  const commentsRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByTicket: vi.fn(),
    findLatestByTicket: vi.fn(),
    countByTicket: vi.fn(),
  };
  const ticketsRepository = { findById: vi.fn() };
  const service = new TicketCommentsService(
    commentsRepository as unknown as TicketCommentsRepository,
    ticketsRepository as unknown as TicketsRepository,
  );

  beforeEach(() => vi.clearAllMocks());

  it("creates a comment when the ticket exists", async () => {
    ticketsRepository.findById.mockResolvedValue(ticket);
    commentsRepository.create.mockImplementation((data) =>
      Promise.resolve({ ...baseComment, ...data }),
    );

    const result = await service.create(ticketId, {
      body: "Need a clarification",
      authorName: "planner",
      kind: "question",
    });

    expect(result.body).toBe("Need a clarification");
    expect(result.authorName).toBe("planner");
    expect(result.kind).toBe("question");
    expect(commentsRepository.create).toHaveBeenCalledWith({
      ticketId,
      body: "Need a clarification",
      authorName: "planner",
      kind: "question",
    });
  });

  it("trims whitespace and defaults missing fields", async () => {
    ticketsRepository.findById.mockResolvedValue(ticket);
    commentsRepository.create.mockImplementation((data) =>
      Promise.resolve({ ...baseComment, ...data }),
    );

    const result = await service.create(ticketId, { body: "  hello  " });

    expect(commentsRepository.create).toHaveBeenCalledWith({
      ticketId,
      body: "hello",
      authorName: null,
      kind: "note",
    });
    expect(result.body).toBe("hello");
  });

  it("rejects creating a comment for a missing ticket", async () => {
    ticketsRepository.findById.mockResolvedValue(null);

    await expect(
      service.create(ticketId, { body: "Anything" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns 404 when listing comments for a missing ticket", async () => {
    ticketsRepository.findById.mockResolvedValue(null);

    await expect(
      service.findAllByTicket(ticketId, 1, 25),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns a comment only when it belongs to the requested ticket", async () => {
    commentsRepository.findById.mockResolvedValue(baseComment);
    const match = await service.findById(ticketId, baseComment.id);
    expect(match.id).toBe(baseComment.id);

    commentsRepository.findById.mockResolvedValue({
      ...baseComment,
      ticketId: "00000000-0000-0000-0000-000000000000",
    });
    await expect(
      service.findById(ticketId, baseComment.id),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
