import type { Goal, Project } from "@goblins/shared-constants";
import { Edit3, Plus, RotateCcw } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

type ProjectsTabProps = {
  selectedProject: Project | undefined;
  selectedProjectGoals: Goal[];
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
  onEditGoal: (goal: Goal) => void;
  onResetPlanningData: (goal: Goal) => void | Promise<void>;
  isGoalPlanningOpen: (goal: Goal) => boolean;
};

export function ProjectsTab({
  selectedProject,
  selectedProjectGoals,
  onCreateProject,
  onEditProject,
  onEditGoal,
  onResetPlanningData,
  isGoalPlanningOpen,
}: ProjectsTabProps) {
  const selectedProjectCommands = selectedProject
    ? [
        selectedProject.testCommand,
        selectedProject.lintCommand,
        selectedProject.typeCheckCommand,
        selectedProject.buildCommand,
      ].filter(Boolean)
    : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Heading
          title="Projects & Goals"
          description="Create work against the selected project."
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={onCreateProject}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
          <Button
            variant="outline"
            disabled={!selectedProject}
            onClick={() => selectedProject && onEditProject(selectedProject)}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Project
          </Button>
        </div>
      </div>

      {selectedProject ? (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{selectedProject.name}</div>
                <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  {selectedProject.location}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {selectedProject.executionMode || "direct"}
                </Badge>
                <Badge variant="outline">
                  {selectedProject.baseBranch || "main"}
                </Badge>
                <Badge variant="secondary">
                  {selectedProjectGoals.length} goals
                </Badge>
              </div>
            </div>
            {(selectedProject.description ||
              selectedProjectCommands.length > 0) && (
              <div className="mt-4 rounded-md border bg-muted/10 p-3">
                {selectedProject.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedProject.description}
                  </p>
                )}
                {selectedProjectCommands.length > 0 && (
                  <div className="mt-3 grid gap-2 text-[11px] md:grid-cols-2">
                    {selectedProject.testCommand && (
                      <CommandLabel
                        label="Test"
                        command={selectedProject.testCommand}
                      />
                    )}
                    {selectedProject.lintCommand && (
                      <CommandLabel
                        label="Lint"
                        command={selectedProject.lintCommand}
                      />
                    )}
                    {selectedProject.typeCheckCommand && (
                      <CommandLabel
                        label="Typecheck"
                        command={selectedProject.typeCheckCommand}
                      />
                    )}
                    {selectedProject.buildCommand && (
                      <CommandLabel
                        label="Build"
                        command={selectedProject.buildCommand}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {selectedProjectGoals.map((goal) => {
              const planningOpen = isGoalPlanningOpen(goal);
              return (
                <div
                  key={goal.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/10 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {goal.title}
                    </div>
                    {goal.description && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {goal.description}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {goal.status}
                  </Badge>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title={planningOpen ? "Edit goal" : "Planning is completed"}
                    disabled={!planningOpen}
                    onClick={() => onEditGoal(goal)}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title={
                      planningOpen
                        ? "Clear planning data"
                        : "Planning is completed"
                    }
                    disabled={!planningOpen}
                    onClick={() => onResetPlanningData(goal)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            {selectedProjectGoals.length === 0 && (
              <Empty text="No goals for this project." />
            )}
          </div>
        </div>
      ) : (
        <Empty
          text="No projects configured."
          action={
            <Button onClick={onCreateProject}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          }
        />
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

function CommandLabel({ label, command }: { label: string; command: string }) {
  return (
    <div>
      <span className="font-medium text-muted-foreground">{label}</span>
      <code className="ml-2 rounded bg-background px-1.5 py-0.5 font-mono">
        {command}
      </code>
    </div>
  );
}

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-14 text-center text-sm text-muted-foreground">
      <div>{text}</div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
