import type { DiscoveredAgent } from "goblins-shared-constants";
import { ArrowLeft, Edit3, Save } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { cn } from "../../../lib/utils";
import { AgentAvatar } from "./AgentAvatar";

type SubagentDetailPageProps = {
  agent: DiscoveredAgent | undefined | null;
  isEditing: boolean;
  instructions: string;
  onBack: () => void;
  onEdit: () => void;
  onInstructionsChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
};

export function SubagentDetailPage({
  agent,
  isEditing,
  instructions,
  onBack,
  onEdit,
  onInstructionsChange,
  onCancel,
  onSave,
}: SubagentDetailPageProps) {
  if (!agent) {
    return (
      <section className="space-y-6">
        <Breadcrumb current="Missing agent" onBack={onBack} />
        <Empty text="This team member was not found in the current project." />
      </section>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-8rem)] flex-col gap-6 md:min-h-[calc(100vh-9rem)]">
      <Breadcrumb current={agent.displayName} onBack={onBack} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <AgentAvatar agent={agent} size="lg" />
          <Heading
            title={agent.displayName}
            description={agent.description || "No description detected."}
          />
        </div>
      </div>

      <Card className="min-h-0 flex-1 rounded-lg">
        <CardContent className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex min-h-7 items-center justify-between gap-3">
            <Label className="text-xs text-muted-foreground">
              Instructions
            </Label>
            <ActionRow
              isEditing={isEditing}
              canEdit={Boolean(agent.sourcePath)}
              canSave={Boolean(instructions.trim())}
              onEdit={onEdit}
              onCancel={onCancel}
              onSave={onSave}
            />
          </div>

          <InstructionsPanel
            isEditing={isEditing}
            instructions={instructions}
            savedInstructions={agent.instructions || "No instructions detected."}
            onInstructionsChange={onInstructionsChange}
          />
        </CardContent>
      </Card>
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

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-14 text-center text-sm text-muted-foreground">
      <div>{text}</div>
    </div>
  );
}

function Breadcrumb({
  current,
  onBack,
}: {
  current: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Button variant="ghost" size="sm" className="-ml-2 h-8" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Team
      </Button>
      <span>/</span>
      <span className="font-medium text-foreground">{current}</span>
    </div>
  );
}

function InstructionsPanel({
  isEditing,
  instructions,
  savedInstructions,
  onInstructionsChange,
}: {
  isEditing: boolean;
  instructions: string;
  savedInstructions: string;
  onInstructionsChange: (value: string) => void;
}) {
  const inactive = "pointer-events-none opacity-0";
  const active = "pointer-events-auto opacity-100";

  return (
    <div className="grid min-h-0 flex-1">
      <div
        aria-hidden={isEditing}
        className={`col-start-1 row-start-1 min-h-0 rounded-md border bg-background/70 transition-opacity duration-200 ease-out ${
          isEditing ? inactive : active
        }`}
      >
        <pre className="theme-scrollbar h-full overflow-auto whitespace-pre-wrap rounded bg-muted/20 p-3 font-mono text-xs">
          {savedInstructions}
        </pre>
      </div>

      <div
        aria-hidden={!isEditing}
        className={`col-start-1 row-start-1 min-h-0 transition-opacity duration-200 ease-out ${
          isEditing ? active : inactive
        }`}
      >
        <textarea
          value={instructions}
          onChange={(event) => onInstructionsChange(event.target.value)}
          disabled={!isEditing}
          className={cn(
            "h-full w-full resize-none rounded-md border bg-background p-3 font-mono text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-100",
            isEditing && "border-ring ring-3 ring-ring/50",
          )}
        />
      </div>
    </div>
  );
}

function ActionRow({
  isEditing,
  canEdit,
  canSave,
  onEdit,
  onCancel,
  onSave,
}: {
  isEditing: boolean;
  canEdit: boolean;
  canSave: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
}) {
  const inactive = "pointer-events-none translate-y-1 opacity-0";
  const active = "pointer-events-auto translate-y-0 opacity-100";

  return (
    <div className="relative h-7 w-36 shrink-0">
      <div
        className={`absolute right-0 top-0 flex w-36 justify-end transition-all duration-200 ease-out ${
          isEditing ? inactive : active
        }`}
      >
        <Button size="sm" variant="outline" onClick={onEdit} disabled={!canEdit}>
          <Edit3 className="mr-2 h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      <div
        className={`absolute right-0 top-0 flex w-36 justify-end gap-2 transition-all duration-200 ease-out ${
          isEditing ? active : inactive
        }`}
      >
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={!canSave}>
          <Save className="mr-2 h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  );
}
