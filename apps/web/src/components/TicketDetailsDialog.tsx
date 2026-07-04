import React from "react";
import {
  STATUS_LABELS,
  SUBAGENT_STATUS_LABELS,
  boardStepIdForTicketStatus,
  type BoardStep,
  type BoardStepId,
  type Ticket,
  type TicketComment,
  type TicketCommentKind,
} from "@goblins/shared-constants";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  FileCode,
  History,
  MessageSquare,
  Loader2,
  MessageCircle,
  HelpCircle,
  CheckCircle,
  AlertOctagon,
  Bot,
} from "lucide-react";
import {
  useSettleTicketMutation,
  useTicketCommentsQuery,
} from "../shared/api/features/ticket/ticket.queries";

const COMMENT_KIND_META: Record<TicketCommentKind, { label: string; icon: React.ReactNode; badge: string }> = {
  note: {
    label: "Note",
    icon: <MessageCircle className="h-3 w-3" />,
    badge: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  },
  question: {
    label: "Question",
    icon: <HelpCircle className="h-3 w-3" />,
    badge: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  },
  decision: {
    label: "Decision",
    icon: <CheckCircle className="h-3 w-3" />,
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  blocker: {
    label: "Blocker",
    icon: <AlertOctagon className="h-3 w-3" />,
    badge: "bg-red-500/10 text-red-600 border-red-500/30",
  },
};

function formatActivityAge(ageMs?: number | null): string {
  if (ageMs == null) return "Unknown";
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function TicketCommentsPanel({ ticketId }: { ticketId: string }) {
  const commentsQuery = useTicketCommentsQuery(ticketId);
  const comments = commentsQuery.data;
  const error =
    commentsQuery.error instanceof Error
      ? commentsQuery.error.message
      : commentsQuery.error
        ? "Failed to load comments"
        : null;

  if (commentsQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading comments…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-600">
        {error}
      </div>
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
        <MessageSquare className="h-6 w-6 opacity-50" />
        <p>No comments yet.</p>
        <p className="text-[11px] text-muted-foreground/80">
          Comments are added through the Goblins API.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => {
        const meta = COMMENT_KIND_META[comment.kind] ?? COMMENT_KIND_META.note;
        return (
          <div
            key={comment.id}
            className="rounded-lg border bg-card px-4 py-3 shadow-sm"
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${meta.badge}`}
              >
                {meta.icon}
                {meta.label}
              </span>
              {comment.authorName && (
                <span className="text-xs font-medium text-foreground">
                  {comment.authorName}
                </span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {comment.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}

type TicketDetailsDialogProps = {
  ticket: Ticket | null;
  onClose: () => void;
  boardSteps: BoardStep[];
};

export function TicketDetailsDialog({ ticket, onClose, boardSteps }: TicketDetailsDialogProps) {
  const settleTicketMutation = useSettleTicketMutation();
  const [isSettleOpen, setIsSettleOpen] = React.useState(false);
  const [selectedBoardStepId, setSelectedBoardStepId] =
    React.useState<BoardStepId>("todo");
  const [settleComment, setSettleComment] = React.useState("");
  const settleBoardSteps = boardSteps
    .filter((step) =>
      ["todo", "inprogress", "done", "failed"].includes(step.id),
    )
    .sort((left, right) => left.position - right.position);

  React.useEffect(() => {
    if (!ticket) {
      setIsSettleOpen(false);
      setSettleComment("");
      setSelectedBoardStepId("todo");
      return;
    }
    setSelectedBoardStepId(boardStepIdForTicketStatus(ticket.status));
    setSettleComment("");
    setIsSettleOpen(false);
  }, [ticket?.id, ticket?.status]);

  const handleSettleTicket = async () => {
    if (!ticket) return;
    try {
      await settleTicketMutation.mutateAsync({
        ticket,
        boardStepId: selectedBoardStepId,
        comment: settleComment,
      });
      setSettleComment("");
      setIsSettleOpen(false);
    } catch {
      // The mutation owns user-facing error toasts.
    }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[800px] lg:max-w-[1000px] max-h-[85vh] p-0 flex flex-col overflow-hidden">
        {ticket && (
          <div className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="px-6 py-5 border-b shrink-0 bg-muted/10 gap-3 pr-14">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="font-mono bg-primary/10 text-primary uppercase text-[10px] mt-1">
                  {ticket.id}
                </Badge>
                {ticket.type && (
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {ticket.type}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {ticket.title}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-2 shrink-0 bg-background border-b z-10 relative">
                <TabsList variant="line" className="w-full justify-start p-0 gap-8 h-12">
                  <TabsTrigger value="overview" className="px-1 text-sm rounded-none pb-2 font-medium h-full">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="px-1 text-sm rounded-none pb-2 font-medium h-full gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Comments
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 flex min-h-0 bg-muted/5">
                <TabsContent value="overview" className="flex-1 m-0 min-h-0 focus-visible:outline-none">
                  <div className="flex h-full">
                    <div className="flex-1 overflow-y-auto theme-scrollbar min-w-0">
                      <div className="px-6 py-6 flex flex-col gap-8">
                        <div>
                          <Label className="text-sm font-semibold mb-2 block text-foreground">
                            Description
                          </Label>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {ticket.description || "No description provided."}
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-semibold mb-2 block text-foreground">
                            Technical Notes
                          </Label>
                          {ticket.technicalNotes.length > 0 ? (
                            <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                              {ticket.technicalNotes.map((note, i) => (
                                <li key={i}>{note}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">None</p>
                          )}
                        </div>

                        <div>
                          <Label className="text-sm font-semibold mb-2 block text-foreground">
                            Dependencies
                          </Label>
                          {ticket.dependencyIds.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {ticket.dependencyIds.map((id) => (
                                <Badge key={id} variant="secondary" className="font-mono text-[10px] uppercase bg-muted/80">
                                  {id}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No dependencies</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <aside className="w-[300px] shrink-0 overflow-y-auto theme-scrollbar border-l bg-background">
                      <div className="px-6 py-6 flex flex-col gap-8">
                        <div className="flex flex-col gap-3">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Status
                          </Label>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {boardSteps.find((step) => step.id === boardStepIdForTicketStatus(ticket.status))?.name || "Unknown"}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {STATUS_LABELS[ticket.status] || ticket.status}
                            </Badge>
                          </div>
                          {ticket.subagentStatus && (
                            <Badge variant="secondary" className="w-fit">
                              {SUBAGENT_STATUS_LABELS[ticket.subagentStatus]}
                            </Badge>
                          )}
                          {!isSettleOpen ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-fit"
                              onClick={() => setIsSettleOpen(true)}
                            >
                              Settle
                            </Button>
                          ) : (
                            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
                              <div className="flex flex-col gap-2">
                                <Label className="text-xs font-medium">
                                  Move to board
                                </Label>
                                <Select
                                  value={selectedBoardStepId}
                                  onValueChange={(value) =>
                                    setSelectedBoardStepId(value as BoardStepId)
                                  }
                                >
                                  <SelectTrigger className="h-8 w-full bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {settleBoardSteps.map((step) => (
                                      <SelectItem key={step.id} value={step.id}>
                                        {step.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Label className="text-xs font-medium">
                                  Comment
                                </Label>
                                <textarea
                                  value={settleComment}
                                  onChange={(event) =>
                                    setSettleComment(event.target.value)
                                  }
                                  maxLength={10000}
                                  rows={4}
                                  placeholder="Optional context for future runs"
                                  className="min-h-20 w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={settleTicketMutation.isPending}
                                  onClick={() => {
                                    setIsSettleOpen(false);
                                    setSettleComment("");
                                    setSelectedBoardStepId(
                                      boardStepIdForTicketStatus(ticket.status),
                                    );
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={settleTicketMutation.isPending}
                                  onClick={() => void handleSettleTicket()}
                                >
                                  {settleTicketMutation.isPending && (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  )}
                                  Submit
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {ticket.assignedSubagentName && (
                          <div className="flex flex-col gap-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                              <Bot className="w-4 h-4 text-muted-foreground" />
                              Assigned Team Member
                            </Label>
                            <Badge variant="outline" className="w-fit">
                              {ticket.assignedSubagentName}
                            </Badge>
                          </div>
                        )}

                        <div className="flex flex-col gap-3">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-muted-foreground" />
                            Relevant Files
                          </Label>
                          {ticket.relevantFiles.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {ticket.relevantFiles.map((file) => (
                                <code key={file} className="text-[11px] bg-card border px-2.5 py-1.5 rounded-md font-mono text-muted-foreground truncate">
                                  {file}
                                </code>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">None specified</span>
                          )}
                        </div>

                        <div className="flex flex-col gap-3">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <History className="w-4 h-4 text-muted-foreground" />
                            Activity
                          </Label>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-2">
                              <Label className="text-[10px] text-muted-foreground shrink-0">Retries</Label>
                              <span className="text-sm font-medium">
                                {ticket.retryCount} / {ticket.maximumRetries}
                              </span>
                            </div>
                            <div className="mt-2">
                              <Label className="text-[10px] text-muted-foreground">Last Activity</Label>
                              <span className="block text-sm font-medium">
                                {formatActivityAge(ticket.activity?.lastActivityAgeMs)}
                              </span>
                            </div>
                            {ticket.activity?.lastActivityByAgentName && (
                              <div className="mt-2">
                                <Label className="text-[10px] text-muted-foreground">Last Actor</Label>
                                <span className="block truncate text-sm font-medium">
                                  {ticket.activity.lastActivityByAgentName}
                                </span>
                              </div>
                            )}
                            {ticket.subagentStatusUpdatedAt && (
                              <div className="mt-2">
                                <Label className="text-[10px] text-muted-foreground">Subagent Updated</Label>
                                <span className="block text-sm font-medium">
                                  {new Date(ticket.subagentStatusUpdatedAt).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {ticket.worktreePath && (
                              <div className="mt-2">
                                <Label className="text-[10px] text-muted-foreground">Worktree</Label>
                                <code className="text-[10px] font-mono block truncate mt-0.5">
                                  {ticket.worktreePath}
                                </code>
                              </div>
                            )}
                            {ticket.branchName && (
                              <div className="mt-2">
                                <Label className="text-[10px] text-muted-foreground">Branch</Label>
                                <code className="text-[10px] font-mono block truncate mt-0.5">
                                  {ticket.branchName}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>

                        {ticket.activity?.recentComments?.length ? (
                          <div className="flex flex-col gap-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              Recent Comments
                            </Label>
                            <div className="flex flex-col gap-2">
                              {ticket.activity.recentComments.map((comment) => {
                                const meta =
                                  COMMENT_KIND_META[comment.kind] ??
                                  COMMENT_KIND_META.note;
                                return (
                                  <div
                                    key={comment.id}
                                    className="rounded-md border bg-muted/20 p-2"
                                  >
                                    <div className="mb-1 flex items-center gap-1.5">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${meta.badge}`}
                                      >
                                        {meta.icon}
                                        {meta.label}
                                      </span>
                                      {comment.authorName && (
                                        <span className="truncate text-[10px] font-medium">
                                          {comment.authorName}
                                        </span>
                                      )}
                                    </div>
                                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                                      {comment.body}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <div className="flex flex-col gap-3 pt-6 border-t">
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Created</Label>
                            <span className="text-sm font-medium">
                              {new Date(ticket.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Label className="text-xs text-muted-foreground">Last Updated</Label>
                            <span className="text-sm font-medium">
                              {new Date(ticket.updatedAt).toLocaleString()}
                            </span>
                          </div>
                          {ticket.startedAt && (
                            <div className="flex flex-col gap-1">
                              <Label className="text-xs text-muted-foreground">Started</Label>
                              <span className="text-sm font-medium">
                                {new Date(ticket.startedAt).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {ticket.completedAt && (
                            <div className="flex flex-col gap-1">
                              <Label className="text-xs text-muted-foreground">Completed</Label>
                              <span className="text-sm font-medium">
                                {new Date(ticket.completedAt).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </aside>
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="flex-1 m-0 min-h-0 focus-visible:outline-none overflow-y-auto theme-scrollbar">
                  <div className="px-6 py-6">
                    <div className="max-w-2xl">
                      <p className="mb-4 text-xs text-muted-foreground">
                        Comments capture context from ticket execution and manual settlement.
                      </p>
                      <TicketCommentsPanel ticketId={ticket.id} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
