import type { DiscoveredAgent, Project } from "@goblins/shared-constants";
import { ChevronDown, Edit3, Loader2, RefreshCw, Save } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";

type SubagentsTabProps = {
  selectedProject: Project | undefined;
  discoveredAgentsLoading: boolean;
  discoveredAgents:
    | {
        agents: DiscoveredAgent[];
      }
    | null
    | undefined;
  editingAgentId: string | null;
  agentInstructions: string;
  setEditingAgentId: (value: string | null) => void;
  setAgentInstructions: (value: string) => void;
  refreshDiscoveredAgents: () => Promise<unknown>;
  updateDiscoveredAgentInstructions: (
    agentId: string,
    instructions: string,
  ) => Promise<unknown>;
};

export function SubagentsTab({
  selectedProject,
  discoveredAgentsLoading,
  discoveredAgents,
  editingAgentId,
  agentInstructions,
  setEditingAgentId,
  setAgentInstructions,
  refreshDiscoveredAgents,
  updateDiscoveredAgentInstructions,
}: SubagentsTabProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading
          title="Subagents"
          description="Detected file-based subagents for the selected project and user configuration."
        />
        <Button
          variant="outline"
          disabled={!selectedProject || discoveredAgentsLoading}
          onClick={() => void refreshDiscoveredAgents()}
        >
          {discoveredAgentsLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {!selectedProject ? (
        <Empty text="Select or create a project to discover subagents." />
      ) : discoveredAgentsLoading && !discoveredAgents ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-14 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning subagent files.
        </div>
      ) : discoveredAgents && discoveredAgents.agents.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          {discoveredAgents.agents.map((agent) => (
            <SubagentRow
              key={agent.id}
              agent={agent}
              isEditing={editingAgentId === agent.id}
              instructions={agentInstructions}
              onEdit={() => {
                setEditingAgentId(agent.id);
                setAgentInstructions(agent.instructions || "");
              }}
              onInstructionsChange={setAgentInstructions}
              onCancel={() => {
                setEditingAgentId(null);
                setAgentInstructions("");
              }}
              onSave={async () => {
                const updated = await updateDiscoveredAgentInstructions(
                  agent.id,
                  agentInstructions,
                );
                if (updated) {
                  setEditingAgentId(null);
                  setAgentInstructions("");
                }
              }}
            />
          ))}
        </div>
      ) : (
        <Empty text="No subagents were detected for this project." />
      )}
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

function SubagentRow({
  agent,
  isEditing,
  instructions,
  onEdit,
  onInstructionsChange,
  onCancel,
  onSave,
}: {
  agent: DiscoveredAgent;
  isEditing: boolean;
  instructions: string;
  onEdit: () => void;
  onInstructionsChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        onClick={() => setIsOpen((value) => !value)}
      >
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold leading-5">{agent.displayName}</div>
            {agent.shadowedBy && (
              <CenteredBadge variant="outline">Shadowed</CenteredBadge>
            )}
            {!agent.validation.valid && (
              <CenteredBadge variant="destructive">Invalid</CenteredBadge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <CenteredBadge variant="secondary" className="capitalize">
              {agent.provider}
            </CenteredBadge>
            <CenteredBadge variant="outline" className="capitalize">
              {agent.scope}
            </CenteredBadge>
            <CenteredBadge variant="outline" className="capitalize">
              {agent.mode}
            </CenteredBadge>
            <CenteredBadge variant="outline" className="uppercase">
              {agent.sourceKind}
            </CenteredBadge>
            {agent.model && (
              <CenteredBadge variant="outline">{agent.model}</CenteredBadge>
            )}
          </div>
          {agent.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {agent.description}
            </p>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t bg-muted/10 px-4 py-4">
          <div className="flex justify-end">
            {!isEditing && (
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                disabled={!agent.sourcePath}
              >
                <Edit3 className="mr-2 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <textarea
                value={instructions}
                onChange={(event) => onInstructionsChange(event.target.value)}
                className="min-h-48 w-full resize-y rounded-md border bg-background p-3 font-mono text-xs"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button onClick={onSave} disabled={!instructions.trim()}>
                  <Save className="mr-2 h-3.5 w-3.5" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-md border bg-background/70 p-3">
              <Label className="text-xs text-muted-foreground">
                Instructions
              </Label>
              <pre className="theme-scrollbar mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted/20 p-3 font-mono text-xs">
                {agent.instructions || "No instructions detected."}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CenteredBadge(props: React.ComponentProps<typeof Badge>) {
  return <Badge {...props} />;
}
