import { type Goal, type Project } from "@goblins/shared-constants";
import { FolderOpen, Info, Target } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

export function DashboardToolbar({
  projects,
  currentProjectGoals,
  selectedProjectId,
  selectedGoalId,
  selectedGoal,
  onProjectSelect,
  onGoalSelect,
  onOpenGoalDetails,
}: {
  projects: Project[];
  currentProjectGoals: Goal[];
  selectedProjectId: string;
  selectedGoalId: string;
  selectedGoal?: Goal;
  onProjectSelect: (projectId: string) => void;
  onGoalSelect: (goalId: string) => void;
  onOpenGoalDetails: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b bg-muted/10 px-6 py-2 shrink-0 flex-wrap">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <Label className="text-muted-foreground text-xs">Project:</Label>
        <Select value={selectedProjectId} onValueChange={onProjectSelect}>
          <SelectTrigger className="w-[180px] h-8 bg-background">
            <SelectValue placeholder="Select Project">
              {(value: string | null) =>
                projects.find((project) => project.id === value)?.name
              }
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

      <div className="flex items-center gap-3">
        <Target className="h-4 w-4 text-muted-foreground" />
        <Label className="text-muted-foreground text-xs">Goal:</Label>
        <Select
          value={selectedGoalId}
          onValueChange={onGoalSelect}
          disabled={!selectedProjectId || currentProjectGoals.length === 0}
        >
          <SelectTrigger className="w-[220px] h-8 bg-background">
            <SelectValue placeholder="Select Goal">
              {(value: string | null) =>
                currentProjectGoals.find((goal) => goal.id === value)?.title
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {currentProjectGoals.map((goal) => (
              <SelectItem key={goal.id} value={goal.id}>
                {goal.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGoal && (
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Button
            size="icon-sm"
            variant="ghost"
            title="View project and goal details"
            onClick={onOpenGoalDetails}
          >
            <Info className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
