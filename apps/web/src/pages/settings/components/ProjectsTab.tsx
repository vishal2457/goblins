import type { Goal, Project } from "@goblins/shared-constants";
import { Edit3, Plus } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

type ProjectsTabProps = {
  selectedProject: Project | undefined;
  selectedProjectGoals: Goal[];
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
};

export function ProjectsTab({
  selectedProject,
  selectedProjectGoals,
  onCreateProject,
  onEditProject,
}: ProjectsTabProps) {
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
                <Badge variant="secondary">
                  {selectedProjectGoals.length} goals
                </Badge>
              </div>
            </div>
            {selectedProject.description && (
              <div className="mt-4 rounded-md border bg-muted/10 p-3">
                <p className="text-sm text-muted-foreground">
                  {selectedProject.description}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {selectedProjectGoals.map((goal) => (
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
              </div>
            ))}
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

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-14 text-center text-sm text-muted-foreground">
      <div>{text}</div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
