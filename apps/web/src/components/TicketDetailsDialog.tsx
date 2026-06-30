import React, { useEffect, useState } from "react";
import {
  STATUS_LABELS,
  boardStepIdForTicketStatus,
  type BoardStep,
  type Ticket,
  type TicketComment,
  type TicketCommentKind,
} from "@goblins/shared-constants";
import { api } from "../lib/api";
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
} from "lucide-react";

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

function TicketCommentsPanel({ ticketId }: { ticketId: string }) {
  const [comments, setComments] = useState<TicketComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setComments(null);
    setError(null);
    api.tickets.comments
      .list(ticketId)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setComments([]);
          setError(err instanceof Error ? err.message : "Failed to load comments");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  if (comments === null) {
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

  if (comments.length === 0) {
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
                        </div>

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
                        Comments are added through the API. This view is read-only.
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
