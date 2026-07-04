import type {
  BoardStep,
  BoardStepId,
  GoalPhaseContent,
  GoalPhaseId,
  GoalPhaseStatus,
  PlanningFlowStep,
  StepColor,
  TicketPriority,
  TicketSubagentStatus,
  TicketStatus,
} from "./types.js";

export const GOAL_PHASE_CONTENT: Record<GoalPhaseId, GoalPhaseContent> = {
  planning: {
    title: "Planning",
    description:
      "Clarify scope, resolve ambiguity, and prepare the ticket plan.",
  },
  execution: {
    title: "Execution",
    description:
      "Move prepared tickets through the board until the planned work is complete.",
  },
  retrospective: {
    title: "Retrospective",
    description:
      "Review what worked, capture improvement actions, and suggest instruction updates for future runs.",
  },
};

export const PLANNING_FLOW: PlanningFlowStep[] = [
  {
    id: "read-context",
    title: "Read goal context",
    description:
      "Review the goal, project details, constraints, acceptance criteria, relevant files, and technical instructions.",
  },
  {
    id: "find-ambiguity",
    title: "Find ambiguity",
    description:
      "Identify missing decisions, unclear scope, conflicting requirements, hidden assumptions, risks, and dependencies.",
  },
  {
    id: "interview-user",
    title: "Interview if needed",
    description:
      "Ask concise user questions whenever the goal can be interpreted in more than one material way.",
  },
  {
    id: "confirm-understanding",
    title: "Confirm understanding",
    description:
      "Summarize the resolved objective, scope, non-goals, assumptions, and acceptance criteria before handoff.",
  },
  {
    id: "handoff",
    title: "Prepare orchestrator handoff",
    description:
      "Produce a clear planning handoff the orchestrator can execute without reinterpreting requirements.",
  },
];

export const STEP_COLORS: StepColor[] = ["slate", "blue", "amber", "green", "red"];

export const BOARD_STEP_IDS: BoardStepId[] = [
  "todo",
  "inprogress",
  "done",
  "failed",
];

export const STATIC_BOARD_STEPS: BoardStep[] = [
  {
    id: "todo",
    name: "Todo",
    instructions: "Planned or blocked work that is not currently running.",
    allowedNextStepIds: ["inprogress", "failed"],
    allowedPreviousStepIds: [],
    isTerminal: false,
    color: "slate",
    position: 0,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "inprogress",
    name: "In Progress",
    instructions: "Work currently in progress.",
    allowedNextStepIds: ["done", "failed", "todo"],
    allowedPreviousStepIds: ["todo"],
    isTerminal: false,
    color: "blue",
    position: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "done",
    name: "Done",
    instructions: "Work completed with evidence.",
    allowedNextStepIds: [],
    allowedPreviousStepIds: ["todo", "inprogress"],
    isTerminal: true,
    color: "green",
    position: 2,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "failed",
    name: "Failed",
    instructions: "Work that failed after retries or needs intervention.",
    allowedNextStepIds: ["todo", "inprogress"],
    allowedPreviousStepIds: ["todo", "inprogress"],
    isTerminal: true,
    color: "red",
    position: 3,
    createdAt: "",
    updatedAt: "",
  },
];

export function boardStepIdForTicketStatus(status: TicketStatus): BoardStepId {
  if (status === "in_progress") return "inprogress";
  if (status === "completed") return "done";
  if (status === "failed" || status === "cancelled") return "failed";
  return "todo";
}

export const STATUS_LABELS: Record<TicketStatus | "backlog", string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  failed: "Failed",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<string, string> = {
  ready: "border-blue-500/50 text-blue-600",
  in_progress: "border-blue-500 bg-blue-500/10 text-blue-700",
  review: "border-amber-500/50 text-amber-700",
  completed: "border-green-500 bg-green-500/10 text-green-700",
  failed: "border-red-500 bg-red-500/10 text-red-700",
  blocked: "border-amber-500/50 text-amber-700",
  cancelled: "border-muted-foreground/30 text-muted-foreground",
};

export const SUBAGENT_STATUS_LABELS: Record<TicketSubagentStatus, string> = {
  analysing: "Analysing",
  executing: "Executing",
  verifying: "Verifying",
  done: "Done",
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  critical: "border-red-500/50 text-red-500",
  high: "border-orange-500/50 text-orange-500",
  medium: "border-blue-500/50 text-blue-500",
  low: "border-muted-foreground/30 text-muted-foreground",
};

export const PHASE_STATUS_LABELS: Record<GoalPhaseStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const REFRESH_INTERVAL_MS = 5000;
