import type { DiscoveredAgent, Project } from "goblins-shared-constants";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { SubagentCard } from "./SubagentCard";
import { SubagentDetailPage } from "./SubagentDetailPage";

type SubagentsTabProps = {
  selectedProject: Project | undefined;
  selectedAgentId: string | null;
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
  onOpenAgent: (agentId: string) => void;
  onBackToAgents: () => void;
  refreshDiscoveredAgents: () => Promise<unknown>;
  updateDiscoveredAgentInstructions: (
    agentId: string,
    instructions: string,
  ) => Promise<unknown>;
};

export function SubagentsTab({
  selectedProject,
  selectedAgentId,
  discoveredAgentsLoading,
  discoveredAgents,
  editingAgentId,
  agentInstructions,
  setEditingAgentId,
  setAgentInstructions,
  onOpenAgent,
  onBackToAgents,
  refreshDiscoveredAgents,
  updateDiscoveredAgentInstructions,
}: SubagentsTabProps) {
  const agents = discoveredAgents?.agents ?? [];
  const selectedAgent = selectedAgentId
    ? agents.find((agent) => agent.id === selectedAgentId)
    : undefined;

  if (selectedAgentId && selectedProject && !discoveredAgentsLoading) {
    return (
      <SubagentDetailPage
        agent={selectedAgent}
        isEditing={editingAgentId === selectedAgentId}
        instructions={agentInstructions}
        onBack={onBackToAgents}
        onEdit={() => {
          if (!selectedAgent) return;
          setEditingAgentId(selectedAgent.id);
          setAgentInstructions(selectedAgent.instructions || "");
        }}
        onInstructionsChange={setAgentInstructions}
        onCancel={() => {
          setEditingAgentId(null);
          setAgentInstructions("");
        }}
        onSave={async () => {
          if (!selectedAgent) return;
          const updated = await updateDiscoveredAgentInstructions(
            selectedAgent.id,
            agentInstructions,
          );
          if (updated) {
            setEditingAgentId(null);
            setAgentInstructions("");
          }
        }}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading
          title="AI Agents"
          description="Detected file-based agents for the selected project and user configuration."
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
        <Empty text="Select or create a project to discover team members." />
      ) : discoveredAgentsLoading && !discoveredAgents ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-14 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning team configuration.
        </div>
      ) : agents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((agent) => (
            <SubagentCard
              key={agent.id}
              agent={agent}
              onOpen={() => onOpenAgent(agent.id)}
            />
          ))}
        </div>
      ) : (
        <Empty text="No team members were detected for this project." />
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
