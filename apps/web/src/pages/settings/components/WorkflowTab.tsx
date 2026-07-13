import { useEffect, useState } from "react";
import type { WorkflowDocument } from "goblins-shared-constants";
import { Loader2, Save } from "lucide-react";
import { Button } from "../../../components/ui/button";

type WorkflowTabProps = {
  workflow: WorkflowDocument | undefined;
  isLoading: boolean;
  saveWorkflow: (content: string) => Promise<unknown>;
  isSaving: boolean;
};

export function WorkflowTab({
  workflow,
  isLoading,
  saveWorkflow,
  isSaving,
}: WorkflowTabProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    if (workflow) {
      setContent(workflow.content);
    }
  }, [workflow]);

  const hasChanges = Boolean(
    workflow && content.trim() !== workflow.content.trim(),
  );

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <section className="space-y-6">
        <Heading
          title="Workflow"
          description="No workflow file is available for this installation."
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading
          title="Workflow"
          description="Edit the workflow that the orchestration skill reads before planning and execution."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!hasChanges || isSaving}
            onClick={() => void saveWorkflow(content)}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Active workflow file</div>
            <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
              {workflow.sourcePath}
            </div>
          </div>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        spellCheck={false}
        className="theme-scrollbar min-h-[520px] w-full resize-y rounded-md border bg-muted/20 p-4 font-mono text-sm leading-6 outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
    </section>
  );
}

function Heading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
