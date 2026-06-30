export const AuditAction = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
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
} as const;

export type AuditModule = (typeof AuditModule)[keyof typeof AuditModule];
export const AUDIT_MODULE_VALUES = Object.values(AuditModule) as [
  AuditModule,
  ...AuditModule[],
];
