import { type AuditLog } from "goblins-shared-constants";
import { Loader2 } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";

export function AuditTimeline({
  logs,
  loading,
}: {
  logs: AuditLog[];
  loading: boolean;
}) {
  if (loading && logs.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        Loading audit log...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No audit entries have been recorded for this goal yet.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="relative pl-5">
          <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
          <div className="rounded-md border bg-muted/15 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{auditTitle(log)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[10px]",
                  log.module === "ticket" && "border-blue-500/40 text-blue-600",
                  log.module === "goal" && "border-green-500/40 text-green-600",
                )}
              >
                {log.module}
              </Badge>
            </div>
            <AuditDetails log={log} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function AuditDetails({ log }: { log: AuditLog }) {
  const data = log.data ?? {};
  const details = [
    data.ticketTitle ? `Ticket: ${String(data.ticketTitle)}` : null,
    data.previousStatus || data.nextStatus
      ? `Status: ${String(data.previousStatus ?? "unknown")} -> ${String(
          data.nextStatus ?? data.status ?? "unknown",
        )}`
      : null,
    data.summary ? `Summary: ${String(data.summary)}` : null,
    data.path ? `File: ${String(data.path)}` : null,
  ].filter((detail): detail is string => Boolean(detail));

  if (details.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
      {details.map((detail) => (
        <p key={detail}>{detail}</p>
      ))}
    </div>
  );
}

function auditTitle(log: AuditLog): string {
  const description = log.data?.description;
  if (typeof description === "string" && description.trim()) {
    return description;
  }

  return log.action
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
