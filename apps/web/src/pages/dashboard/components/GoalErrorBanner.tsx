import { type Goal } from "goblins-shared-constants";
import { XCircle } from "lucide-react";

type GoalErrorState =
  | NonNullable<Goal["lastError"]>
  | {
      phase: "execution";
      message: string;
      occurredAt: string;
    };

export function GoalErrorBanner({
  error,
}: {
  error: GoalErrorState | null;
}) {
  if (!error) {
    return null;
  }

  return (
    <div className="mx-6 mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 shrink-0">
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-red-600 capitalize">
              {error.phase} failed
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(error.occurredAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-red-600 whitespace-pre-wrap">
            {error.message}
          </p>
          {"details" in error && error.details && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-red-600">
                Show diagnostic output
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded border border-red-500/20 bg-background/70 p-3 text-xs whitespace-pre-wrap text-foreground">
                {error.details}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
