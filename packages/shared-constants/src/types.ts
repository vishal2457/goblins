export type GoalStatus =
  | "draft"
  | "planning"
  | "ready"
  | "running"
  | "paused"
  | "blocked"
  | "verifying"
  | "retrospective"
  | "completed"
  | "failed"
  | "cancelled";

export type GoalPhaseId = "planning" | "execution" | "retrospective";

export type GoalPhaseStatus =
  | "pending"
  | "in_progress"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface GoalPhase {
  id: GoalPhaseId;
  status: GoalPhaseStatus;
  position: number;
  startedAt?: string;
  completedAt?: string;
}

export interface GoalPhaseContent {
  title: string;
  description: string;
}

export interface PlanningFlowStep {
  id: string;
  title: string;
  description: string;
}

export type TicketType =
  | "research"
  | "test"
  | "implementation"
  | "refactor"
  | "integration"
  | "verification"
  | "documentation";

export type TicketStatus =
  | "backlog"
  | "ready"
  | "blocked"
  | "in_progress"
  | "review"
  | "failed"
  | "completed"
  | "cancelled";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type TicketSubagentStatus =
  | "analysing"
  | "executing"
  | "verifying"
  | "done";

export type StepColor = "slate" | "blue" | "amber" | "green" | "red";
export type BoardStepId = "todo" | "inprogress" | "done" | "failed";

export type DiscoveredAgentProvider = "codex" | "claude" | "cursor" | "opencode";
export type DiscoveredAgentScope = "project" | "user";
export type DiscoveredAgentMode = "primary" | "subagent" | "all" | "unknown";
export type DiscoveredAgentSourceKind =
  | "toml"
  | "markdown"
  | "json"
  | "builtin"
  | "runtime";

export interface BoardStep {
  id: BoardStepId;
  name: string;
  instructions: string;
  allowedNextStepIds: string[];
  allowedPreviousStepIds: string[];
  isTerminal: boolean;
  color: StepColor;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  description?: string;
  techPreferences: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectModule {
  id: string;
  projectId: string;
  name: string;
  shortDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveredAgent {
  id: string;
  provider: DiscoveredAgentProvider;
  name: string;
  displayName: string;
  description?: string;
  instructions?: string;
  instructionsPreview?: string;
  model?: string;
  mode: DiscoveredAgentMode;
  scope: DiscoveredAgentScope;
  sourcePath?: string;
  sourceKind: DiscoveredAgentSourceKind;
  tools?: string[];
  permissions?: Record<string, unknown>;
  hidden?: boolean;
  enabled?: boolean;
  color?: string;
  metadata: Record<string, unknown>;
  validation: {
    valid: boolean;
    warnings: string[];
    errors: string[];
  };
  precedenceRank: number;
  shadowedBy?: string;
}

export interface DiscoveredAgentsResponse {
  agents: DiscoveredAgent[];
  scannedAt: string;
  providers: Record<
    DiscoveredAgentProvider,
    {
      available: boolean;
      errors: string[];
    }
  >;
}

export interface Goal {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: GoalStatus;
  phases: GoalPhase[];
  constraints: string[];
  acceptanceCriteria: string[];
  relevantFiles: string[];
  technicalInstructions?: string;
  outOfScopeItems: string[];
  ticketIds: string[];
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  lastError?: {
    phase:
      | "planning"
      | "execution"
      | "retrospective"
      | "verification"
      | "review";
    message: string;
    details?: string;
    occurredAt: string;
  };
}

export interface Ticket {
  id: string;
  projectId: string;
  goalId: string;
  moduleId: string;
  title: string;
  shortDescription: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  currentStepId: string;
  stepStatus: "in_progress" | "completed" | "failed" | "blocked" | null;
  stepHistory: TicketStepExecution[];
  priority: TicketPriority;
  acceptanceCriteria: string[];
  technicalNotes: string[];
  relevantFiles: string[];
  dependencyIds: string[];
  worktreePath?: string;
  branchName?: string;
  testPlan: string[];
  verificationCommands: string[];
  retryCount: number;
  maximumRetries: number;
  assignedSubagentName?: string | null;
  subagentStatus?: TicketSubagentStatus | null;
  subagentStatusUpdatedAt?: string | null;
  lastActivityAt?: string | null;
  lastActivityByAgentName?: string | null;
  activity?: TicketActivity;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TicketActivity {
  lastActivityAt?: string | null;
  lastActivityAgeMs?: number | null;
  lastActivityByAgentName?: string | null;
  commentCount: number;
  recentComments: TicketComment[];
}

export interface TicketStepExecution {
  id: string;
  stepId: string;
  status: "in_progress" | "completed" | "failed" | "blocked";
  startedAt: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

export type TicketCommentKind = "note" | "question" | "decision" | "blocker";

export interface TicketComment {
  id: string;
  ticketId: string;
  body: string;
  authorName?: string | null;
  kind: TicketCommentKind;
  createdAt: string;
}

export type RealtimeEventType =
  | "connected"
  | "ticket.created"
  | "ticket.updated"
  | "ticket.deleted";

export type TicketRealtimeEventType = Extract<
  RealtimeEventType,
  "ticket.created" | "ticket.updated" | "ticket.deleted"
>;

export interface RealtimeEvent<TPayload = unknown> {
  id: string;
  type: RealtimeEventType;
  payload: TPayload;
  createdAt: string;
}

export interface TicketRealtimeEventPayload<TTicket = Ticket> {
  ticket: TTicket;
  previousTicket?: TTicket;
}

export interface AuditLog {
  id: string;
  module: string;
  action: string;
  entityName: string;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
  userId?: string | null;
  userName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}
