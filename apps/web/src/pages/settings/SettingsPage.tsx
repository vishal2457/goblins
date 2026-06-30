import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  type ExecutionMode,
  type Goal,
  type Project,
} from "@goblins/shared-constants";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useDashboardSelection } from "../../hooks/useDashboardSelection";
import {
  useDashboardQuery,
} from "../../shared/api/features/dashboard/dashboard.queries";
import {
  useResetGoalPlanningMutation,
  useUpdateGoalMutation,
} from "../../shared/api/features/goal/goal.queries";
import {
  useCreateProjectMutation,
  useProjectAgentsQuery,
  useUpdateProjectAgentInstructionsMutation,
  useUpdateProjectMutation,
} from "../../shared/api/features/project/project.queries";
import { Bot, Folder, Loader2, Settings as SettingsIcon } from "lucide-react";
import { ProjectsTab } from "./components/ProjectsTab";
import { SubagentsTab } from "./components/SubagentsTab";

const VALID_TABS = ["projects", "subagents"] as const;
type SettingsTab = (typeof VALID_TABS)[number];

export function SettingsPage() {
  const dashboardQuery = useDashboardQuery();
  const projects = dashboardQuery.data?.projects || [];
  const goals = dashboardQuery.data?.goals || [];
  const {
    selectedProjectId,
    setSelectedProjectId,
  } = useDashboardSelection(projects, goals);
  const createProjectMutation = useCreateProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();
  const updateGoalMutation = useUpdateGoalMutation();
  const resetGoalPlanningMutation = useResetGoalPlanningMutation();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const activeTab: SettingsTab =
    tab && VALID_TABS.includes(tab as SettingsTab)
      ? (tab as SettingsTab)
      : "projects";
  const projectAgentsQuery = useProjectAgentsQuery(
    selectedProjectId,
    activeTab === "subagents",
  );
  const updateProjectAgentInstructionsMutation =
    useUpdateProjectAgentInstructionsMutation(selectedProjectId);

  const goToTab = (nextTab: SettingsTab) => {
    navigate(`/settings/${nextTab}`, { replace: true });
  };
  const [dialog, setDialog] = useState<
    null | "project" | "editProject" | "editGoal"
  >(null);
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

  const resetDialog = () => {
    setDialog(null);
    setEditingProjectId(null);
    setEditingGoalId(null);
    setName("");
    setDescription("");
    setTechnicalInstructions("");
    setLocation("");
    setBaseBranch("main");
    setExecutionMode("direct");
    setTestCommand("");
    setLintCommand("");
    setTypeCheckCommand("");
    setBuildCommand("");
  };

  const isGoalPlanningOpen = (goal: Goal) =>
    goal.phases.find((phase) => phase.id === "planning")?.status !==
    "completed";

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
    if (
      !window.confirm(
        `Clear planning data for "${goal.title}" and start planning again? This deletes generated tickets for this goal.`,
      )
    ) {
      return;
    }

    await resetGoalPlanningMutation.mutateAsync(goal.id);
  };

  const createItem = async () => {
    if (!name.trim()) return;

    try {
      if (dialog === "project" && location.trim()) {
        const project = await createProjectMutation.mutateAsync({
          name: name.trim(),
          location: location.trim(),
        });
        setSelectedProjectId(project.id);
      }

      if (
        dialog === "editProject" &&
        editingProjectId &&
        location.trim() &&
        baseBranch.trim()
      ) {
        await updateProjectMutation.mutateAsync({
          id: editingProjectId,
          data: {
            name: name.trim(),
            location: location.trim(),
            description: description.trim() || null,
            baseBranch: baseBranch.trim(),
            executionMode,
            testCommand: testCommand.trim() || null,
            lintCommand: lintCommand.trim() || null,
            typeCheckCommand: typeCheckCommand.trim() || null,
            buildCommand: buildCommand.trim() || null,
          },
        });
      }

      if (dialog === "editGoal" && editingGoalId) {
        await updateGoalMutation.mutateAsync({
          id: editingGoalId,
          data: {
            title: name.trim(),
            description: description.trim(),
            technicalInstructions: technicalInstructions.trim() || undefined,
          },
        });
      }

      resetDialog();
    } catch {
      return;
    }
  };

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs = [
    ["projects", "Projects & Goals", Folder],
    ["subagents", "Subagents", Bot],
  ] as const;
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedProjectGoals = selectedProject
    ? goals.filter((goal) => goal.projectId === selectedProject.id)
    : [];
  const errorMessage =
    activeTab === "subagents" && projectAgentsQuery.error instanceof Error
      ? projectAgentsQuery.error.message
      : dashboardQuery.error instanceof Error
        ? dashboardQuery.error.message
        : null;

  return (
    <div className="flex h-full overflow-hidden bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/10 md:flex">
        <div className="flex items-center gap-2 border-b p-6">
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Settings</h2>
        </div>
        {projects.length > 0 && (
          <div className="px-3 py-2">
            <Label className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground">
              Project
            </Label>
            <Select
              value={selectedProjectId || ""}
              onValueChange={(value) => setSelectedProjectId(value || null)}
            >
              <SelectTrigger className="w-full h-8">
                <SelectValue placeholder="Select project">
                  {(value: string) => {
                    const project = projects.find((item) => item.id === value);
                    return project?.name ?? "";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <nav className="flex flex-col gap-1 p-3">
          {tabs.map(([id, label, Icon]) => (
            <Button
              key={id}
              variant={activeTab === id ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => goToTab(id)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          ))}
        </nav>
      </aside>

      <main className="theme-scrollbar flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-4xl pb-16">
          {errorMessage && (
            <div className="mb-5 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
              {errorMessage}
            </div>
          )}

          {activeTab === "projects" && (
            <ProjectsTab
              selectedProject={selectedProject}
              selectedProjectGoals={selectedProjectGoals}
              onCreateProject={() => setDialog("project")}
              onEditProject={openEditProject}
              onEditGoal={openEditGoal}
              onResetPlanningData={(goal) => void resetPlanningData(goal)}
              isGoalPlanningOpen={isGoalPlanningOpen}
            />
          )}

          {activeTab === "subagents" && (
            <SubagentsTab
              selectedProject={selectedProject}
              discoveredAgentsLoading={
                projectAgentsQuery.isLoading || projectAgentsQuery.isFetching
              }
              discoveredAgents={projectAgentsQuery.data}
              editingAgentId={editingAgentId}
              agentInstructions={agentInstructions}
              setEditingAgentId={setEditingAgentId}
              setAgentInstructions={setAgentInstructions}
              refreshDiscoveredAgents={() => projectAgentsQuery.refetch()}
              updateDiscoveredAgentInstructions={(agentId, instructions) =>
                updateProjectAgentInstructionsMutation.mutateAsync({
                  agentId,
                  instructions,
                })
              }
            />
          )}
        </div>
      </main>

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => !open && resetDialog()}
      >
        <DialogContent className="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="px-4 pt-4 pr-12">
            <DialogTitle>
              {dialog === "project"
                ? "New Project"
                : dialog === "editProject"
                  ? "Edit Project"
                  : "Edit Goal"}
            </DialogTitle>
          </DialogHeader>
          <div className="theme-scrollbar min-h-0 space-y-4 overflow-y-auto px-4 py-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            {(dialog === "project" || dialog === "editProject") && (
              <Field label="Repository Path">
                <Input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="/absolute/path/to/repository"
                />
              </Field>
            )}
            {dialog === "editProject" && (
              <>
                <Field label="Description">
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-24 w-full rounded-md border bg-muted/20 p-3 text-sm"
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Base Branch">
                    <Input
                      value={baseBranch}
                      onChange={(event) => setBaseBranch(event.target.value)}
                    />
                  </Field>
                  <Field label="Execution Mode">
                    <Select
                      value={executionMode}
                      onValueChange={(value) =>
                        setExecutionMode(value as ExecutionMode)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="worktree">Worktree</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Test Command">
                    <Input
                      value={testCommand}
                      onChange={(event) => setTestCommand(event.target.value)}
                      placeholder="pnpm test"
                    />
                  </Field>
                  <Field label="Lint Command">
                    <Input
                      value={lintCommand}
                      onChange={(event) => setLintCommand(event.target.value)}
                      placeholder="pnpm lint"
                    />
                  </Field>
                  <Field label="Typecheck Command">
                    <Input
                      value={typeCheckCommand}
                      onChange={(event) =>
                        setTypeCheckCommand(event.target.value)
                      }
                      placeholder="pnpm check-types"
                    />
                  </Field>
                  <Field label="Build Command">
                    <Input
                      value={buildCommand}
                      onChange={(event) => setBuildCommand(event.target.value)}
                      placeholder="pnpm build"
                    />
                  </Field>
                </div>
              </>
            )}
            {dialog === "editGoal" && (
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24 w-full rounded-md border bg-muted/20 p-3 text-sm"
                />
              </Field>
            )}
            {dialog === "editGoal" && (
              <Field label="Technical Instructions">
                <textarea
                  value={technicalInstructions}
                  onChange={(event) =>
                    setTechnicalInstructions(event.target.value)
                  }
                  className="min-h-28 w-full rounded-md border bg-muted/20 p-3 font-mono text-xs"
                />
              </Field>
            )}
          </div>
          <DialogFooter className="shrink-0 rounded-none rounded-b-xl">
            <Button
              onClick={() => void createItem()}
              disabled={
                !name.trim() ||
                (dialog === "project" && !location.trim()) ||
                (dialog === "editProject" &&
                  (!editingProjectId ||
                    !location.trim() ||
                    !baseBranch.trim())) ||
                (dialog === "editGoal" && !editingGoalId)
              }
            >
              {dialog === "editGoal" || dialog === "editProject"
                ? "Save changes"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
