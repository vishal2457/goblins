import { type Goal, type Project } from "@goblins/shared-constants";
import {
  CheckCircle2,
  FolderOpen,
  Info,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Target,
  XCircle,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
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
  canExecute,
  executeGoalLabel,
  isGoalRunning,
  isGoalPaused,
  isGoalCancelled,
  canStartRetrospective,
  isGoalRetrospective,
  onProjectSelect,
  onGoalSelect,
  onOpenGoalDetails,
  onExecuteGoal,
  onPauseGoal,
  onResumeGoal,
  onCancelGoal,
  onOpenRetrospective,
  onCompleteRetrospective,
}: {
  projects: Project[];
  currentProjectGoals: Goal[];
  selectedProjectId: string;
  selectedGoalId: string;
  selectedGoal?: Goal;
  canExecute: boolean;
  executeGoalLabel: string;
  isGoalRunning: boolean;
  isGoalPaused: boolean;
  isGoalCancelled: boolean;
  canStartRetrospective: boolean;
  isGoalRetrospective: boolean;
  onProjectSelect: (projectId: string) => void;
  onGoalSelect: (goalId: string) => void;
  onOpenGoalDetails: () => void;
  onExecuteGoal: () => void;
  onPauseGoal: () => void;
  onResumeGoal: () => void;
  onCancelGoal: () => void;
  onOpenRetrospective: () => void;
  onCompleteRetrospective: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b bg-muted/10 px-6 py-2 shrink-0 flex-wrap">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <Label className="text-muted-foreground text-xs">Project:</Label>
        <Select value={selectedProjectId} onValueChange={onProjectSelect}>
          <SelectTrigger className="w-[180px] h-8 bg-background">
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem
                key={project.id}
                value={project.id}
                label={project.name}
              >
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
            <SelectValue placeholder="Select Goal" />
          </SelectTrigger>
          <SelectContent>
            {currentProjectGoals.map((goal) => (
              <SelectItem key={goal.id} value={goal.id} label={goal.title}>
                <span className="flex items-center gap-2">
                  {goal.title}
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                    {goal.status}
                  </Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGoal && (
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Badge
            variant="outline"
            className={`text-[11px] px-2 py-0.5 capitalize ${
              selectedGoal.status === "running"
                ? "border-green-500/50 text-green-500"
                : selectedGoal.status === "failed"
                  ? "border-red-500/50 text-red-500"
                  : selectedGoal.status === "completed"
                    ? "border-blue-500/50 text-blue-500"
                    : ""
            }`}
          >
            {selectedGoal.status}
          </Badge>
          <Button
            size="icon-sm"
            variant="ghost"
            title="View project and goal details"
            onClick={onOpenGoalDetails}
          >
            <Info className="h-3.5 w-3.5" />
          </Button>
          {canExecute && (
            <Button size="sm" className="h-7 text-xs gap-1" onClick={onExecuteGoal}>
              <Play className="h-3 w-3" />
              {executeGoalLabel}
            </Button>
          )}
          {isGoalRunning && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={onPauseGoal}
              >
                <Pause className="h-3 w-3" />
                Pause
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-red-500"
                onClick={onCancelGoal}
              >
                <XCircle className="h-3 w-3" />
                Cancel
              </Button>
            </>
          )}
          {(isGoalPaused || isGoalCancelled) && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={onResumeGoal}
            >
              <RotateCcw className="h-3 w-3" />
              Resume
            </Button>
          )}
          {canStartRetrospective && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={onOpenRetrospective}
            >
              <Lightbulb className="h-3 w-3" />
              Start retrospective
            </Button>
          )}
          {isGoalRetrospective && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={onCompleteRetrospective}
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete retrospective
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
