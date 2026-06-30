import { z } from "zod";

export const ticketCommentTicketParamSchema = z.object({
  id: z.string().uuid(),
});

export const ticketCommentIdParamSchema = z.object({
  id: z.string().uuid(),
  commentId: z.string().uuid(),
});

export const ticketCommentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createTicketCommentSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  authorName: z.string().trim().min(1).max(255).nullable().optional(),
  kind: z.enum(["note", "question", "decision", "blocker"]).optional(),
});
