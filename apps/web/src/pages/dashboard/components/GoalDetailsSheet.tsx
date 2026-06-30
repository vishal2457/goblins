import { type AuditLog, type Goal, type Project } from "@goblins/shared-constants";
import { ScrollText, Target, X } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { AuditTimeline } from "./AuditTimeline";

export function GoalDetailsSheet({
  open,
  selectedGoal,
  selectedProject,
  auditLogs,
  auditLogsLoading,
  onClose,
}: {
  open: boolean;
  selectedGoal?: Goal;
  selectedProject?: Project;
  auditLogs: AuditLog[];
  auditLogsLoading: boolean;
  onClose: () => void;
}) {
  if (!open || !selectedGoal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25">
      <button
        type="button"
        aria-label="Close goal details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-[560px] flex-col border-l bg-background shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b bg-muted/10 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{selectedGoal.title}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Goal audit trail and execution context
            </p>
          </div>
          <Button size="icon-sm" variant="ghost" title="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-5">
            {selectedProject && (
              <section className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Project</Label>
                  <p className="mt-1 text-sm font-medium">{selectedProject.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Project path
                  </Label>
                  <code className="mt-1 block rounded-md border bg-muted/20 px-2 py-1.5 text-xs font-mono break-all">
                    {selectedProject.location}
                  </code>
                </div>
              </section>
            )}

            <section className="space-y-3 border-t pt-5">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Description
                </Label>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {selectedGoal.description || "No description provided."}
                </p>
              </div>
              {selectedGoal.technicalInstructions && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Technical instructions
                  </Label>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-md border bg-muted/20 p-3 text-xs whitespace-pre-wrap">
                    {selectedGoal.technicalInstructions}
                  </pre>
                </div>
              )}
            </section>

            <section className="space-y-3 border-t pt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Audit log</h3>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {auditLogs.length}
                </Badge>
              </div>
              <AuditTimeline logs={auditLogs} loading={auditLogsLoading} />
            </section>
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}
