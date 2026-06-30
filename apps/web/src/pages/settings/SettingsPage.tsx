import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRealtimeDashboard } from "../../hooks/useRealtimeDashboard";
import {
  type DiscoveredAgent,
  type ExecutionMode,
  type Goal,
  type Project,
} from "@goblins/shared-constants";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Bot, ChevronDown, Edit3, Folder, Loader2, Plus, RefreshCw, RotateCcw, Save, Settings as SettingsIcon } from "lucide-react";

const VALID_TABS = ["projects", "subagents"] as const;
type SettingsTab = (typeof VALID_TABS)[number];

export function SettingsPage() {
  const data = useRealtimeDashboard();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const activeTab: SettingsTab = tab && VALID_TABS.includes(tab as SettingsTab) ? (tab as SettingsTab) : "projects";

  const goToTab = (t: SettingsTab) => {
    navigate(`/settings/${t}`, { replace: true });
  };
  const [dialog, setDialog] = useState<null | "project" | "editProject" | "editGoal">(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [technicalInstructions, setTechnicalInstructions] = useState("");
  const [location, setLocation] = useState("");
  const [baseBranch, setBaseBranch] = useState("main");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("direct");
  const [testCommand, setTestCommand] = useState("");
  const [lintCommand, setLintCommand] = useState("");
  const [typeCheckCommand, setTypeCheckCommand] = useState("");
  const [buildCommand, setBuildCommand] = useState("");
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentInstructions, setAgentInstructions] = useState("");

  useEffect(() => {
    if (activeTab !== "subagents" || !data.selectedProjectId) return;
    void data.refreshDiscoveredAgents();
  }, [activeTab, data.selectedProjectId]);

  const resetDialog = () => { setDialog(null); setEditingProjectId(null); setEditingGoalId(null); setName(""); setDescription(""); setTechnicalInstructions(""); setLocation(""); setBaseBranch("main"); setExecutionMode("direct"); setTestCommand(""); setLintCommand(""); setTypeCheckCommand(""); setBuildCommand(""); };

  const isGoalPlanningOpen = (goal: Goal) => goal.phases.find((phase) => phase.id === "planning")?.status !== "completed";

  const openEditGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setName(goal.title);
    setDescription(goal.description || "");
    setTechnicalInstructions(goal.technicalInstructions || "");
    setDialog("editGoal");
  };

  const openEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setName(project.name);
    setLocation(project.location);
    setDescription(project.description || "");
    setBaseBranch(project.baseBranch || "main");
    setExecutionMode(project.executionMode || "direct");
    setTestCommand(project.testCommand || "");
    setLintCommand(project.lintCommand || "");
    setTypeCheckCommand(project.typeCheckCommand || "");
    setBuildCommand(project.buildCommand || "");
    setDialog("editProject");
  };

  const resetPlanningData = async (goal: Goal) => {
    if (!window.confirm(`Clear planning data for "${goal.title}" and start planning again? This deletes generated tickets for this goal.`)) return;
    await data.resetGoalPlanning(goal.id);
  };

  const createItem = async () => {
    if (!name.trim()) return;
    if (dialog === "project" && location.trim()) await data.addProject(name.trim(), location.trim());
    if (dialog === "editProject" && editingProjectId && location.trim() && baseBranch.trim()) await data.updateProject(editingProjectId, { name: name.trim(), location: location.trim(), description: description.trim() || null, baseBranch: baseBranch.trim(), executionMode, testCommand: testCommand.trim() || null, lintCommand: lintCommand.trim() || null, typeCheckCommand: typeCheckCommand.trim() || null, buildCommand: buildCommand.trim() || null });
    if (dialog === "editGoal" && editingGoalId) await data.updateGoal(editingGoalId, { title: name.trim(), description: description.trim(), technicalInstructions: technicalInstructions.trim() || undefined });
    resetDialog();
  };

  if (data.loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;

  const tabs = [
    ["projects", "Projects & Goals", Folder],
    ["subagents", "Subagents", Bot],
  ] as const;
  const selectedProject = data.projects.find((project) => project.id === data.selectedProjectId);
  const selectedProjectGoals = selectedProject
    ? data.goals.filter((goal) => goal.projectId === selectedProject.id)
    : [];
  const selectedProjectCommands = selectedProject
    ? [
        selectedProject.testCommand,
        selectedProject.lintCommand,
        selectedProject.typeCheckCommand,
        selectedProject.buildCommand,
      ].filter(Boolean)
    : [];

  return (
    <div className="flex h-full overflow-hidden bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/10 md:flex">
        <div className="flex items-center gap-2 border-b p-6"><SettingsIcon className="h-5 w-5 text-muted-foreground" /><h2 className="font-semibold">Settings</h2></div>
        {data.projects.length > 0 && (
          <div className="px-3 py-2">
            <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">Project</Label>
            <Select
              value={data.selectedProjectId || ""}
              onValueChange={data.setSelectedProjectId}
            >
              <SelectTrigger className="w-full h-8">
                <SelectValue placeholder="Select project">
                  {(value: string) => {
                    const project = data.projects.find((p) => p.id === value);
                    return project?.name ?? "";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {data.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <nav className="flex flex-col gap-1 p-3">
          {tabs.map(([id, label, Icon]) => <Button key={id} variant={activeTab === id ? "secondary" : "ghost"} className="justify-start" onClick={() => goToTab(id)}><Icon className="mr-2 h-4 w-4" />{label}</Button>)}
        </nav>
      </aside>

      <main className="theme-scrollbar flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-4xl pb-16">
          {data.error && <div className="mb-5 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">{data.error}</div>}

          {activeTab === "projects" && <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Heading title="Projects & Goals" description="Create work against the selected project." />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setDialog("project")}><Plus className="mr-2 h-4 w-4" />New Project</Button>
                <Button variant="outline" disabled={!selectedProject} onClick={() => selectedProject && openEditProject(selectedProject)}><Edit3 className="mr-2 h-4 w-4" />Edit Project</Button>
              </div>
            </div>

            {selectedProject ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{selectedProject.name}</div>
                      <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{selectedProject.location}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{selectedProject.executionMode || "direct"}</Badge>
                      <Badge variant="outline">{selectedProject.baseBranch || "main"}</Badge>
                      <Badge variant="secondary">{selectedProjectGoals.length} goals</Badge>
                    </div>
                  </div>
                  {(selectedProject.description || selectedProjectCommands.length > 0) && (
                    <div className="mt-4 rounded-md border bg-muted/10 p-3">
                      {selectedProject.description && <p className="text-sm text-muted-foreground">{selectedProject.description}</p>}
                      {selectedProjectCommands.length > 0 && (
                        <div className="mt-3 grid gap-2 text-[11px] md:grid-cols-2">
                          {selectedProject.testCommand && <CommandLabel label="Test" command={selectedProject.testCommand} />}
                          {selectedProject.lintCommand && <CommandLabel label="Lint" command={selectedProject.lintCommand} />}
                          {selectedProject.typeCheckCommand && <CommandLabel label="Typecheck" command={selectedProject.typeCheckCommand} />}
                          {selectedProject.buildCommand && <CommandLabel label="Build" command={selectedProject.buildCommand} />}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedProjectGoals.map((goal) => { const planningOpen = isGoalPlanningOpen(goal); return <div key={goal.id} className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/10 px-3 py-2"><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{goal.title}</div>{goal.description && <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{goal.description}</div>}</div><Badge variant="outline" className="capitalize">{goal.status}</Badge><Button size="icon-sm" variant="ghost" title={planningOpen ? "Edit goal" : "Planning is completed"} disabled={!planningOpen} onClick={() => openEditGoal(goal)}><Edit3 className="h-3.5 w-3.5" /></Button><Button size="icon-sm" variant="ghost" title={planningOpen ? "Clear planning data" : "Planning is completed"} disabled={!planningOpen} onClick={() => resetPlanningData(goal)}><RotateCcw className="h-3.5 w-3.5" /></Button></div>; })}
                  {selectedProjectGoals.length === 0 && <Empty text="No goals for this project." />}
                </div>
              </div>
            ) : (
              <Empty text="No projects configured." action={<Button onClick={() => setDialog("project")}><Plus className="mr-2 h-4 w-4" />New Project</Button>} />
            )}
          </section>}

          {activeTab === "subagents" && <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Heading title="Subagents" description="Detected file-based subagents for the selected project and user configuration." />
              <Button variant="outline" disabled={!selectedProject || data.discoveredAgentsLoading} onClick={() => void data.refreshDiscoveredAgents()}>
                {data.discoveredAgentsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </Button>
            </div>

            {!selectedProject ? (
              <Empty text="Select or create a project to discover subagents." />
            ) : data.discoveredAgentsLoading && !data.discoveredAgents ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-14 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning subagent files.
              </div>
            ) : data.discoveredAgents && data.discoveredAgents.agents.length > 0 ? (
              <div className="overflow-hidden rounded-lg border bg-card">
                {data.discoveredAgents.agents.map((agent) => (
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
                      const updated = await data.updateDiscoveredAgentInstructions(agent.id, agentInstructions);
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
          </section>}

        </div>
      </main>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && resetDialog()}><DialogContent className="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-md"><DialogHeader className="px-4 pt-4 pr-12"><DialogTitle>{dialog === "project" ? "New Project" : dialog === "editProject" ? "Edit Project" : "Edit Goal"}</DialogTitle></DialogHeader><div className="theme-scrollbar min-h-0 space-y-4 overflow-y-auto px-4 py-3"><Field label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        {(dialog === "project" || dialog === "editProject") && <Field label="Repository Path"><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="/absolute/path/to/repository" /></Field>}
        {dialog === "editProject" && <><Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 w-full rounded-md border bg-muted/20 p-3 text-sm" /></Field><div className="grid gap-4 md:grid-cols-2"><Field label="Base Branch"><Input value={baseBranch} onChange={(event) => setBaseBranch(event.target.value)} /></Field><Field label="Execution Mode"><Select value={executionMode} onValueChange={(value) => setExecutionMode(value as ExecutionMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct">Direct</SelectItem><SelectItem value="worktree">Worktree</SelectItem></SelectContent></Select></Field></div><div className="grid gap-4 md:grid-cols-2"><Field label="Test Command"><Input value={testCommand} onChange={(event) => setTestCommand(event.target.value)} placeholder="pnpm test" /></Field><Field label="Lint Command"><Input value={lintCommand} onChange={(event) => setLintCommand(event.target.value)} placeholder="pnpm lint" /></Field><Field label="Typecheck Command"><Input value={typeCheckCommand} onChange={(event) => setTypeCheckCommand(event.target.value)} placeholder="pnpm check-types" /></Field><Field label="Build Command"><Input value={buildCommand} onChange={(event) => setBuildCommand(event.target.value)} placeholder="pnpm build" /></Field></div></>}
        {dialog === "editGoal" && <Field label="Description"><textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 w-full rounded-md border bg-muted/20 p-3 text-sm" /></Field>}
        {dialog === "editGoal" && <Field label="Technical Instructions"><textarea value={technicalInstructions} onChange={(event) => setTechnicalInstructions(event.target.value)} className="min-h-28 w-full rounded-md border bg-muted/20 p-3 font-mono text-xs" /></Field>}
      </div><DialogFooter className="shrink-0 rounded-none rounded-b-xl"><Button onClick={createItem} disabled={!name.trim() || (dialog === "project" && !location.trim()) || (dialog === "editProject" && (!editingProjectId || !location.trim() || !baseBranch.trim())) || (dialog === "editGoal" && !editingGoalId)}>{dialog === "editGoal" || dialog === "editProject" ? "Save changes" : "Create"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function Heading({ title, description }: { title: string; description: string }) { return <div><h3 className="text-2xl font-semibold tracking-tight">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function CommandLabel({ label, command }: { label: string; command: string }) { return <div><span className="font-medium text-muted-foreground">{label}</span><code className="ml-2 rounded bg-background px-1.5 py-0.5 font-mono">{command}</code></div>; }
function Empty({ text, action }: { text: string; action?: React.ReactNode }) { return <div className="rounded-lg border border-dashed px-4 py-14 text-center text-sm text-muted-foreground"><div>{text}</div>{action && <div className="mt-4 flex justify-center">{action}</div>}</div>; }

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
            {agent.shadowedBy && <CenteredBadge variant="outline">Shadowed</CenteredBadge>}
            {!agent.validation.valid && <CenteredBadge variant="destructive">Invalid</CenteredBadge>}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <CenteredBadge variant="secondary" className="capitalize">{agent.provider}</CenteredBadge>
            <CenteredBadge variant="outline" className="capitalize">{agent.scope}</CenteredBadge>
            <CenteredBadge variant="outline" className="capitalize">{agent.mode}</CenteredBadge>
            <CenteredBadge variant="outline" className="uppercase">{agent.sourceKind}</CenteredBadge>
            {agent.model && <CenteredBadge variant="outline">{agent.model}</CenteredBadge>}
          </div>
          {agent.description && <p className="mt-2 text-sm text-muted-foreground">{agent.description}</p>}
        </div>
      </button>

      {isOpen && (
        <div className="border-t bg-muted/10 px-4 py-4">
          <div className="flex justify-end">
            {!isEditing && (
              <Button size="sm" variant="outline" onClick={onEdit} disabled={!agent.sourcePath}>
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
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={onSave} disabled={!instructions.trim()}>
                  <Save className="mr-2 h-3.5 w-3.5" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-md border bg-background/70 p-3">
              <Label className="text-xs text-muted-foreground">Instructions</Label>
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

function CenteredBadge({
  className,
  ...props
}: React.ComponentProps<typeof Badge>) {
  return (
    <Badge
      {...props}
      className={`inline-flex h-5 items-center justify-center leading-none ${className || ""}`}
    />
  );
}
