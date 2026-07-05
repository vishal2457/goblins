export const AuditAction = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  START_PLANNING: "START_PLANNING",
  COMPLETE_PLANNING: "COMPLETE_PLANNING",
  START_EXECUTION: "START_EXECUTION",
  START_RETROSPECTIVE: "START_RETROSPECTIVE",
  COMPLETE_RETROSPECTIVE: "COMPLETE_RETROSPECTIVE",
  STATUS_CHANGE: "STATUS_CHANGE",
  REPORT: "REPORT",
  APPEND_FILE: "APPEND_FILE",
  ANALYSE_RETROSPECTIVE: "ANALYSE_RETROSPECTIVE",
  APPROVE_IMPROVEMENT: "APPROVE_IMPROVEMENT",
  REJECT_IMPROVEMENT: "REJECT_IMPROVEMENT",
  APPLY_IMPROVEMENT: "APPLY_IMPROVEMENT",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  PASSWORD_RESET_REQUEST: "PASSWORD_RESET_REQUEST",
  PASSWORD_RESET: "PASSWORD_RESET",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
export const AUDIT_ACTION_VALUES = Object.values(AuditAction) as [
  AuditAction,
  ...AuditAction[],
];

export const AuditModule = {
  COMPANY: "company",
  COUNTRY: "country",
  USER: "user",
  ROLE: "role",
  CONTACT: "contact",
  PRODUCT: "product",
  CALENDAR: "calendar",
  CHAT: "chat",
  DEAL: "deal",
  TAG: "tag",
  NOTE: "note",
  FILE: "file",
  ENTITY_LINK: "entity_link",
  GOAL: "goal",
  TICKET: "ticket",
  SYSTEM: "system",
} as const;

export type AuditModule = (typeof AuditModule)[keyof typeof AuditModule];
export const AUDIT_MODULE_VALUES = Object.values(AuditModule) as [
  AuditModule,
  ...AuditModule[],
];
