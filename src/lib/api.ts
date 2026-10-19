// src/lib/api.ts
import { envOr } from "@/lib/env";
import type { CalendarResponse, CalendarEvent } from "../types/calendar";

/* ============================
   SHARED TYPES
============================ */

export type UserRole = "executive" | "manager" | "team_member" | "admin";

export interface Company {
  bio: string;
  id: string;
  name: string;
  companyCode: string;
  industry: string | null;
  size: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AutomationTrigger = "task_created" | "task_status_changed" | "task_completed" | "task_reopened" | "task_priority_changed" | "task_assignee_changed" | "task_due_date_changed" | "task_overdue" | "project_created" | "project_status_changed";
export type AutomationAction = "SEND_ADMIINO_NOTIFICATION" | "CREATE_FOLLOW_UP_TASK";
export interface AutomationRule {
  id: string; companyId: string; name: string; description: string | null; enabled: boolean;
  triggerType: AutomationTrigger; triggerConfig: Record<string, never>; conditions: Array<{ field: string; operator: "equals"; value: string | boolean }>;
  actionType: AutomationAction; actionConfig: Record<string, unknown>; createdBy: string | null; lastTriggeredAt: string | null; archivedAt?: string | null; createdAt: string; updatedAt: string;
}
export interface AutomationExecution {
  id: string; automationRuleId: string | null; automationNameSnapshot: string; entityType: string; entityId: string | null; eventType: string;
  status: "pending" | "succeeded" | "skipped" | "failed"; errorCode: string | null; errorMessageSafe: string | null; resultSummary: string | null; createdAt: string; completedAt: string | null;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;

  companyId: string | null;
  company?: Company | null;

  role: UserRole;

  subscriptionTier: "free" | "premium";

  isVerified: boolean;
  invitationStatus: "pending" | "approved" | "rejected" | "invited" | "removed";
  invitedBy: string | null;

  isActive: boolean;

  specialization?: string | null;
  experience?: number | null;
  hourlyRate?: number | null;
  bio?: string | null;
  skills?: string[];

  isAvailable?: boolean;
  rating?: number;

  profilePictureUrl?: string | null;

  createdAt: string;
  updatedAt: string;
}

export type WorkspaceRole = "owner" | "admin" | "manager" | "member";

export interface CompanyMember {
  id: string;              // membership id
  userId: string;          // user id (THIS is what verify/reject expects)
  companyId: string;
  role: WorkspaceRole;
  status: "active" | "removed" | string;
  isVerified: boolean;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
  user: User;
  company?: Company;
}

export interface TeamMemberLink {
  id: string;
  teamId: string;
  companyMemberId: string;
  companyMember: CompanyMember;
}

export interface Team {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  leadMemberId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberLinks?: TeamMemberLink[];
  leadMember?: CompanyMember | null;
  projects?: Project[];
  tasks?: Task[];
}

export interface TeamMessage {
  id: string;
  teamId: string;
  userId: string;
  parentMessageId?: string | null;
  content: string;
  mentionedUserIds?: string[];
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, "id" | "firstName" | "lastName" | "email" | "profilePictureUrl">;
}

export interface TeamWorkspaceResponse {
  team: Team;
  messages: TeamMessage[];
  activeAssignments: Task[];
  workload: Array<{ user: User | null; activeSubtasks: number; overdue: number; nearestDueDate: string | null }>;
  activity: TaskActivity[];
}

export interface WorkspaceItem {
  companyId: string;
  role: WorkspaceRole;
  status: string;
  isVerified: boolean;
  company: {
    id: string;
    name: string;
    companyCode: string;
    industry?: string | null;
    logoUrl?: string | null;
  };
}

export type TrashItemType = "workspace" | "project" | "task" | "folder" | "file";

export interface TrashItem {
  id: string;
  type: TrashItemType;
  name: string;
  workspaceId?: string | null;
  workspaceName?: string | null;
  parentType?: string | null;
  parentId?: string | null;
  parentName?: string | null;
  deletedAt: string;
  expiresAt: string;
  deletedBy?: { id?: string; firstName?: string; lastName?: string } | string | null;
  canRestore?: boolean;
  canPermanentlyDelete?: boolean;
}

export type PermissionMode = "restricted" | "free";

export type CommercialStatusKey = "free" | "trial" | "active" | "payment_pending" | "overdue" | "grace_period" | "suspended" | "cancelled" | "custom";
/** Owner/admin view of the organization's own subscription. Amounts are integer cents. No internal notes or payment-review data. */
export interface WorkspaceCommercialOverview {
  plan: { code: string; name: string };
  commercialStatus: CommercialStatusKey;
  currency: string;
  usage: { activeSeats: number; includedSeats: number; additionalSeats: number; unitPriceCents: number; fixedMonthlyCents: number; estimatedMonthlyCents: number; contractedMaxSeats: number | null };
  customTerms: boolean;
  billingPeriod: { start: string; end: string };
  outstandingCents: number;
  paymentStatus: "none" | "paid_up" | "outstanding" | "overdue";
  estimateNote: string;
  billingRecords: Array<{ id: string; periodStart: string; periodEnd: string; currency: string; totalCents: number; status: "issued" | "partially_paid" | "paid"; dueDate: string | null; outstandingCents: number; isOverdue: boolean; activeSeats: number; additionalSeats: number }>;
  contactEmail: string | null;
}
export interface WorkspaceSeatImpact {
  currency: string;
  currentActiveSeats: number;
  includedSeats: number;
  currentEstimatedMonthlyCents: number;
  activeSeatsAfterAcceptance: number;
  additionalSeatsAfterAcceptance: number;
  estimatedMonthlyCentsAfterAcceptance: number;
  note: string;
}

export type GovernancePolicy = "owners_admins" | "existing_permissions";
export interface WorkspaceGovernanceSettings {
  memberInvitePolicy: GovernancePolicy;
  projectCreationPolicy: GovernancePolicy;
  teamManagementPolicy: GovernancePolicy;
  clientInvitePolicy: GovernancePolicy;
  integrationManagementPolicy: GovernancePolicy;
  googleDriveEnabled: boolean;
  dropboxEnabled: boolean;
  automationsEnabled: boolean;
  timeTrackingEnabled: boolean;
}
export type WorkspaceGovernanceResponse = {
  status: string;
  data: {
    settings: WorkspaceGovernanceSettings;
    teamLeadMemberManagement: { enabled: boolean; available: boolean; message: string };
  };
};
export type WorkspaceGovernanceCapabilities = {
  status: string;
  data: Pick<WorkspaceGovernanceSettings, "googleDriveEnabled" | "dropboxEnabled" | "automationsEnabled" | "timeTrackingEnabled"> & { memberInvitesRestricted: boolean; projectCreationRestricted: boolean; teamManagementRestricted: boolean; clientInvitesRestricted: boolean; integrationManagementRestricted: boolean };
};

export interface WorkspaceSettings {
  invitePermissionMode: PermissionMode;
  assistancePermissionMode: PermissionMode;
  roleOperationPermissions?: RoleOperationPermissions;
  effectiveOperationPermissions?: RolePermissionSet;
  userPermissionOverrides?: Partial<RolePermissionSet>;
  configurableRoles?: Array<"admin" | "manager" | "member">;
}


export interface EffectiveWorkspacePermissionsResponse {
  status: string;
  data: {
    companyId: string;
    userId: string;
    role: WorkspaceRole;
    rolePermissions: RolePermissionSet;
    individualOverrides: Partial<RolePermissionSet>;
    permissions: RolePermissionSet;
  };
}

export type WorkspaceRolePermissionKey =
  | "create_tasks"
  | "view_all_tasks"
  | "create_projects"
  | "view_all_projects"
  | "create_project_tasks"
  | "upload_workspace_files"
  | "view_workspace_members"
  | "assign_workspace_members";

export type RolePermissionSet = Record<WorkspaceRolePermissionKey, boolean>;

export type RoleOperationPermissions = {
  admin: RolePermissionSet;
  manager: RolePermissionSet;
  member: RolePermissionSet;
};

export type GetWorkspaceSettingsResponse = {
  status: "success" | string;
  data: { settings: WorkspaceSettings } | WorkspaceSettings;
};

export type UpdateWorkspaceMemberRolePayload = {
  role: "member" | "manager" | "admin" | "executive" | "team_member";
};

export interface AuthResponse {
  status: string;
  message: string;
  token: string;
  data: {
    user: User;
    workspaces?: WorkspaceItem[];
  };
}

export interface ErrorResponse {
  status: string;
  message: string;
}

/* ============================
   CLIENT VIEW / RESOURCE ACCESS
============================ */

export type ClientViewResourceType = "project" | "task";

export interface ClientViewShareLink {
  id: string;
  resourceType: ClientViewResourceType;
  resourceId: string;
  visibilityLevel: "summary" | "detailed";
  isActive: boolean;
  expiresAt?: string | null;
  viewCount: number;
  lastViewedAt?: string | null;
  publicUrl: string;
  createdAt: string;
}

export interface ClientViewProjectPayload {
  resourceType: "project";
  token: string;
  resourceId: string;
  visibilityLevel: "summary" | "detailed";
  canRequestAccess: boolean;
  project: {
    name: string;
    description?: string | null;
    status?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    logoUrl?: string | null;
    progress: number;
    stats: {
      totalTasks: number;
      completed: number;
      inProgress: number;
      pending: number;
      overdue: number;
    };
    tasks: Array<{
      id?: string;
      title: string;
      description?: string | null;
      status?: string | null;
      priority?: string | null;
      deadline?: string | null;
      assignee?: string | null;
    }>;
  };
}

export interface ClientViewTaskPayload {
  resourceType: "task";
  token: string;
  resourceId: string;
  visibilityLevel: "summary" | "detailed";
  canRequestAccess: boolean;
  task: {
    id?: string;
    title: string;
    description?: string | null;
    status?: string | null;
    priority?: string | null;
    deadline?: string | null;
    category?: string | null;
    progress: number;
    assignee?: string | null;
    subtasks: Array<{
      id?: string;
      title: string;
      status?: string | null;
      priority?: string | null;
      deadline?: string | null;
    }>;
  };
}

export type ClientAccessLevel = "viewer" | "commenter" | "collaborator";

export interface ClientAccessCapabilities {
  canView: boolean;
  canComment: boolean;
  canUpdateTaskStatus: boolean;
}

export interface SharedTaskComment {
  id: string;
  content: string;
  parentCommentId?: string | null;
  createdAt: string;
  author: string;
  isMine: boolean;
}

export type ClientViewPayload =
  | ClientViewProjectPayload
  | ClientViewTaskPayload;

export interface ResourceAccessRequest {
  id: string;
  companyId: string;
  resourceType: ClientViewResourceType;
  resourceId: string;
  requesterUserId: string;
  accessLevel: ClientAccessLevel;
  status: "pending" | "approved" | "denied" | "revoked";
  reason?: string | null;
  resourceTitle?: string;
  decidedAt?: string | null;
  decidedBy?: { firstName: string; lastName: string; email?: string };
  requester?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profilePictureUrl?: string | null;
  };
  createdAt: string;
}

/* ============================
   AUTH PAYLOADS
============================ */

export interface SignupExecutiveData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company: string;
  companySize: string;
  industry: string;
  /** Cloudflare Turnstile token; verified server-side. */
  turnstileToken?: string;
}

export interface SignupAssistantData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyCode: string;
  specialization: string;
  experience: number;
  hourlyRate: number;
  bio: string;
  skills: string[];
  turnstileToken?: string;
}

export interface LoginData {
  email: string;
  password: string;
  accountType?: "workspace" | "admin";
}

/* ============================
   TASKS & ATTACHMENTS
============================ */

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileId?: string;
  mimeType?: string;
  externalUrl?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  source?: "device" | "google-drive" | string;
}

export interface TaskSubtask {
  id: string;
  taskId: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "delayed" | "cancelled" | string;
  sortOrder?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  description?: string | null;
  priority?: TaskPriority | null;
  deadline?: string | null;
  assigneeId?: string | null;
  assignee?: User | null;
  assignees?: User[] | null;
  teamId?: string | null;
  parentTaskId?: string | null;
}

export interface TaskExecutionSummary {
  hasExecution: boolean;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  progressPercent: number | null;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actionType: string;
  oldValue?: string | number | boolean | null | Record<string, any>;
  newValue?: string | number | boolean | null | Record<string, any>;
  metadata?: Record<string, any>;
  createdBy?: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    profilePictureUrl?: string | null;
  } | null;
}

export interface TaskWatcher {
  id?: string;
  taskId?: string;
  userId: string;
  createdAt?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    profilePictureUrl?: string | null;
  };
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "in_review" | "completed" | "delayed" | "cancelled";

/**
 * Per-user access info for a task, returned by GET /tasks/:id (and optionally
 * embedded on list items). The task-detail endpoint is the final authority —
 * list-level inference is only a hint for badges/disabled controls.
 */
export interface TaskAccess {
  canView: boolean;
  canEdit: boolean;
  readOnly: boolean;
  canCollaborate?: boolean;
}

export interface Task {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  priority?: TaskPriority | null;
  status?: TaskStatus | null;
  deadline?: string | null;
  category?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  tier?: string | null;

  assignedAssistantId?: string | null;
  executiveId?: string | null;
  assigneeId?: string | null;
  teamId?: string | null;
  team?: (Pick<Team, "id" | "name" | "leadMemberId"> & { leadMember?: CompanyMember | null; memberLinks?: TeamMemberLink[] }) | null;
  parentTaskId?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;

  company?: {
    id?: string | null;
    name?: string | null;
    companyCode?: string | null;
    industry?: string | null;
  } | null;

  creator?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;

  assignee?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    company?: string | null;
  } | null;

  attachments?: TaskAttachment[] | null;
  parentTask?: Task | null;
  subtasks?: TaskSubtask[] | null;
  subtaskCount?: number | null;
  activities?: TaskActivity[] | null;
  watcherCount?: number | null;
  isWatching?: boolean | null;
  recentWatchers?: TaskWatcher[] | null;
  /** Some APIs return full watcher list instead of only counts */
  watchers?: TaskWatcher[] | null;

  // Some backends return this
  assignees?: any[] | null;

  // Google calendar sync info (read-only)
  calendarSynced?: boolean;
  googleCalendarEventId?: string | null;
  googleCalendarId?: string | null;

  /** Optional per-user access hint (list items). GET /tasks/:id is authoritative. */
  access?: TaskAccess | null;
  execution?: TaskExecutionSummary | null;

  // Derived dependency summary on list responses (never a persisted status)
  isBlocked?: boolean | null;
  unresolvedDependencyCount?: number | null;
  dependsOnCount?: number | null;
  blockingCount?: number | null;
  hasCancelledDependency?: boolean | null;

  // Derived from the recurrence ledger on list responses (generated occurrences are ordinary tasks)
  isRecurring?: boolean | null;
  recurrenceId?: string | null;
  recurrenceSequence?: number | null;
  recurrenceStatus?: TaskRecurrenceStatus | null;
  recurrenceSummary?: string | null;
}

export type TaskRecurrenceStatus = "active" | "paused" | "stopped" | "completed";
export type TaskRecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface TaskRecurrenceDetails {
  id: string;
  status: TaskRecurrenceStatus;
  pausedReason: string | null;
  timezone: string;
  frequency: TaskRecurrenceFrequency;
  interval: number;
  /** 0 = Sunday ... 6 = Saturday */
  byWeekday: number[] | null;
  /** 1-31, or -1 for the last day */
  byMonthDay: number | null;
  /** "HH:mm" wall-clock time in `timezone` */
  localTime: string;
  startsAt: string;
  endsAt: string | null;
  maxOccurrences: number | null;
  occurrencesGenerated: number;
  nextOccurrenceAt: string | null;
  lastGeneratedAt: string | null;
  lastRunNote: string | null;
  summary: string;
  upcoming: string[];
  /** Present for managers only */
  template?: Record<string, any>;
}

export interface TaskRecurrenceResponse {
  recurrence: TaskRecurrenceDetails | null;
  occurrence: { sequence: number; occurrenceAt: string; status: string; isSource: boolean } | null;
  canManageRecurrence: boolean;
}

/** Structured schedule sent to the recurrence API (the browser's IANA timezone is required on create and preview). */
export interface TaskRecurrenceInput {
  timezone?: string;
  frequency?: TaskRecurrenceFrequency;
  interval?: number;
  byWeekday?: number[] | null;
  byMonthDay?: number | null;
  localTime?: string;
  startsAt?: string;
  endsAt?: string | null;
  maxOccurrences?: number | null;
}

export interface TaskRecurrencePreview {
  summary: string;
  occurrences: string[];
}

/* ---- Templates (Phase 4C) ---- */
export type TemplateType = "task" | "project";
export type TemplateStatus = "active" | "archived";
export type TemplateAssigneeMode = "none" | "instantiator" | "member" | "teamLead" | "projectLead";
export interface TemplateAssigneeConfig { mode: TemplateAssigneeMode; userId?: string }
export interface TemplateTeamConfig { mode: "none" | "inherit" | "team"; teamId?: string }
export interface TemplateRecurrenceConfig {
  frequency: TaskRecurrenceFrequency; interval: number; byWeekday: number[] | null; byMonthDay: number | null; maxOccurrences: number | null;
}
export interface TemplateTaskFields {
  title: string; description: string | null; priority: "low" | "medium" | "high" | "urgent"; category: string | null; estimatedHours: number | null;
  /** Calendar days from the chosen start date; null = no due date */
  dueOffsetDays: number | null;
  /** Explicit wall-clock time; null = the user picks a default time when using the template (never an implicit time) */
  localTime: string | null;
  assignee: TemplateAssigneeConfig;
}
export interface TemplateSubtaskNode extends TemplateTaskFields { key: string; customFields?: Record<string, unknown> }
export interface TaskTemplateBody {
  schemaVersion: 1 | 2;
  task: TemplateTaskFields & { team: TemplateTeamConfig; recurrence?: TemplateRecurrenceConfig | null; subtasks: TemplateSubtaskNode[]; customFields?: Record<string, unknown> };
}
export interface ProjectTemplateTaskNode extends TemplateTaskFields {
  key: string; parentKey: string | null; position: number; team: TemplateTeamConfig; dependsOn: string[];
  customFields?: Record<string, unknown>;
}
export interface ProjectTemplateBody {
  schemaVersion: 1 | 2;
  project: { name: string; description: string | null; color: string | null; visibility: "private" | "workspace"; team: TemplateTeamConfig; lead: TemplateAssigneeConfig; members: { userId: string }[]; customFields?: Record<string, unknown> };
  tasks: ProjectTemplateTaskNode[];
}
export interface TemplateSummary {
  id: string; type: TemplateType; scope: "workspace"; name: string; description: string | null; category: string | null; status: TemplateStatus;
  currentVersion: number; createdAt: string; updatedAt: string; archivedAt: string | null; canManage: boolean;
  summary: { taskCount: number; subtaskCount: number; dependencyCount: number; hasRecurrence: boolean } | null;
}
export interface TemplateDetail extends Omit<TemplateSummary, "summary"> {
  body: TaskTemplateBody | ProjectTemplateBody;
  summary: { taskCount: number; subtaskCount: number; dependencyCount: number; hasRecurrence: boolean };
  versions: { version: number; schemaVersion: number; createdBy: string | null; createdAt: string }[] | null;
}
export interface TemplateIssue { code: string; message: string; key?: string; userId?: string; fieldId?: string; fieldName?: string }
export interface TemplatePlanNode {
  key: string; parentKey: string | null; position: number; title: string; description: string | null; priority: string; category: string | null;
  estimatedHours: number | null; deadline: string | null; teamId: string | null; assignees: { userId: string; name: string }[]; dependsOn: string[]; customFields?: Record<string, unknown>;
}
export interface TemplatePreview {
  ok: boolean; errors: TemplateIssue[]; warnings: TemplateIssue[]; requiresDefaultDueTime: boolean;
  plan: null | {
    type: TemplateType; template: { id: string; name: string; version: number }; timezone: string; startDate: string | null;
    project: null | { name: string; description: string | null; color: string | null; visibility: "private" | "workspace"; teamId: string | null; leadUserId: string | null };
    summary: { taskCount: number; subtaskCount: number; dependencyCount: number; assignees: { userId: string; name: string; taskCount: number }[] };
    recurrence: { summary: string } | null; nodes: TemplatePlanNode[]; projectMembers: { userId: string; name: string }[];
  };
}
/** What the "use template" request sends. `idempotencyKey` is generated once per use-template flow and reused for retries. */
export interface TemplateUseInput {
  idempotencyKey: string; timezone: string; startDate?: string; defaultDueTime?: string; dueAt?: string; title?: string; acceptWarnings?: boolean;
  customFields?: { project?: Record<string, unknown>; tasks?: Record<string, Record<string, unknown>> };
  overrides?: { assignees?: Record<string, string | null> };
  name?: string; description?: string | null; visibility?: "private" | "workspace"; teamId?: string | null; leadUserId?: string | null; memberUserIds?: string[];
}
export interface TemplateUseResult {
  replayed: boolean; instantiationId: string; templateId: string; templateVersion: number; projectId: string | null; taskIds: Record<string, string>; summary: Record<string, any>;
}

export type CustomFieldEntityType = "task" | "project";
export type CustomFieldType = "text" | "long_text" | "number" | "boolean" | "date" | "datetime" | "single_select" | "multi_select" | "user" | "url";
export interface CustomFieldOption { id: string; fieldId: string; companyId: string; label: string; color: string | null; position: number; isActive: boolean }
export interface CustomFieldDefinition {
  id: string; companyId: string; entityType: CustomFieldEntityType; fieldType: CustomFieldType; name: string; description: string | null;
  isRequired: boolean; position: number; defaultValue: unknown; config: Record<string, any>; showOnBoard: boolean; status: "active" | "archived";
  archivedAt: string | null; options?: CustomFieldOption[];
}
export interface CustomFieldValue { id: string; companyId: string; fieldId: string; taskId?: string; projectId?: string; value: unknown; updatedBy: string | null; updatedAt: string; field: CustomFieldDefinition }

/** Advisory notice returned with a successful status change. */
export interface TaskMutationWarning {
  code: "BLOCKED_BY_INCOMPLETE_DEPENDENCIES" | string;
  count?: number;
}

export interface TaskDependencyAssignee {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}

/** One side of a dependency link. `restricted` items carry status only (no title/details). */
export interface TaskDependencyItem {
  linkId: string;
  createdAt?: string;
  status: TaskStatus | string;
  resolved: boolean;
  cancelled: boolean;
  restricted: boolean;
  /** Present on restricted predecessors only, so an authorised manager can still remove a stale link. */
  taskId?: string;
  task?: {
    id: string;
    title: string;
    status: TaskStatus | string;
    deadline?: string | null;
    projectId?: string | null;
    teamId?: string | null;
    parentTaskId?: string | null;
    assignees: TaskDependencyAssignee[];
  };
}

export interface TaskDependencyGraph {
  dependsOn: TaskDependencyItem[];
  blocking: TaskDependencyItem[];
  isBlocked: boolean;
  unresolvedDependencyCount: number;
  dependsOnCount: number;
  blockingCount: number;
  hasCancelledDependency: boolean;
  canManageDependencies: boolean;
}

export interface TaskDependencyCandidate {
  id: string;
  title: string;
  status: TaskStatus | string;
  deadline?: string | null;
  projectId?: string | null;
  parentTaskId?: string | null;
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: TaskPriority;
  deadline?: string;
  category?: string;
  estimatedHours?: number;
  assigneeId?: string;
  teamId?: string | null;
  customFields?: Record<string, unknown>;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  deadline?: string | null;
  category?: string;
  estimatedHours?: number;
  actualHours?: number;
  assigneeId?: string | null;
  teamId?: string | null;
  customFields?: Record<string, unknown>;
  googleDriveAttachments?: Array<{
    fileId: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
    thumbnailLink?: string;
    source: "google-drive";
  }>;
  attachments?: Array<{
    fileId?: string;
    name?: string;
    fileName?: string;
    mimeType?: string;
    fileType?: string;
    webViewLink?: string;
    thumbnailLink?: string;
    source?: "device" | "google-drive" | string;
  }>;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  category?: string;
}

export interface AllTasksFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  companyId?: string;
  teamId?: string;
  projectId?: string;
  customFieldColumns?: string[];
  customFieldFilters?: { fieldId: string; op: string; value?: unknown }[];
  scope?: "workspace" | "all_workspaces" | "assigned_all" | "assigned_workspace";
}

export interface AllTasksResponse {
  status: string;
  results: number;
  data: {
    tasks: Task[];
  };
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/* ============================
   DASHBOARDS
============================ */

export interface ExecutiveDashboard {
  overview: {
    team: {
      totalAssistants: number;
      availableAssistants: number;
      pendingVerifications: number;
      totalExecutives: number;
    };
    tasks: {
      totalTasks: number;
      pendingTasks: number;
      inProgressTasks: number;
      completedTasks: number;
      overdueTasks: number;
      urgentTasks: number;
      completionRate: number;
    };
    timeframe: string;
  };
  analytics: {
    tasksByCategory: Record<string, number>;
    assistantPerformance: Array<{
      assistantId: string;
      assistantName: string;
      completedTasks: number;
      averageHours: number;
      totalHours: number;
    }>;
  };
  recentActivity: {
    tasks: Task[];
  };
}

export interface AssistantDashboard {
  overview: {
    totalAssigned: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
    completionRate: number;
    totalHours: number;
    averageHours: number;
    onTimeCompletionRate: number;
  };
  analytics: {
    tasksByPriority: Record<string, number>;
    timeframe: string;
  };
  activity: {
    recentCompleted: Array<{
      id: string;
      title: string;
      completedAt: string;
      executive: {
        firstName: string;
        lastName: string;
      };
      actualHours: number;
    }>;
    upcomingDeadlines: Array<{
      id: string;
      title: string;
      deadline: string;
      priority: string;
      executive: {
        firstName: string;
        lastName: string;
      };
    }>;
  };
  currentTasks: {
    inProgress: number;
    pending: number;
  };
}

/* ============================
   TEAM DIRECTORY CARD TYPE (UI)
   - used by your TeamMembers page cards
============================ */

export interface TeamMember {
  id: string; // user id
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  role: string; // global user role (optional to use)
  workspaceRole: string; // workspace role (prefer this)
  subscriptionTier: string;
  isVerified: boolean;
  isActive: boolean;
  specialization: string;
  experience: number;
  hourlyRate: number;
  bio: string;
  skills: string[];
  isAvailable: boolean;
  rating: number;
  invitationStatus?: "pending" | "approved" | "rejected" | "invited" | "removed";
  invitedByExecutive?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt?: string;
}

export interface AssistantFilters {
  specialization?: string;
  minRating?: number;
  maxHourlyRate?: number;
}

/* ============================
   RESPONSES (TEAM)
============================ */

export interface TeamAssistantsResponse {
  status: string;
  results: number;
  data: {
    team_members: any[];
    members?: CompanyMember[];
  };
}

export function normalizeCompanyAssistantsResponse(response: TeamAssistantsResponse): TeamAssistantsResponse {
  if (!Array.isArray(response?.data?.team_members)) {
    throw new Error("Team member data was unavailable. Please refresh and try again.");
  }
  return response;
}

export interface PendingVerificationsResponse {
  status: string;
  results: number;
  data: {
    pendingAssistants: any[];
    pendingMembers: CompanyMember[];
  };
}

/* ============================
   COMMENTS
============================ */

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  isSystemMessage: boolean;
  systemEventType?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  parentCommentId?: string | null;
  attachments?: TaskAttachment[];
  /** Dropbox files attached to this comment. Absent for clients / external users (the server never sends it to them). */
  connectedStorageAttachments?: ConnectedStorageAttachment[];
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profilePictureUrl?: string;
  };
}

export interface ProjectMemberSummary {
  id: string;
  userId: string;
  role: "owner" | "admin" | "manager" | "member" | "viewer";
  status: string;
  user?: User;
}

// export interface Project {
//   id: string;
//   companyId: string;
//   name: string;
//   description?: string | null;
//   status: "active" | "archived";
//   visibility: "private" | "workspace";
//   createdBy: string;
//   leadId?: string | null;
//   color?: string | null;
//   dueDate?: string | null;
//   createdAt: string;
//   updatedAt: string;
//   members?: ProjectMemberSummary[];
//   tasks?: Task[];
// }

export interface Folder {
  id: string;
  scope: "workspace" | "personal";
  companyId?: string | null;
  ownerUserId?: string | null;
  name: string;
  description?: string | null;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderFile {
  id: string;
  folderId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInvite {
  id: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "pending" | "accepted" | "pending_workspace" | "rejected" | "expired" | "revoked";
  expiresAt: string | null;
  createdAt: string;
}

/* ============================
   ASSISTANCE REQUEST TYPES
============================ */

/**
 * AssistanceRequestAttachment — Phase 2 contract.
 *
 * The backend no longer exposes Cloudinary `url` or `publicId` in assistance
 * attachment responses.  Files are downloaded via the authenticated endpoint:
 *   GET /api/v1/assistance/:requestId/attachments/:index/download
 *
 * `url` and `publicId` are intentionally absent from this interface.
 * Do NOT add them back; the backend sanitizes them server-side.
 */
export interface AssistanceRequestAttachment {
  fileName: string;
  fileType: string;
  fileSize: number;
  /** ISO timestamp of upload — metadata only, not a download URL. */
  uploadedAt?: string;
}

export type AssistanceRequestPriority = "low" | "medium" | "high" | "urgent";
export type AssistanceRequestStatus =
  | "pending"
  | "under_review"
  | "quoted"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface AssistanceRequest {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  description: string;
  category: string;
  priority: AssistanceRequestPriority;
  deadline?: string | null;
  estimatedHours?: number | null;
  attachments: AssistanceRequestAttachment[];
  status: AssistanceRequestStatus;
  adminNotes?: string | null;
  quotedPrice?: number | string | null;
  quotedHours?: number | null;
  adminAssignedTo?: string | null;
  taskId?: string | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  requester?: User;
  company?: Company;
  assignedAdmin?: User;
  convertedTask?: Task;
}

export interface AssistanceRequestStats {
  total: number;
  pending: number;
  under_review: number;
  quoted: number;
  accepted: number;
  in_progress: number;
  completed: number;
  rejected: number;
  cancelled: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  topCompanies?: Array<{
    companyId: string;
    total: number;
    completed: number;
    totalQuoted?: number;
    company?: {
      id: string;
      name: string;
      companyCode: string;
    };
  }>;
  monthlyTrend?: Array<{
    month: string;
    count: number;
  }>;
}

export interface CreateAssistanceRequestData {
  title: string;
  description: string;
  category: string;
  priority?: AssistanceRequestPriority;
  deadline?: string;
  estimatedHours?: number;
  attachments?: File[];
}

export interface UpdateAssistanceRequestData {
  status?: AssistanceRequestStatus;
  adminNotes?: string;
  quotedPrice?: number;
  quotedHours?: number;
  adminAssignedTo?: string;
}

export interface ConvertToTaskData {
  assigneeId?: string;
  estimatedHours?: number;
  priority?: AssistanceRequestPriority;
  deadline?: string;
}

export interface CostEstimation {
  baseRate: number;
  estimatedHours: number;
  estimatedCost: number;
  minCharge: number;
  currency: string;
}

/* ============================
   PROJECTS
============================ */

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

export interface ChecklistItem {
  id: string;
  checklistId: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectChecklist {
  id: string;
  projectId: string;
  title: string;
  items?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  settings?: Record<string, any> | null;
  companyId: string;
  teamId?: string | null;
  team?: Pick<Team, "id" | "name" | "leadMemberId"> | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
  checklists?: ProjectChecklist[];
  _count?: { tasks?: number; checklists?: number };
  customFieldColumns?: Record<string, unknown>;
}

export interface WorkspaceInsights {
  summary: {
    totalProjects: number;
    projectsByStatus: Record<string, number>;
    totalTasks: number;
    tasksByStatus: Record<string, number>;
    completedTasks: number;
    openTasks: number;
    overdueTasks: number;
    unassignedTasks: number;
    projectsWithTeam: number;
    projectsWithoutTeam: number;
    tasksWithTeam: number;
    tasksWithoutTeam: number;
  };
  teams: Array<{
    id: string;
    name: string;
    memberCount: number;
    projectCount: number;
    taskCount: number;
    openTasks: number;
    overdueTasks: number;
    tasksByStatus: Record<string, number>;
  }>;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    team: { id: string; name: string } | null;
    taskCount: number;
    completedTasks: number;
    openTasks: number;
    overdueTasks: number;
    completionRate: number;
    riskIndicators: string[];
  }>;
  workload: {
    unassignedTasks: number;
    members: Array<{
      userId: string;
      name: string;
      assignedTasks: number;
      openTasks: number;
      completedTasks: number;
    }>;
  };
  filters: { teamId: string | null; projectId: string | null; status: string | null; priority: string | null };
  generatedAt: string;
}

export interface WorkspaceInsightsHistory {
  period: { from: string; to: string; timezone: string; activityDerived: boolean };
  summary: { totalActivity: number; taskCreated: number; statusChanges: number; completedStatusChanges: number; assignmentActivity: number; projectActivity: number };
  trends: Array<{ date: string; taskCreated: number; statusChanges: number; completedStatusChanges: number; assignmentActivity: number; projectActivity: number; totalActivity: number }>;
  byTeam: Array<{ id: string | null; name: string; totalActivity: number; taskCreated: number; statusChanges: number; completedStatusChanges: number; assignmentActivity: number }>;
  byProject: Array<{ id: string | null; name: string; totalActivity: number; taskCreated: number; statusChanges: number; completedStatusChanges: number; assignmentActivity: number }>;
  noTeamActivity: number;
}

export interface OrganizationAuditEvent {
  id: string;
  companyId: string;
  actor: { id: string; name: string; avatar: string | null } | null;
  actorType: "user" | "system" | "automation" | "integration";
  action: string;
  entityType: string;
  entityId: string | null;
  entityNameSnapshot: string | null;
  category: string;
  summary: string;
  changes: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }> | null;
  metadata: Record<string, string | number | boolean> | null;
  source: string;
  projectId: string | null;
  taskId: string | null;
  teamId: string | null;
  targetUserId: string | null;
  occurredAt: string;
}

export interface WorkspaceDeliveryInsights {
  source: "lifecycle";
  period: { from: string; to: string; timezone: string; lifecycleDerived: boolean };
  summary: {
    totalTasksInScope: number;
    completedTasks: number;
    reopenedTasks: number;
    completionRate: number;
    throughputCount: number;
    averageCycleTimeDays: number | null;
    medianCycleTimeDays: number | null;
    overdueCompletedCount: number;
    reopenedAfterCompletionCount: number;
  };
  trends: Array<{ date: string; completed: number; reopened: number; throughput: number }>;
  byTeam: Array<{ id: string | null; name: string; completedTasks: number; reopenedTasks: number; throughputCount: number }>;
  byProject: Array<{ id: string | null; name: string; completedTasks: number; reopenedTasks: number; throughputCount: number }>;
  byMember: Array<{ id: string | null; name: string; completedTasks: number; reopenedTasks: number; throughputCount: number }>;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  settings?: Record<string, any>;
  teamId?: string | null;
}

/* ============================
   NOTIFICATIONS
============================ */

export type NotificationType =
  | "task_created"
  | "task_updated"
  | "task_progress"
  | "invite_sent"
  | "invite_accepted"
  | "welcome"
  | string;

export interface Notification {
  id: string;
  userId: string;
  companyId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsListResponse {
  status: string;
  results?: number;
  data: {
    notifications: Notification[];
  };
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export type NotificationPreferenceCategory = "assignments" | "mentions_replies" | "status_review" | "due_work" | "project_team" | "client_access" | "workspace_commercial";
export interface NotificationPreference { category: NotificationPreferenceCategory; inAppEnabled: boolean; emailEnabled: boolean; whatsAppEnabled: boolean; }
export interface NotificationPreferencesResponse { status: string; data: { preferences: NotificationPreference[]; whatsApp: { linked: boolean; globallyEnabled: boolean } }; }
export interface NotificationDeliveryMetrics { freshQueued: number; staleQueued: number; retrying: number; failed: number; sentRecently: number; }
export interface NotificationDeliverySummary { selected: number; sent: number; failed: number; retrying: number; expired: number; }




/* ============================
   HARMONY
============================ */

export type HarmonyDimensionKey =
  | "pace_orientation"
  | "structure_preference"
  | "interaction_mode"
  | "feedback_orientation";

export interface HarmonyAssessmentOption {
  id: string;
  text: string;
}

export interface HarmonyAssessmentQuestion {
  id: string;
  dimensionKey: HarmonyDimensionKey;
  title: string;
  text: string;
  required: boolean;
  options: HarmonyAssessmentOption[];
}

export interface HarmonyAssessmentDimension {
  key: HarmonyDimensionKey;
  label: string;
  description: string;
  questionIds: string[];
}

export interface HarmonyAssessmentDefinition {
  key: string;
  version: string;
  title: string;
  description: string;
  instructions: string;
  dimensions: HarmonyAssessmentDimension[];
  questions: HarmonyAssessmentQuestion[];
}

export interface HarmonyAssessmentAnswer {
  questionId: string;
  optionId: string;
}

export interface HarmonyDimensionSummary {
  score: number;
  band: string;
  displayPercentage: number;
}

export interface HarmonyIndividualReport {
  archetype: string;
  summary: string;
  dimensionSummary: Record<HarmonyDimensionKey, HarmonyDimensionSummary>;
  strengths: string[] | any[];
  challenges: string[] | any[];
  risks?: string[] | any[];
  collaborationStyle: string[] | any[];
  collaborationTips?: string[] | any[];
  idealTeamRoles: string[] | any[];
  suggestedRoles?: string[] | any[];
  bestWorkConditions?: string[] | any[];
  nextActions?: string[] | any[];
  do: string[] | any[];
  dont: string[] | any[];
  archetypeMeaning?: any;
  generatedAt: string;
}

export interface HarmonyProfile {
  id: string;
  userId: string;
  latestSubmissionId?: string | null;
  assessmentKey: string;
  assessmentVersion: string;
  dimensionScores: Record<HarmonyDimensionKey, number>;
  dimensionBands: Record<HarmonyDimensionKey, string>;
  archetype: string;
  report: HarmonyIndividualReport;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    avatar?: string | null;
    profilePictureUrl?: string | null;
  };
}

export interface HarmonyPairDimensionComparison {
  dimensionKey: HarmonyDimensionKey;
  scoreA: number;
  scoreB: number;
  difference: number;
  similarity: number;
}

export interface HarmonyPairCompatibility {
  userA?: any;
  userB?: any;
  archetypeA: string;
  archetypeB: string;
  compatibilityScore: number;
  interpretation: string;
  dimensionComparisons: HarmonyPairDimensionComparison[];
  dynamicType?: "Complementary" | "Potential Friction" | "Neutral" | string;
  dynamicNote?: string;
}

export interface HarmonyScoreboardData {
  teamSize: number;
  completedCount: number;
  missingCount: number;
  completedMembers: Array<{
    user: any;
    archetype: string;
    dimensionBands: Record<HarmonyDimensionKey, string>;
    completedAt: string;
  }>;
  pendingMembers: any[];
  cohesionScore: number | null;
  interpretation: string;
  archetypeDistribution: Array<{
    archetype: string;
    count: number;
  }>;
  dimensionAverages: Partial<Record<HarmonyDimensionKey, number>>;
  dimensionSpread: Partial<Record<HarmonyDimensionKey, number>>;
  strongestAlignmentAreas: Array<{
    dimensionKey: HarmonyDimensionKey;
    spread: number;
    note: string;
  }>;
  likelyFrictionAreas: Array<{
    dimensionKey: HarmonyDimensionKey;
    spread: number;
    note: string;
  }>;
  recommendedTeamNorms: string[];
  pairwiseCompatibility: HarmonyPairCompatibility[];
  complementaryPairings: HarmonyPairCompatibility[];
  frictionPronePairings: HarmonyPairCompatibility[];
}

/* ============================
   HARMONY AI REPORTS
============================ */

export interface HarmonyAiReportTeamMakeupItem {
  archetype: string;
  count: number;
  whatItMeans: string;
}

export interface HarmonyAiReportBestPairing {
  pairing: string;
  why: string;
  idealWork: string;
}

export interface HarmonyAiReportWatchOutPairing {
  pairing: string;
  why: string;
  mitigation: string;
}

export interface HarmonyAiReport {
  teamSnapshot?: string;
  teamMakeup?: HarmonyAiReportTeamMakeupItem[] | any[];
  strengths?: string[] | any[];
  risks?: string[] | any[];
  bestPairings?: HarmonyAiReportBestPairing[] | any[];
  watchOutPairings?: HarmonyAiReportWatchOutPairing[] | any[];
  operatingNorms?: string[] | any[];
  actionsNext30Days?: string[] | any[];
  archetypePrimer?: any;
  generatedAt?: string;
}

export interface HarmonyAiReportResponse {
  status: string;
  data: {
    report: HarmonyAiReport | null;
    cached: boolean;
  };
}

/* ============================
   ONBOARDING
============================ */

export interface OnboardingStatus {
  needsGender: boolean;
  needsAge?: boolean;
  gender?: string;
  age?: number;
}

export interface UpdateOnboardingPayload {
  gender: string;
  age?: number;
}

export interface OnboardingStatusResponse {
  status: string;
  data: OnboardingStatus;
}

export interface UpdateOnboardingResponse {
  status: string;
  data: { user: any };
}



/* ============================
   ACCESS REQUESTS
============================ */

export type WorkspaceAccessPermissionKey =
  | "create_tasks"
  | "view_all_tasks"
  | "create_projects"
  | "view_all_projects"
  | "create_project_tasks"
  | "upload_workspace_files"
  | "view_workspace_members"
  | "assign_workspace_members";

export interface WorkspaceAccessRequest {
  id: string;
  companyId: string;
  requesterUserId: string;
  permissionKey: WorkspaceAccessPermissionKey;
  status: "pending" | "approved" | "denied" | string;
  reason?: string | null;
  decidedByUserId?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  decidedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface WorkspaceJoinRequest {
  id: string;
  status: "pending" | "approved" | "denied" | string;
  createdAt: string;
  requester?: { id: string; email: string; firstName: string; lastName: string };
}


/* ============================
   PROFESSIONAL PROFILE TYPES
============================ */

export type ProfileVisibility = "private" | "workspace" | "public";

export interface ProfessionalProfileDetails {
  id?: string;
  userId?: string;
  phoneNumber?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  twitterUrl?: string | null;
  portfolioUrl?: string | null;
  currentLocation?: string | null;
  nationality?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  professionalHeadline?: string | null;
  professionalSummary?: string | null;
  careerObjective?: string | null;
  profileVisibility?: ProfileVisibility;
}

export interface EducationItem {
  id?: string;
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  sortOrder?: number;
}

export interface WorkExperienceItem {
  id?: string;
  companyName: string;
  jobTitle: string;
  location?: string | null;
  employmentType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  achievements?: string[];
  sortOrder?: number;
}

export interface SkillItem {
  id?: string;
  name: string;
  category?: string | null;
  proficiency?: string | null;
  sortOrder?: number;
}

export interface CertificationItem {
  id?: string;
  title: string;
  issuingOrganization?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  credentialUrl?: string | null;
  description?: string | null;
  sortOrder?: number;
}

export interface ProfileProjectItem {
  id?: string;
  title: string;
  role?: string | null;
  organization?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  achievements?: string[];
  projectUrl?: string | null;
  sortOrder?: number;
}

export interface LanguageItem {
  id?: string;
  language: string;
  proficiency?: string | null;
  sortOrder?: number;
}

export interface ProfessionalProfileBundle {
  user: User;
  profile: ProfessionalProfileDetails | null;
  education: EducationItem[];
  workExperience: WorkExperienceItem[];
  skills: SkillItem[];
  certifications: CertificationItem[];
  projects: ProfileProjectItem[];
  languages: LanguageItem[];
}



export type ProjectHealthStatus = "healthy" | "watchlist" | "at_risk" | "critical";

export interface ProjectHealthUser {
  id: string | null;
  firstName: string;
  lastName?: string;
  email?: string | null;
}

export interface ProjectHealthMetrics {
  totalTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  openTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  delayedTasks: number;
  overdueTasks: number;
  urgentOpenTasks: number;
  staleOpenTasks: number;
  ownerlessOpenTasks: number;
  completionRate: number;
}

export interface ProjectHealthWorkload {
  topAssignee: ProjectHealthUser | null;
  topAssigneeOpenTasks: number;
  concentrationPercentage: number;
}

export interface ProjectHealthPriorityTask {
  id: string;
  title: string;
  status: string;
  priority?: string;
  deadline?: string | null;
  assignee?: ProjectHealthUser | null;
  isOverdue: boolean;
  isStale: boolean;
}

export interface ProjectHealthProject {
  project: {
    id: string;
    name: string;
    description?: string | null;
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
    dueDate?: string | null;
    leadId?: string | null;
    teamId?: string | null;
    team?: { id: string; name: string } | null;
    owner?: { id: string; firstName: string; lastName: string; profilePictureUrl?: string | null } | null;
    logoUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  healthScore: number;
  healthStatus: ProjectHealthStatus;
  healthLabel: string;
  healthDescription: string;
  deadline?: string | null;
  lastActivity?: string | null;
  attentionReasons?: string[];
  metrics: ProjectHealthMetrics;
  workload: ProjectHealthWorkload;
  riskReasons: string[];
  recommendedActions: string[];
  priorityTasks: ProjectHealthPriorityTask[];
  generatedAt: string;
}

export type WorkloadLevel = "light" | "balanced" | "heavy" | "overloaded";
export interface WorkloadTaskReference {
  id: string;
  title: string;
  teamId: string | null;
  projectId: string | null;
  assigneeId: string | null;
  status: string;
  priority: "low" | "medium" | "high" | "urgent" | null;
  deadline: string | null;
}
export interface WorkloadMetrics {
  activeTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  highPriorityTasks: number;
  activeProjects: number;
}
export interface WorkloadEntry {
  metrics: WorkloadMetrics;
  workload: { level: WorkloadLevel; score: number; reasons: string[] };
  tasks: WorkloadTaskReference[];
}
export interface WorkloadPerson extends WorkloadEntry {
  user: { id: string; firstName: string; lastName: string; avatar: string | null; role: WorkspaceRole };
  teams: Array<{ id: string; name: string }>;
}
export interface WorkloadTeam extends WorkloadEntry {
  id: string;
  name: string;
  lead: { id: string; firstName: string; lastName: string } | null;
  memberCount: number;
}
export interface WorkloadResponse {
  scope: "workspace" | "teams";
  summary: { activeMembers: number; light: number; balanced: number; heavy: number; overloaded: number; unassignedTasks: number; unassignedOverdueTasks: number; unassignedDueSoonTasks: number; overdueTasks: number; dueSoonTasks: number };
  people: WorkloadPerson[];
  teams: WorkloadTeam[];
  unassigned: WorkloadTaskReference[];
  generatedAt: string;
}

export interface TimeEntry {
  id: string; companyId: string; userId: string | null; taskId: string | null; projectId: string | null; teamId: string | null;
  userNameSnapshot: string; taskTitleSnapshot: string; projectNameSnapshot: string | null; entryDate: string;
  startedAt: string; endedAt: string | null; durationSeconds: number; note: string | null; billable: boolean; source: "timer" | "manual" | "system";
  user?: { id: string; firstName?: string; lastName?: string; profilePictureUrl?: string } | null;
}
export interface TimeTrackingFilters { from?: string; to?: string; userId?: string; projectId?: string; teamId?: string; taskId?: string; billable?: boolean; source?: "timer" | "manual" | "system"; page?: number; limit?: number }
export interface TimeTrackingSummary {
  totalSeconds: number; billableSeconds: number; nonBillableSeconds: number; activeTimers: number;
  byUser: Array<{ userId: string | null; userNameSnapshot: string; durationSeconds: number }>;
  byProject: Array<{ projectId: string | null; projectNameSnapshot: string | null; durationSeconds: number }>;
  byTask: Array<{ taskId: string | null; taskTitleSnapshot: string; projectId: string | null; projectNameSnapshot: string | null; durationSeconds: number }>;
  byTeam: Array<{ teamId: string | null; teamName: string; durationSeconds: number }>;
}

export interface ProjectHealthSummary {
  totalProjects: number;
  activeProjects?: number;
  archivedProjects?: number;
  completedProjects?: number;
  overdueProjects?: number;
  needsAttentionProjects?: number;
  averageHealthScore: number;
  counts: {
    healthy: number;
    watchlist: number;
    at_risk: number;
    critical: number;
  };
  totalOverdueTasks: number;
  totalOpenTasks: number;
  criticalProjects: Array<{
    id: string;
    name: string;
    healthScore: number;
    healthStatus: ProjectHealthStatus;
    healthLabel: string;
    topRisk: string;
  }>;
}

/* ============================
   API BASE URL
============================ */

// Local Vite development talks to the local backend by default. Production
// still requires its hosting environment to provide VITE_API_BASE_URL; the
// empty production fallback preserves the existing same-origin behaviour.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5001/api/v1" : "");
import { captureUnexpectedApiError } from "@/lib/sentry";

/* ============================
   API CLIENT
============================ */

export class ApiError extends Error {
  statusCode: number;
  status: string;
  /** The parsed error response (e.g. template validation `errors`, `warnings`, `code`, `currentVersion`). */
  body?: any;
  constructor(
    message: string,
    statusCode: number,
    body?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
    this.body = body;
  }
}

export class NetworkError extends Error {
  constructor(message = "Network error") {
    super(message);
    this.name = "NetworkError";
  }
}

export type SupportStatus = "received" | "in_review" | "waiting_on_user" | "in_progress" | "resolved" | "closed";
export interface SupportMessage { id: string; authorType: "user" | "admin" | "ai" | "system"; content: string; createdAt: string; attachments?: Array<{ fileName: string; fileType: string; fileSize?: number; downloadUrl: string }> }
export interface SupportTicket { id: string; ticketNumber: string; subject: string; category: string; status: SupportStatus; priority: string; aiEscalated: boolean; createdAt: string; updatedAt: string; unread?: boolean; messages?: SupportMessage[] }

class ApiClient {
  async get<T>(
      path: string,
      options?: {
          params?: Record<string, any>;
          includeWorkspace?: boolean;
      }
  ): Promise<T> {

      let url = path;

      if (options?.params) {

          const search = new URLSearchParams();

          Object.entries(options.params).forEach(([key, value]) => {

              if (
                  value !== undefined &&
                  value !== null &&
                  value !== ""
              ) {
                  search.append(key, String(value));
              }

          });

          const qs = search.toString();

          if (qs) {
              url += `?${qs}`;
          }

      }

      return this.request<T>(url, {
          method: "GET",
          headers: this.getAuthHeaders(
              options?.includeWorkspace ?? true
          ),
      });

  }
  getUserById: any;
  getTeamMembers: any;
  private getAuthHeaders(includeWorkspace: boolean = true): HeadersInit {
    const token =
      localStorage.getItem("auth_token") || localStorage.getItem("token");
    const activeCompanyId = localStorage.getItem("activeCompanyId");

    const headers: HeadersInit = {};

    // Content-Type should NOT be set when using FormData
    // so we set it in request() for JSON calls only.
    if (token) {
      (headers as any).Authorization = `Bearer ${token}`;
    }
    if (includeWorkspace && activeCompanyId) {
      (headers as any)["x-company-id"] = activeCompanyId;
    }
    return headers;
  }

  async getCalendarEvents(
    start: Date,
    end: Date,
    scope: "company" | "my" | "team" = "company"
  ): Promise<CalendarResponse> {
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      scope,
    });

    return this.request<CalendarResponse>(
      `/calendar/events?${params.toString()}`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${path}`;

    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;

    // Ensure JSON calls always have Content-Type
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (err) {
      const error = new NetworkError(err instanceof Error ? err.message : "Network error");
      captureUnexpectedApiError(error, { path, method: options.method || "GET" });
      throw error;
    }

    let result: any;
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      let message: string = result?.message || "Request failed";

      if (response.status === 401 && /user belonging to this token|session is no longer valid/i.test(message)) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("token");
        localStorage.removeItem("activeCompanyId");
        message = "Your session has expired. Please sign in again.";
      }

      // Rate-limit guard — surface a clean message for 429 responses.
      if (response.status === 429) {
        const rateLimitMessage =
          typeof result?.message === "string" && result.message.trim()
            ? result.message
            : "Too many attempts. Please try again shortly.";
        throw new ApiError(rateLimitMessage, 429);
      }

      // Suspended workspace: a recoverable, clearly-worded state (not a generic failure). Only name + support reference are exposed.
      if (response.status === 423 && result?.code === "WORKSPACE_SUSPENDED") {
        const workspace = result?.data?.workspace;
        if (typeof window !== "undefined") {
          if (workspace?.id) window.dispatchEvent(new CustomEvent("workspace:suspended", { detail: { id: workspace.id, name: workspace.name ?? null, reference: workspace.reference ?? null } }));
          // Resource-level responses (e.g. a Task by id) carry no workspace detail: let the app work out whether the ACTIVE workspace is the suspended one.
          else window.dispatchEvent(new Event("workspace:suspended-unknown"));
        }
        throw new ApiError("This workspace is temporarily suspended.", 423, result);
      }

      // Workspace missing guard
      if (
        response.status === 400 &&
        message.toLowerCase().includes("x-company-id")
      ) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("workspace:missing", {
              detail: { message: "Select a workspace to continue" },
            })
          );
          window.dispatchEvent(new Event("workspace:switcher-open"));
        }
      }

      if (
        response.status === 403 &&
        message.toLowerCase().includes("workspace")) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("workspace:missing", {
              detail: { message },
            })
          );
        }
      }

      const error = new ApiError(message, response.status, result);
      captureUnexpectedApiError(error, { path, method: options.method || "GET", status: response.status });
      throw error;
    }

    return result as T;
  }

  /* ============================
     AUTH
  ============================ */
  async validateWhatsAppChallenge(token:string){return this.get("/integrations/whatsapp/connect/validate",{params:{t:token},includeWorkspace:false});}
  async completeWhatsAppConnection(token:string,confirm:boolean){return this.request("/integrations/whatsapp/connect/complete",{method:"POST",headers:this.getAuthHeaders(false),body:JSON.stringify({token,confirm})});}
  async cancelWhatsAppConnection(token:string){return this.request("/integrations/whatsapp/connect/cancel",{method:"POST",body:JSON.stringify({token})});}
  async getWhatsAppAccount(){return this.get("/integrations/whatsapp/account",{includeWorkspace:false});}
  async disconnectWhatsApp(){return this.request("/integrations/whatsapp/account",{method:"DELETE",headers:this.getAuthHeaders(false)});}
  async getWhatsAppPreferences(){return this.get("/integrations/whatsapp/preferences",{includeWorkspace:false});}
  async updateWhatsAppPreferences(data:Record<string, boolean>){return this.request("/integrations/whatsapp/preferences",{method:"PUT",headers:this.getAuthHeaders(false),body:JSON.stringify(data)});}
  async getWhatsAppQuietHours(){return this.get("/integrations/whatsapp/quiet-hours",{includeWorkspace:false});}
  async updateWhatsAppQuietHours(data:{enabled:boolean;startTime:string|null;endTime:string|null;timeZone:string|null}){return this.request("/integrations/whatsapp/quiet-hours",{method:"PUT",headers:this.getAuthHeaders(false),body:JSON.stringify(data)});}

  /* Workspace Connected Storage (Phase 3A). The backend never returns provider tokens; only safe connection metadata. */
  async listConnectedStorageConnections(): Promise<{ status: string; data: ConnectedStorageListResponse }> {
    return this.request("/connected-storage/connections", { method: "GET", headers: this.getAuthHeaders() });
  }
  async startDropboxConnection(): Promise<{ status: string; data: { authorizationUrl: string } }> {
    return this.request("/connected-storage/dropbox/connect", { method: "POST", headers: this.getAuthHeaders() });
  }
  async reconnectConnectedStorage(connectionId: string): Promise<{ status: string; data: { authorizationUrl: string } }> {
    return this.request(`/connected-storage/connections/${encodeURIComponent(connectionId)}/reconnect`, { method: "POST", headers: this.getAuthHeaders() });
  }
  async disconnectConnectedStorage(connectionId: string): Promise<{ status: string; message?: string; data: { providerRevoked: boolean } }> {
    return this.request(`/connected-storage/connections/${encodeURIComponent(connectionId)}`, { method: "DELETE", headers: this.getAuthHeaders() });
  }

  /* Connected Storage browse / search / get-item (Phase 3B). Read-only; every call carries the intended target and is re-authorized server-side. */
  private connectedStorageTargetQuery(target: ConnectedStorageTarget, extra: Record<string, string | undefined> = {}): string {
    const params = new URLSearchParams({ targetType: target.targetType });
    if (target.targetId) params.set("targetId", target.targetId);
    if (target.taskId) params.set("taskId", target.taskId);
    for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
    return params.toString();
  }
  async listConnectedStorageItems(connectionId: string, target: ConnectedStorageTarget, options: { parentId?: string | null; cursor?: string | null } = {}): Promise<{ status: string; data: ConnectedStorageListing }> {
    const query = this.connectedStorageTargetQuery(target, { parentId: options.parentId || undefined, cursor: options.cursor || undefined });
    return this.request(`/connected-storage/connections/${encodeURIComponent(connectionId)}/items?${query}`, { method: "GET", headers: this.getAuthHeaders() });
  }
  async searchConnectedStorage(connectionId: string, target: ConnectedStorageTarget, q: string, cursor?: string | null): Promise<{ status: string; data: ConnectedStorageSearchResult }> {
    const query = this.connectedStorageTargetQuery(target, { q, cursor: cursor || undefined });
    return this.request(`/connected-storage/connections/${encodeURIComponent(connectionId)}/search?${query}`, { method: "GET", headers: this.getAuthHeaders() });
  }
  async getConnectedStorageItem(connectionId: string, target: ConnectedStorageTarget, providerItemId: string): Promise<{ status: string; data: { provider: string; item: ConnectedStorageItem } }> {
    // Provider ids (e.g. "id:abc") are encoded as a single path segment and never rewritten.
    return this.request(`/connected-storage/connections/${encodeURIComponent(connectionId)}/items/${encodeURIComponent(providerItemId)}?${this.connectedStorageTargetQuery(target)}`, { method: "GET", headers: this.getAuthHeaders() });
  }

  /* Connected Storage attachments (Phase 3C). The browser sends only ids; names/MIME/size are always re-read from the provider server-side. */
  async attachConnectedStorageItem(input: { connectionId: string; providerItemId: string; target: { type: ConnectedStorageTargetType; id: string } }): Promise<{ status: string; data: { attachment: ConnectedStorageAttachment; created: boolean } }> {
    const { connectionId, providerItemId, target } = input;
    return this.request("/connected-storage/attachments", { method: "POST", headers: this.getAuthHeaders(), body: JSON.stringify({ connectionId, providerItemId, target: { type: target.type, id: target.id } }) });
  }
  async unlinkConnectedStorageAttachment(attachmentId: string): Promise<{ status: string; message?: string; data: { removed: boolean } }> {
    return this.request(`/connected-storage/attachments/${encodeURIComponent(attachmentId)}`, { method: "DELETE", headers: this.getAuthHeaders() });
  }
  /** Asks Admiino for a fresh, short-lived provider link. The link is never stored by the app. */
  async openConnectedStorageAttachment(attachmentId: string): Promise<{ status: string; data: { url: string; expiresAt: string | null } }> {
    return this.request(`/connected-storage/attachments/${encodeURIComponent(attachmentId)}/open?format=json`, { method: "GET", headers: this.getAuthHeaders() });
  }
  /** Authenticated in-app preview bytes (image / PDF / text only). Errors carry `body.code` (preview_not_supported, file_unavailable, reauth_required, ...). */
  async previewConnectedStorageAttachment(attachmentId: string): Promise<{ blob: Blob; fileName: string; contentType: string }> {
    return this._fetchBlob(`/connected-storage/attachments/${encodeURIComponent(attachmentId)}/preview`, this.getAuthHeaders());
  }
  async listProjectConnectedStorageAttachments(projectId: string): Promise<{ status: string; data: { attachments: ConnectedStorageAttachment[] } }> {
    return this.request(`/projects/${encodeURIComponent(projectId)}/connected-storage-attachments`, { method: "GET", headers: this.getAuthHeaders() });
  }
  async listTaskConnectedStorageAttachments(taskId: string): Promise<{ status: string; data: { attachments: ConnectedStorageAttachment[] } }> {
    return this.request(`/tasks/${encodeURIComponent(taskId)}/connected-storage-attachments`, { method: "GET", headers: this.getAuthHeaders() });
  }

  async signupExecutive(data: SignupExecutiveData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup/executive", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("token", result.token);
    }
    return result;
  }

  async signupTeamMember(data: SignupAssistantData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup/team_member", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("token", result.token);
    }
    return result;
  }

  async signupExecutiveJoin(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyCode: string;
    turnstileToken?: string;
  }): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup/executive-join", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("token", result.token);
    }
    return result;
  }

  async signupManager(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyCode: string;
    specialization?: string;
    experience?: number;
    hourlyRate?: number;
    bio?: string;
    skills?: string[];
    turnstileToken?: string;
  }): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup/manager", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("token", result.token);
    }
    return result;
  }

  async signupUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    turnstileToken?: string;
  }): Promise<{ status: string; message: string; token?: string }> {
    const result = await this.request("/auth/signup", {
      method: "POST",
      headers: this.getAuthHeaders(false),
      body: JSON.stringify(data),
    });
    const t = (result as any)?.token;
    if (t) {
      localStorage.setItem("auth_token", t);
      localStorage.setItem("token", t);
    }
    return result as any;
  }

  async signupWithInvite(data: {
    token: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<{ status: string; message: string; token?: string }> {
    const result = await this.request("/auth/signup-with-invite", {
      method: "POST",
      headers: this.getAuthHeaders(false),
      body: JSON.stringify(data),
    });
    const t = (result as any)?.token;
    if (t) {
      localStorage.setItem("auth_token", t);
      localStorage.setItem("token", t);
    }
    return result as any;
  }

  async acceptWorkspaceInvite(token: string): Promise<{
    status: string;
    message?: string;
    data?: { company?: Company; companyId?: string };
  }> {
    return this.request(`/invites/${token}/accept`, {
      method: "POST",
      headers: this.getAuthHeaders(false),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    // Do NOT automatically save the token - we will check accountType first
    return result;
  }

  async getCurrentUser(): Promise<{ status: string; data: {
    workspaces: any[]; user: User 
} }> {
    return this.request("/auth/me", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  logout(): void {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
  }

  async getSuspendedWorkspaces(): Promise<{ status: string; data: { workspaces: { id: string; name: string; reference: string }[] } }> {
    return this.request("/workspaces/suspended", { method: "GET", headers: this.getAuthHeaders(false) });
  }

  async getMyWorkspaces(): Promise<{
    status: string;
    data: { workspaces: WorkspaceItem[] } | { workspaces: any[] } | any;
  }> {
    return this.request("/me/workspaces", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async getWorkspaces(): Promise<{ status: string; data: { workspaces: any[] } }> {
    return this.request("/auth/workspaces", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async getLeaveRequirements(workspaceId: string): Promise<{ status: string; data: { teams: Array<{ id: string; name: string; currentLeadMemberId: string }> } }> {
    return this.request(`/workspaces/${workspaceId}/leave-requirements`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async leaveWorkspace(workspaceId: string, data?: { newOwnerUserId?: string; confirmHandover?: boolean; teamLeadHandovers?: Array<{ teamId: string; replacementCompanyMemberId: string }> }): Promise<{ status: string; message?: string }> {
    return this.request(`/workspaces/${workspaceId}/leave`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data || {}),
    });
  }

  async deleteWorkspace(workspaceId: string, confirmation: string): Promise<{ status: string; message?: string }> {
    return this.request(`/workspaces/${workspaceId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ confirmation }),
    });
  }

  async uploadWorkspaceLogo(workspaceId: string, file: File): Promise<{ status: string; message?: string; data?: { logoUrl?: string | null } }> {
    const form = new FormData();
    form.append("logo", file);
    return this.request(`/workspaces/${workspaceId}/logo`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: form,
    });
  }

  async removeWorkspaceLogo(workspaceId: string): Promise<{ status: string; message?: string }> {
    return this.request(`/workspaces/${workspaceId}/logo`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async getTrash(): Promise<{ status: string; data: { items: TrashItem[] } }> {
    return this.request("/trash", { method: "GET", headers: this.getAuthHeaders() });
  }

  async restoreTrashItem(type: TrashItemType, id: string): Promise<{ status: string; message?: string }> {
    return this.request(`/trash/${type}/${id}/restore`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });
  }

  async permanentlyDeleteTrashItem(type: TrashItemType, id: string, confirmation?: string): Promise<{ status: string; message?: string }> {
    return this.request(`/trash/${type}/${id}/permanent`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(confirmation ? { confirmation } : {}),
    });
  }

  async getGoogleAuthUrl(): Promise<{ status: string; data: { authUrl: string } }> {
    return this.request("/auth/google", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  /* ============================
     INTEGRATIONS HUB
  ============================ */

  async listIntegrations(): Promise<any> {
    return this.request("/integrations", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getIntegrationConnectUrl(provider: string): Promise<any> {
    return this.request(`/integrations/${provider}/connect`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  buildIntegrationConnectUrl(provider: string): string {
    const base = API_BASE_URL || "";
    return `${base}/integrations/${encodeURIComponent(provider)}/connect`;
  }

  buildWhatsAppClickToChatUrl(): string {
    return `https://wa.me/6589932607?text=${encodeURIComponent("Hello")}`;
  }

  async inspectWorkspaceInvite(token: string): Promise<any> {
    return this.get(`/invites/${encodeURIComponent(token)}`, { includeWorkspace: false });
  }

  async resolveWorkspaceCode(companyCode: string): Promise<any> {
    return this.request("/company/join/resolve", { method: "POST", headers: this.getAuthHeaders(false), body: JSON.stringify({ companyCode }) });
  }

  async requestWorkspaceJoin(companyCode: string): Promise<any> {
    return this.request("/company/join/requests", { method: "POST", headers: this.getAuthHeaders(false), body: JSON.stringify({ companyCode }) });
  }

  async disconnectIntegration(provider: string): Promise<any> {
    return this.request(`/integrations/${provider}/disconnect`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }

  async getGoogleIntegrationStatus(): Promise<any> {
    return this.request(`/integrations/google/status`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  /* ============================
     TASKS
  ============================ */

  async createTask(
    data: FormData | CreateTaskData
  ): Promise<{ status: string; message: string; data: { task: Task } }> {
    const isFormData = data instanceof FormData;

    const headers: HeadersInit = isFormData
      ? this.getAuthHeaders(true) // no JSON content-type
      : { ...this.getAuthHeaders(true), "Content-Type": "application/json" };

    return this.request("/tasks", {
      method: "POST",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  async getTasks(
    filters?: TaskFilters & { teamId?: string; projectId?: string; q?: string; limit?: number; page?: number }
  ): Promise<{ status: string; results: number; data: { tasks: Task[] } }> {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.priority) queryParams.append("priority", filters.priority);
    if (filters?.category) queryParams.append("category", filters.category);
    if (filters?.teamId) queryParams.append("teamId", filters.teamId);
    if (filters?.projectId) queryParams.append("projectId", filters.projectId);
    if (filters?.q) queryParams.append("q", filters.q.slice(0, 100));
    if (filters?.limit) queryParams.append("limit", String(Math.min(Math.max(filters.limit, 1), 50)));
    if (filters?.page) queryParams.append("page", String(Math.max(filters.page, 1)));
    if (filters?.customFieldColumns?.length) queryParams.append("customFieldColumns", JSON.stringify(filters.customFieldColumns.slice(0, 5)));
    if (filters?.customFieldFilters?.length) queryParams.append("customFieldFilters", JSON.stringify(filters.customFieldFilters.slice(0, 5)));

    return this.request(`/tasks?${queryParams.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async globalSearch(query: string, workspaceId?: string | null, signal?: AbortSignal): Promise<{ status: string; data: { groups: Record<string, Array<{ id: string; title: string; subtitle: string; href: string }>> } }> {
    const params = new URLSearchParams({ q: query.slice(0, 100) });
    const headers = new Headers(this.getAuthHeaders());
    if (workspaceId) headers.set("x-company-id", workspaceId);
    return this.request(`/global-search?${params.toString()}`, { method: "GET", headers, signal });
  }

  async getAllTasksCrossWorkspace(
    filters?: AllTasksFilters
  ): Promise<AllTasksResponse> {
    const queryParams = new URLSearchParams();
    const scope = filters?.scope || "assigned_all";
    queryParams.append("scope", scope);
    if (filters?.page) queryParams.append("page", filters.page.toString());
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());
    if (filters?.search) queryParams.append("search", filters.search);
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.priority) queryParams.append("priority", filters.priority);
    if (filters?.companyId) queryParams.append("companyId", filters.companyId);
    if (filters?.teamId) queryParams.append("teamId", filters.teamId);
    if (filters?.projectId) queryParams.append("projectId", filters.projectId);

    // For workspace scopes, we need to send x-company-id header
    const useCompanyHeader = scope === "workspace" || scope === "assigned_workspace";

    return this.request(`/tasks?${queryParams.toString()}`, {
      method: "GET",
      headers: useCompanyHeader ? this.getAuthHeaders() : this.getAuthHeaders(false),
    });
  }

  async getTaskById(
    taskId: string
  ): Promise<{ status: string; data: { task: Task; access?: TaskAccess | null; connectedStorageAttachments?: ConnectedStorageAttachment[] } }> {
    return this.request(`/tasks/${taskId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getTaskSubtasks(
    taskId: string
  ): Promise<{ status: string; results?: number; data: { subtasks: TaskSubtask[] } | TaskSubtask[] }> {
    return this.request(`/tasks/${taskId}/subtasks`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async createTaskSubtask(
    taskId: string,
    data: { title: string; description?: string; priority?: TaskPriority; deadline?: string; status?: TaskSubtask["status"]; assigneeId?: string | null; sortOrder?: number; teamId?: string | null }
  ): Promise<{ status: string; message?: string; data: { task?: TaskSubtask; subtask?: TaskSubtask } | TaskSubtask }> {
    return this.request(`/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async updateTaskSubtask(
    taskId: string,
    subtaskId: string,
    data: Partial<{ title: string; description: string; priority: TaskPriority; deadline: string | null; status: TaskSubtask["status"]; assigneeId: string | null; sortOrder: number }>
  ): Promise<{ status: string; message?: string; data: { subtask: TaskSubtask } | TaskSubtask }> {
    return this.request(`/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async deleteTaskSubtask(
    taskId: string,
    subtaskId: string
  ): Promise<{ status: string; message?: string }> {
    return this.request(`/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async getTaskActivity(
    taskId: string
  ): Promise<{ status: string; results?: number; data: { activities: TaskActivity[] } | TaskActivity[] }> {
    return this.request(`/tasks/${taskId}/activity`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getTaskWatchers(
    taskId: string
  ): Promise<{ status: string; results?: number; data: { watchers: TaskWatcher[] } | TaskWatcher[] }> {
    return this.request(`/tasks/${taskId}/watchers`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async addTaskWatcher(
    taskId: string,
    userId: string
  ): Promise<{ status: string; message?: string; data?: { watcher?: TaskWatcher } }> {
    return this.request(`/tasks/${taskId}/watchers`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  }

  async removeTaskWatcher(
    taskId: string,
    userId: string
  ): Promise<{ status: string; message?: string }> {
    return this.request(`/tasks/${taskId}/watchers/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  /* ---- Task dependencies (graph mutations never go through updateTask) ---- */

  async getTaskDependencies(taskId: string): Promise<{ status: string; data: TaskDependencyGraph }> {
    return this.request(`/tasks/${taskId}/dependencies`, { method: "GET", headers: this.getAuthHeaders() });
  }

  async getTaskDependencyCandidates(
    taskId: string,
    params: { q?: string; limit?: number } = {}
  ): Promise<{ status: string; data: { tasks: TaskDependencyCandidate[] } }> {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.limit) query.set("limit", String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return this.request(`/tasks/${taskId}/dependencies/candidates${suffix}`, { method: "GET", headers: this.getAuthHeaders() });
  }

  async addTaskDependency(taskId: string, dependsOnTaskId: string): Promise<{ status: string; data: TaskDependencyGraph }> {
    return this.request(`/tasks/${taskId}/dependencies`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ dependsOnTaskId }),
    });
  }

  async removeTaskDependency(taskId: string, dependsOnTaskId: string): Promise<{ status: string; data: TaskDependencyGraph }> {
    return this.request(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`, { method: "DELETE", headers: this.getAuthHeaders() });
  }

  /* ---- Recurring tasks (series are managed through these task-scoped endpoints only) ---- */

  async getTaskRecurrence(taskId: string): Promise<{ status: string; data: TaskRecurrenceResponse }> {
    return this.request(`/tasks/${taskId}/recurrence`, { method: "GET", headers: this.getAuthHeaders() });
  }

  async previewTaskRecurrence(taskId: string, input: TaskRecurrenceInput): Promise<{ status: string; data: TaskRecurrencePreview }> {
    return this.request(`/tasks/${taskId}/recurrence/preview`, {
      method: "POST", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
  }

  async createTaskRecurrence(taskId: string, input: TaskRecurrenceInput): Promise<{ status: string; data: TaskRecurrenceResponse }> {
    return this.request(`/tasks/${taskId}/recurrence`, {
      method: "POST", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
  }

  async updateTaskRecurrence(taskId: string, input: TaskRecurrenceInput): Promise<{ status: string; data: TaskRecurrenceResponse }> {
    return this.request(`/tasks/${taskId}/recurrence`, {
      method: "PATCH", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
  }

  async pauseTaskRecurrence(taskId: string): Promise<{ status: string; data: TaskRecurrenceResponse }> {
    return this.request(`/tasks/${taskId}/recurrence/pause`, { method: "POST", headers: this.getAuthHeaders() });
  }

  async resumeTaskRecurrence(taskId: string, options: { takeOwnership?: boolean } = {}): Promise<{ status: string; data: TaskRecurrenceResponse }> {
    return this.request(`/tasks/${taskId}/recurrence/resume`, {
      method: "POST", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(options),
    });
  }

  async stopTaskRecurrence(taskId: string): Promise<{ status: string; data: TaskRecurrenceResponse }> {
    return this.request(`/tasks/${taskId}/recurrence/stop`, { method: "POST", headers: this.getAuthHeaders() });
  }

  async useTaskDetailsForFutureOccurrences(taskId: string): Promise<{ status: string; data: TaskRecurrenceResponse }> {
    return this.request(`/tasks/${taskId}/recurrence/use-task-details`, { method: "POST", headers: this.getAuthHeaders() });
  }

  /* ---- Templates (workspace scoped; the active workspace header is sent) ---- */

  async listTemplates(params: { type?: TemplateType; status?: TemplateStatus | "all" } = {}): Promise<{ status: string; data: { templates: TemplateSummary[] } }> {
    const q = new URLSearchParams();
    if (params.type) q.set("type", params.type);
    if (params.status) q.set("status", params.status);
    return this.request(`/templates${q.toString() ? `?${q}` : ""}`, { method: "GET", headers: this.getAuthHeaders() });
  }

  async getTemplate(id: string, version?: number): Promise<{ status: string; data: { template: TemplateDetail } }> {
    return this.request(`/templates/${id}${version ? `?version=${version}` : ""}`, { method: "GET", headers: this.getAuthHeaders() });
  }

  async createTemplate(data: { type: TemplateType; name: string; description?: string | null; category?: string | null; body: TaskTemplateBody | ProjectTemplateBody }): Promise<{ status: string; data: { template: TemplateDetail } }> {
    return this.request(`/templates`, { method: "POST", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }

  async updateTemplate(id: string, data: { expectedVersion: number; name?: string; description?: string | null; category?: string | null; body?: TaskTemplateBody | ProjectTemplateBody }): Promise<{ status: string; data: { template: TemplateDetail } }> {
    return this.request(`/templates/${id}`, { method: "PATCH", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }

  async archiveTemplate(id: string): Promise<{ status: string; data: { template: TemplateDetail } }> {
    return this.request(`/templates/${id}/archive`, { method: "POST", headers: this.getAuthHeaders() });
  }

  async restoreTemplate(id: string): Promise<{ status: string; data: { template: TemplateDetail } }> {
    return this.request(`/templates/${id}/restore`, { method: "POST", headers: this.getAuthHeaders() });
  }

  async previewTemplate(id: string, input: Partial<TemplateUseInput>): Promise<{ status: string; data: TemplatePreview }> {
    return this.request(`/templates/${id}/preview`, { method: "POST", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(input) });
  }

  async instantiateTemplate(id: string, input: TemplateUseInput): Promise<{ status: string; data: TemplateUseResult }> {
    return this.request(`/templates/${id}/instantiate`, { method: "POST", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(input) });
  }

  /* ---- Custom Fields (Phase 4D) ---- */
  async listCustomFields(entityType: CustomFieldEntityType, status: "active" | "all" = "active"): Promise<{ status: string; data: { definitions: CustomFieldDefinition[] } }> {
    return this.request(`/custom-fields?${new URLSearchParams({ entityType, status })}`, { method: "GET", headers: this.getAuthHeaders() });
  }
  async createCustomField(data: Partial<CustomFieldDefinition> & Pick<CustomFieldDefinition, "entityType" | "fieldType" | "name">): Promise<{ status: string; data: { definition: CustomFieldDefinition } }> {
    return this.request("/custom-fields", { method: "POST", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }
  async updateCustomField(id: string, data: Partial<CustomFieldDefinition> & { confirmTightening?: boolean }): Promise<{ status: string; data: { field: CustomFieldDefinition; existingViolationCount: number } }> {
    return this.request(`/custom-fields/${id}`, { method: "PATCH", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }
  async previewCustomFieldConfig(id: string, config: Record<string, any>): Promise<{ status: string; data: { config: Record<string, any>; existingViolationCount: number } }> {
    return this.request(`/custom-fields/${id}/config-preview`, { method: "PATCH", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ config }) });
  }
  async reorderCustomFields(entityType: CustomFieldEntityType, fieldIds: string[]): Promise<{ status: string }> {
    return this.request("/custom-fields/reorder", { method: "PATCH", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ entityType, fieldIds }) });
  }
  async archiveCustomField(id: string): Promise<{ status: string }> { return this.request(`/custom-fields/${id}/archive`, { method: "POST", headers: this.getAuthHeaders() }); }
  async restoreCustomField(id: string): Promise<{ status: string }> { return this.request(`/custom-fields/${id}/restore`, { method: "POST", headers: this.getAuthHeaders() }); }
  async addCustomFieldOption(id: string, data: { label: string; color?: string | null; position?: number }): Promise<{ status: string; data: { option: CustomFieldOption } }> {
    return this.request(`/custom-fields/${id}/options`, { method: "POST", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }
  async updateCustomFieldOption(id: string, optionId: string, data: Partial<Pick<CustomFieldOption, "label" | "color" | "position">>): Promise<{ status: string; data: { option: CustomFieldOption } }> {
    return this.request(`/custom-fields/${id}/options/${optionId}`, { method: "PATCH", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }
  async archiveCustomFieldOption(id: string, optionId: string): Promise<{ status: string }> { return this.request(`/custom-fields/${id}/options/${optionId}/archive`, { method: "POST", headers: this.getAuthHeaders() }); }
  async restoreCustomFieldOption(id: string, optionId: string): Promise<{ status: string }> { return this.request(`/custom-fields/${id}/options/${optionId}/restore`, { method: "POST", headers: this.getAuthHeaders() }); }
  async reorderCustomFieldOptions(id: string, optionIds: string[]): Promise<{ status: string }> {
    return this.request(`/custom-fields/${id}/options/reorder`, { method: "PATCH", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ optionIds }) });
  }
  async getTaskCustomFields(taskId: string): Promise<{ status: string; data: { values: CustomFieldValue[]; archivedValues?: CustomFieldValue[]; missingRequired?: { fieldId: string; name: string }[] } }> { return this.request(`/tasks/${taskId}/custom-fields`, { method: "GET", headers: this.getAuthHeaders() }); }
  async patchTaskCustomFields(taskId: string, customFields: Record<string, unknown>): Promise<{ status: string; data: { changed: number } }> {
    return this.request(`/tasks/${taskId}/custom-fields`, { method: "PATCH", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ customFields }) });
  }
  async getProjectCustomFields(projectId: string): Promise<{ status: string; data: { values: CustomFieldValue[]; archivedValues?: CustomFieldValue[]; missingRequired?: { fieldId: string; name: string }[] } }> { return this.request(`/projects/${projectId}/custom-fields`, { method: "GET", headers: this.getAuthHeaders() }); }
  async patchProjectCustomFields(projectId: string, customFields: Record<string, unknown>): Promise<{ status: string; data: { changed: number } }> {
    return this.request(`/projects/${projectId}/custom-fields`, { method: "PATCH", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ customFields }) });
  }

  async saveTaskAsTemplate(taskId: string, data: { name?: string; description?: string | null; category?: string | null; options?: { keepAssignees?: boolean; deriveDueOffsets?: boolean; includeRecurrence?: boolean; includeCustomFieldValues?: boolean } }): Promise<{ status: string; data: { template: TemplateDetail } }> {
    return this.request(`/templates/from-task/${taskId}`, { method: "POST", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }

  async watchTask(taskId: string): Promise<{ status: string; message?: string; data?: any }> {
    return this.request(`/tasks/${taskId}/watch`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });
  }

  async unwatchTask(taskId: string): Promise<{ status: string; message?: string; data?: any }> {
    return this.request(`/tasks/${taskId}/unwatch`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async updateTask(
    taskId: string,
    data: UpdateTaskData | FormData
  ): Promise<{ status: string; message: string; data: { task: Task }; warnings?: TaskMutationWarning[] }> {
    const isFormData = data instanceof FormData;

    const headers: HeadersInit = isFormData
      ? this.getAuthHeaders(true)
      : { ...this.getAuthHeaders(true), "Content-Type": "application/json" };

    return this.request(`/tasks/${taskId}`, {
      method: "PATCH",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  async updateTaskProgress(
    taskId: string,
    data: { status?: string; actualHours?: number; notes?: string }
  ): Promise<{ status: string; message: string; data: { task: Task } }> {
    return this.request(`/workflow/${taskId}/progress`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  /**
   * Phase 2 — Authenticated server-side proxy download for task attachments.
   *
   * The backend streams file bytes directly (no Cloudinary URL / signed URL
   * is returned).  The frontend receives a Blob and must create a short-lived
   * object URL for preview or download, then revoke it immediately after use.
   *
   * Endpoint: GET /api/v1/tasks/:taskId/attachments/:attachmentId/download
   */
  async downloadTaskAttachment(
    taskId: string,
    attachmentId: string
  ): Promise<{ blob: Blob; fileName: string; contentType: string }> {
    return this._fetchBlob(
      `/tasks/${taskId}/attachments/${attachmentId}/download`,
      this.getAuthHeaders()
    );
  }

  /**
   * Phase 2 — Authenticated server-side proxy download for workspace Drive files.
   *
   * The backend streams file bytes directly.  Create a short-lived object URL
   * for preview/download, then revoke it immediately after use.
   *
   * Endpoint: GET /api/v1/drive/files/:fileId/download
   */
  async downloadDriveFile(
    fileId: string
  ): Promise<{ blob: Blob; fileName: string; contentType: string }> {
    return this._fetchBlob(
      `/drive/files/${fileId}/download`,
      this.getAuthHeaders()
    );
  }

  /**
   * Phase 2 — Authenticated server-side proxy download for Assistance Request
   * attachments.
   *
   * The backend authenticates the user, verifies visibility permissions,
   * fetches the file from storage server-side, and streams bytes.
   * No Cloudinary URL or publicId is ever exposed to the frontend.
   *
   * Endpoint: GET /api/v1/assistance/:requestId/attachments/:index/download
   *
   * @param requestId   - The assistance request UUID
   * @param attachmentIndex - 0-based index of the attachment in the array
   */
  async downloadAssistanceAttachment(
    requestId: string,
    attachmentIndex: number
  ): Promise<{ blob: Blob; fileName: string; contentType: string }> {
    return this._fetchBlob(
      `/assistance/${requestId}/attachments/${attachmentIndex}/download`,
      this.getAuthHeaders()
    );
  }

  /**
   * Internal helper: authenticated fetch that always returns a Blob.
   *
   * - For non-2xx responses: attempts to parse the body as JSON to extract
   *   the backend error message, then throws an ApiError with the correct
   *   statusCode (so 401/403/404/429/5xx all surface cleanly).
   * - Content-Disposition is inspected to suggest a filename when available.
   * - Does NOT set Accept: application/json — the proxy responds with file
   *   bytes, not a JSON envelope.
   */
  private async _fetchBlob(
    path: string,
    headers: HeadersInit
  ): Promise<{ blob: Blob; fileName: string; contentType: string }> {
    const url = `${API_BASE_URL}${path}`;

    let response: Response;
    try {
      response = await fetch(url, { method: "GET", headers });
    } catch (err) {
      throw new NetworkError(
        err instanceof Error ? err.message : "Network error"
      );
    }

    if (!response.ok) {
      // Try to parse JSON error body for a clean message
      let message = `Request failed (${response.status})`;
      let errorBody: any;
      try {
        const errJson = await response.json();
        errorBody = errJson;
        if (typeof errJson?.message === "string" && errJson.message.trim()) {
          message = errJson.message;
        }
      } catch {
        // body wasn't JSON — keep generic message
      }

      // Preserve Phase 1 rate-limit guard
      if (response.status === 429) {
        message = message !== `Request failed (429)`
          ? message
          : "Too many attempts. Please try again shortly.";
      }

      throw new ApiError(message, response.status, errorBody);
    }

    const blob = await response.blob();
    const contentType = blob.type || response.headers.get("content-type") || "application/octet-stream";

    // Extract filename from Content-Disposition if present
    const disposition = response.headers.get("content-disposition") || "";
    const fileName = resolveDownloadFileName(disposition, "", "");

    return { blob, fileName, contentType };
  }

  async deleteTaskAttachment(
    attachmentId: string
  ): Promise<{ status: string; message: string }> {
    return this.request(`/task-attachments/${attachmentId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async deleteTask(
    taskId: string
  ): Promise<{ status: string; message: string }> {
    return this.request(`/tasks/${taskId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async uploadTaskAttachments(
    taskId: string,
    files: File[]
  ): Promise<{ status: string; message: string; data: { task: Task } }> {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    return this.request(`/tasks/${taskId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(true),
      body: fd,
    });
  }

  async attachGoogleDriveFile(
    taskId: string,
    file: {
      fileId: string;
      name: string;
      mimeType?: string;
      webViewLink: string;
      thumbnailLink?: string | null;
    }
  ): Promise<TaskAttachment> {
    const response = await this.request<{ status: string; attachment: TaskAttachment; data?: { attachment: TaskAttachment } }>(
      `/tasks/${taskId}/attachments/google-drive`,
      {
        method: "POST",
        headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
        body: JSON.stringify(file),
      }
    );

    return response?.data?.attachment ?? response?.attachment ?? (response as any)?.attachment;
  }

  /* ============================
     DASHBOARDS
  ============================ */

  async getExecutiveDashboard(): Promise<{
    status: string;
    data: ExecutiveDashboard;
  }> {
    return this.request("/dashboard/executive", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getWorkspaceInsights(filters?: {
    teamId?: string;
    projectId?: string;
    status?: string;
    priority?: string;
  }): Promise<{ status: string; data: WorkspaceInsights }> {
    const query = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return this.request(`/dashboard/insights${query.toString() ? `?${query}` : ""}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getWorkspaceInsightsHistory(filters?: {
    teamId?: string;
    projectId?: string;
    status?: string;
    priority?: string;
    from?: string;
    to?: string;
  }): Promise<{ status: string; data: WorkspaceInsightsHistory }> {
    const query = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => { if (value) query.set(key, value); });
    return this.request(`/dashboard/insights/history${query.toString() ? `?${query}` : ""}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getOrganizationAuditEvents(filters?: { search?: string; category?: string; action?: string; actorId?: string; entityType?: string; projectId?: string; from?: string; to?: string; page?: number; limit?: number }): Promise<{ status: string; data: { events: OrganizationAuditEvent[]; pagination: { page: number; limit: number; total: number; totalPages: number } } }> {
    const query = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
    return this.request(`/audit-events${query.toString() ? `?${query}` : ""}`, { method: "GET", headers: this.getAuthHeaders() });
  }

  async getAutomations(): Promise<{ status: string; data: { automations: AutomationRule[] } }> {
    return this.request("/automations", { method: "GET", headers: this.getAuthHeaders() });
  }
  async createAutomation(input: Partial<AutomationRule>): Promise<{ status: string; data: { automation: AutomationRule } }> {
    return this.request("/automations", { method: "POST", headers: this.getAuthHeaders(), body: JSON.stringify(input) });
  }
  async updateAutomation(id: string, input: Partial<AutomationRule>): Promise<{ status: string; data: { automation: AutomationRule } }> {
    return this.request(`/automations/${encodeURIComponent(id)}`, { method: "PATCH", headers: this.getAuthHeaders(), body: JSON.stringify(input) });
  }
  async setAutomationEnabled(id: string, enabled: boolean): Promise<{ status: string; data: { automation: AutomationRule } }> {
    return this.request(`/automations/${encodeURIComponent(id)}/${enabled ? "enable" : "disable"}`, { method: "POST", headers: this.getAuthHeaders(), body: "{}" });
  }
  async archiveAutomation(id: string): Promise<{ status: string; data: { automation: AutomationRule } }> {
    return this.request(`/automations/${encodeURIComponent(id)}`, { method: "DELETE", headers: this.getAuthHeaders() });
  }
  async getAutomationExecutions(id: string, limit = 30): Promise<{ status: string; data: { executions: AutomationExecution[] } }> {
    return this.request(`/automations/${encodeURIComponent(id)}/executions?limit=${limit}`, { method: "GET", headers: this.getAuthHeaders() });
  }

  async getWorkspaceDeliveryInsights(filters?: {
    teamId?: string;
    projectId?: string;
    status?: string;
    priority?: string;
    from?: string;
    to?: string;
  }): Promise<{ status: string; data: WorkspaceDeliveryInsights }> {
    const query = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => { if (value) query.set(key, value); });
    return this.request(`/dashboard/insights/delivery${query.toString() ? `?${query}` : ""}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getTeamMemberDashboard(): Promise<{
    status: string;
    data: AssistantDashboard;
  }> {
    return this.request("/dashboard/team_member", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async createWorkspace(data: { name: string; industry?: string; size?: string; plan?: "free" | "team" }) {
    return this.request("/companies", {
      method: "POST",
      headers: this.getAuthHeaders(false),
      body: JSON.stringify(data),
    });
  }

  /* ============================
     TEAM MANAGEMENT (Workspace scoped)
  ============================ */

  // GET /team/team_members
  async getCompanyAssistants(): Promise<TeamAssistantsResponse> {
    const response = await this.request<TeamAssistantsResponse>("/team/team_members", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
    return normalizeCompanyAssistantsResponse(response);
  }

  async listTeams(workspaceId?: string): Promise<{ status: string; results: number; data: { teams: Team[] } }> {
    return this.request("/team/teams", {
      method: "GET",
      headers: workspaceId ? { ...this.getAuthHeaders(false), "x-company-id": workspaceId } : this.getAuthHeaders(),
    });
  }

  async getTeam(teamId: string): Promise<{ status: string; data: { team: Team } }> {
    return this.request(`/team/teams/${teamId}`, { method: "GET", headers: this.getAuthHeaders() });
  }

  async getTeamWorkspace(teamId: string): Promise<{ status: string; data: TeamWorkspaceResponse }> {
    return this.request(`/team/teams/${teamId}/workspace`, { method: "GET", headers: this.getAuthHeaders() });
  }

  async postTeamMessage(teamId: string, data: { content: string; parentMessageId?: string | null; mentionedUserIds?: string[] }): Promise<{ status: string; data: { message: TeamMessage } }> {
    return this.request(`/team/teams/${teamId}/messages`, { method: "POST", headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }

  async createTeam(data: { name: string; description?: string }): Promise<{ status: string; data: { team: Team } }> {
    return this.request("/team/teams", { method: "POST", headers: this.getAuthHeaders(), body: JSON.stringify(data) });
  }

  async updateTeam(teamId: string, data: { name?: string; description?: string | null }): Promise<{ status: string; data: { team: Team } }> {
    return this.request(`/team/teams/${teamId}`, { method: "PATCH", headers: this.getAuthHeaders(), body: JSON.stringify(data) });
  }

  async deleteTeam(teamId: string): Promise<{ status: string; message?: string }> {
    return this.request(`/team/teams/${teamId}`, { method: "DELETE", headers: this.getAuthHeaders() });
  }

  async addTeamMember(teamId: string, companyMemberId: string) {
    return this.request(`/team/teams/${teamId}/members`, { method: "POST", headers: this.getAuthHeaders(), body: JSON.stringify({ companyMemberId }) });
  }
  async addTeamMembers(teamId: string, companyMemberIds: string[]) {
    return this.request(`/team/teams/${teamId}/members/bulk`, { method: "POST", headers: this.getAuthHeaders(), body: JSON.stringify({ companyMemberIds }) });
  }
  async removeTeamMembers(teamId: string, companyMemberIds: string[]) {
    return this.request(`/team/teams/${teamId}/members/bulk`, { method: "DELETE", headers: this.getAuthHeaders(), body: JSON.stringify({ companyMemberIds }) });
  }

  async removeTeamMemberFromTeam(teamId: string, companyMemberId: string, data?: { replacementCompanyMemberId?: string; expectedCurrentLeadMemberId?: string; confirmTransfer?: boolean }) {
    return this.request(`/team/teams/${teamId}/members/${companyMemberId}`, { method: "DELETE", headers: this.getAuthHeaders(), body: JSON.stringify(data || {}) });
  }

  async assignTeamLead(teamId: string, companyMemberId: string, data?: { expectedCurrentLeadMemberId?: string; confirmTransfer?: boolean }): Promise<{ status: string; data: { teamId: string; previousLeadMemberId: string | null; leadMemberId: string } }> {
    return this.request(`/team/teams/${teamId}/lead`, { method: "PUT", headers: this.getAuthHeaders(), body: JSON.stringify({ companyMemberId, ...data }) });
  }

  // GET /team/members
  async getCompanyTeam(): Promise<{
    status: string;
    results: number;
    data: { members: CompanyMember[] };
  }> {
    return this.request("/team/members", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  // GET /team/pending-verifications
  async getPendingVerifications(): Promise<PendingVerificationsResponse> {
    return this.request("/team/pending-verifications", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  // PATCH /team/verify/:assistantId  (assistantId == USER ID)
  async verifyAssistant(userId: string): Promise<{ status: string; message: string }> {
    return this.request(`/team/verify/${userId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  // DELETE /team/reject/:assistantId  (assistantId == USER ID)
  async rejectAssistant(userId: string): Promise<{ status: string; message: string }> {
    return this.request(`/team/reject/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  // DELETE /team/remove/:userId
  async removeTeamMember(userId: string): Promise<{ status: string; message: string }> {
    return this.request(`/team/remove/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  // PATCH /team/restore/:userId
  async restoreTeamMember(userId: string): Promise<{ status: string; message: string }> {
    return this.request(`/team/restore/${userId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  // POST /team/invite
  async inviteAssistant(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    invitedRole: "team_member" | "manager" | "executive";
  }): Promise<{ status: string; message: string }> {
    return this.request("/team/invite", {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  /**
   * Helper: get a workspace member by USER ID
   * (Fixes your broken /users/:id dependency for team pages)
   */
  async getWorkspaceMemberByUserId(userId: string): Promise<CompanyMember> {
    const res = await this.getCompanyTeam();
    const member = res.data.members.find((m) => m.userId === userId);
    if (!member) throw new Error("User not found in this workspace.");
    return member;
  }

  /* ============================
    PROFILE
  ============================ */

  async updateUserProfile(updates: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    specialization?: string;
    experience?: number;
    hourlyRate?: number;
  }) {
    return this.request("/profile/update", {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  async uploadProfilePicture(file: File) {
    const form = new FormData();
    form.append("profilePicture", file);

    return this.request("/profile/upload-picture", {
      method: "POST",
      headers: this.getAuthHeaders(true), // no content-type
      body: form,
    });
  }

  /* ============================
    ADMIN MODULE
  ============================ */

  async getAdminSummary(): Promise<{
    status: string;
    data: {
      totalCompanies: number;
      activeCompanies: number;
      totalUsers: number;
      activeUsers: number;
      totalTasks: number;
      roleBreakdown: { role: string; count: number }[];
    };
  }> {
    return this.request("/admin/analytics/summary", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async getAdminUsers(): Promise<{
    status: string;
    results: number;
    data: { users: User[] };
  }> {
    return this.request("/admin/users", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async getAdminCompanies(): Promise<{
    status: string;
    results: number;
    data: { companies: Company[] };
  }> {
    return this.request("/admin/companies", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async getAdminTasks(): Promise<{
    status: string;
    results: number;
    data: { tasks: Task[] };
  }> {
    return this.request("/admin/tasks", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminGetUsers(filters?: {
    role?: string;
    status?: string;
    companyId?: string;
    search?: string;
  }): Promise<{
    status: string;
    results: number;
    data: { users: any[] };
  }> {
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.companyId) params.append("companyId", filters.companyId);
    if (filters?.search) params.append("search", filters.search);

    return this.request(`/admin/users?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminDeactivateUser(userId: string) {
    return this.request(`/admin/users/${userId}/deactivate`, {
      method: "PATCH",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminReactivateUser(userId: string) {
    return this.request(`/admin/users/${userId}/reactivate`, {
      method: "PATCH",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminDeleteUser(userId: string) {
    return this.request(`/admin/users/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminResetUserPassword(userId: string) {
    return this.request(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminGetCompanies(filters?: {
    search?: string;
    status?: string;
  }): Promise<{
    status: string;
    results: number;
    data: { companies: any[] };
  }> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.status) params.append("status", filters.status);

    return this.request(`/admin/companies?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async getActiveCompany(): Promise<{
    status: string;
    data: { company: Company; commercial?: { activeSeatCount: number; includedSeats: number; billableSeats: number; estimatedMonthlyChargeUsd: number; overFreeLimit: boolean; plan: "free" | "team" | "enterprise"; commercialStatus: string; planPersistenceAvailable: boolean } };
  }> {
    return this.request("/companies/active", {
      method: "GET",
      headers: this.getAuthHeaders(true),
    });
  }

  async updateActiveCompany(data: {
    name?: string;
    size?: string;
    industry?: string;
    bio?: string;
  }): Promise<{
    status: string;
    message: string;
    data: { company: Company };
  }> {
    return this.request("/companies/active", {
      method: "PATCH",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify(data),
    });
  }

  async adminVerifyCompany(companyId: string) {
    return this.request(`/admin/companies/${companyId}/verify`, {
      method: "PATCH",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminSuspendCompany(companyId: string) {
    return this.request(`/admin/companies/${companyId}/suspend`, {
      method: "PATCH",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminReactivateCompany(companyId: string) {
    return this.request(`/admin/companies/${companyId}/reactivate`, {
      method: "PATCH",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminGetCompany(companyId: string): Promise<{
    status: string;
    data: { company: any };
  }> {
    return this.request(`/admin/companies/${companyId}`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminGetTasks(filters?: {
    status?: string;
    priority?: string;
    companyId?: string;
    assigneeId?: string;
  }): Promise<{
    status: string;
    results: number;
    data: { tasks: Task[] };
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.companyId) params.append("companyId", filters.companyId);
    if (filters?.assigneeId) params.append("assigneeId", filters.assigneeId);

    return this.request(`/admin/tasks?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminReassignTask(taskId: string, assigneeId: string) {
    return this.request(`/admin/tasks/${taskId}/reassign`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(false), "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId }),
    });
  }

  async adminDeleteTask(taskId: string) {
    return this.request(`/admin/tasks/${taskId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminGetUserById(userId: string): Promise<{
    status: string;
    data: { user: any };
  }> {
    return this.request(`/admin/users/${userId}`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminGetSystemLogs() {
    return this.request("/admin/logs", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminSearch(keyword: string, type?: string): Promise<{
    status: string;
    data: {
      companies?: any[];
      users?: any[];
      tasks?: any[];
    };
  }> {
    const params = new URLSearchParams();
    params.append("keyword", keyword);
    if (type) params.append("type", type);

    return this.request(`/admin/search?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminGetDeletedUsers(): Promise<{
    status: string;
    results: number;
    data: { users: any[] };
  }> {
    return this.request("/admin/deleted/users", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminGetDeletedCompanies(): Promise<{
    status: string;
    results: number;
    data: { companies: any[] };
  }> {
    return this.request("/admin/deleted/companies", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  /* ============================
     ADMIN (Workspaces & Invites)
  ============================ */
  async adminGetSummaryKPIs() {
    return this.getAdminSummary();
  }

  async adminGetWorkspaces(filters?: { search?: string; status?: string }) {
    return this.adminGetCompanies(filters);
  }

  async adminGetWorkspaceDetails(companyId: string) {
    return this.adminGetCompany(companyId);
  }

  async adminGetWorkspaceMembers(companyId: string, filters?: { role?: string; status?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    return this.request(`/admin/companies/${companyId}/members?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminUpdateMemberRole(companyId: string, membershipId: string, role: string) {
    return this.request(`/admin/companies/${companyId}/members/${membershipId}/role`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(false), "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
  }

  async adminUpdateMemberStatus(companyId: string, membershipId: string, status: string) {
    return this.request(`/admin/companies/${companyId}/members/${membershipId}/status`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(false), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async adminGetInvitesGlobal(filters?: { workspaceId?: string; status?: string; search?: string }) {
    const params = new URLSearchParams();
    if (filters?.workspaceId) params.append("workspaceId", filters.workspaceId);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    return this.request(`/admin/invites?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminGetWorkspaceInvites(companyId: string, filters?: { status?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    return this.request(`/admin/companies/${companyId}/invites?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminRevokeInvite(inviteId: string) {
    return this.request(`/admin/invites/${inviteId}/revoke`, {
      method: "POST",
      headers: this.getAuthHeaders(false),
    });
  }

  async adminResendInvite(inviteId: string) {
    return this.request(`/admin/invites/${inviteId}/resend`, {
      method: "POST",
      headers: this.getAuthHeaders(false),
    });
  }

  async resendVerificationEmail(email: string): Promise<{
    status: string;
    message: string;
  }> {
    return this.request("/auth/resend-verification", {
      method: "POST",
      headers: { ...this.getAuthHeaders(false), "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }

  /* ============================
    TASK COMMENTS
  ============================ */

  async getTaskComments(
    taskId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{
    success: boolean;
    comments: TaskComment[];
    pagination?: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    const url = `/task-comments/task/${taskId}/comments${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    return this.request(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async addTaskComment(
    taskId: string,
    content: string,
    options?: { parentCommentId?: string | null; mentionedUserIds?: string[]; files?: File[]; connectedStorageAttachments?: Array<{ connectionId: string; providerItemId: string }> }
  ): Promise<{
    success: boolean;
    comment: TaskComment;
    involvedUsers: string[];
  }> {
    const files = options?.files || [];
    const body = new FormData();
    body.append("content", content);
    // Dropbox files chosen in the composer: only ids are sent; the server re-reads every detail from Dropbox.
    if (options?.connectedStorageAttachments?.length) body.append("connectedStorageAttachments", JSON.stringify(options.connectedStorageAttachments.map(({ connectionId, providerItemId }) => ({ connectionId, providerItemId }))));
    if (options?.parentCommentId) body.append("parentCommentId", options.parentCommentId);
    if (options?.mentionedUserIds?.length) body.append("mentionedUserIds", JSON.stringify(options.mentionedUserIds));
    files.forEach((file) => body.append("files", file));
    return this.request(`/task-comments/task/${taskId}/comments`, {
      method: "POST",
      headers: this.getAuthHeaders(true),
      body,
    });
  }

  async updateComment(
    commentId: string,
    content: string
  ): Promise<{
    success: boolean;
    comment: TaskComment;
  }> {
    return this.request(`/task-comments/${commentId}`, {
      method: "PUT",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(
    commentId: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/task-comments/${commentId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async getWebSocketToken(): Promise<{ token: string }> {
    return this.request("/auth/websocket-token", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async askSupportAI(question: string): Promise<{ status: string; data: { answer: string; uncertain: boolean; recommendHuman: boolean; reason?: string; guide?: { title: string; href: string } | null } }> {
    return this.request("/support/ai/respond", { method: "POST", headers: { ...this.getAuthHeaders(false), "Content-Type": "application/json" }, body: JSON.stringify({ question: question.slice(0, 2000) }) });
  }
  async getSupportAgentSession(): Promise<{ status: string; data: { signedUrl: string } }> { return this.request("/support/ai/elevenlabs-session", { method: "GET", headers: this.getAuthHeaders(false) }); }
  async searchSupportHelp(query: string): Promise<{ status: string; data: { results: Array<{ title: string; href: string; excerpt: string }> } }> { return this.request(`/support/help/search?q=${encodeURIComponent(query.slice(0, 120))}`, { method: "GET", headers: this.getAuthHeaders(false) }); }
  async createSupportTicket(data: { subject: string; category: string; message: string; confirmed: true; context?: Record<string, unknown>; aiEscalated?: boolean; aiSummary?: string; transcript?: Array<{ role: string; content: string }>; attachments?: File[] }): Promise<{ status: string; data: { ticket: SupportTicket } }> {
    const body = new FormData();
    for (const [key, value] of Object.entries({ subject: data.subject, category: data.category, message: data.message, confirmed: "true", context: JSON.stringify(data.context || {}), aiEscalated: String(data.aiEscalated === true), aiSummary: data.aiSummary || "", transcript: JSON.stringify(data.transcript || []) })) body.append(key, value);
    data.attachments?.forEach((file) => body.append("attachments", file));
    return this.request("/support/tickets", { method: "POST", headers: this.getAuthHeaders(true), body });
  }
  async listSupportTickets(): Promise<{ status: string; data: { tickets: SupportTicket[] } }> { return this.request("/support/tickets", { method: "GET", headers: this.getAuthHeaders(false) }); }
  async getSupportTicket(ticketId: string): Promise<{ status: string; data: { ticket: SupportTicket } }> { return this.request(`/support/tickets/${encodeURIComponent(ticketId)}`, { method: "GET", headers: this.getAuthHeaders(false) }); }
  async replySupportTicket(ticketId: string, message: string, attachments: File[] = []): Promise<{ status: string; data: { message: SupportMessage; ticket: SupportTicket } }> {
    const body = new FormData(); body.append("message", message); attachments.forEach((file) => body.append("attachments", file));
    return this.request(`/support/tickets/${encodeURIComponent(ticketId)}/messages`, { method: "POST", headers: this.getAuthHeaders(false), body });
  }
  async downloadSupportAttachment(downloadUrl: string, fileName: string): Promise<void> {
    if (!downloadUrl.startsWith("/api/v1/support/tickets/")) throw new Error("Invalid support attachment path.");
    const path = downloadUrl.replace(/^\/api\/v1/, "");
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: this.getAuthHeaders(false) });
    if (!response.ok) throw new Error("Attachment could not be downloaded.");
    triggerBlobDownload(await response.blob(), fileName);
  }

  /* ============================
    ASSISTANCE REQUESTS
  ============================ */

  async createAssistanceRequest(
    data: CreateAssistanceRequestData
  ): Promise<{
    status: string;
    message: string;
    data: { assistanceRequest: AssistanceRequest };
  }> {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("category", data.category);

    if (data.priority) formData.append("priority", data.priority);
    if (data.deadline) formData.append("deadline", data.deadline);
    if (data.estimatedHours !== undefined)
      formData.append("estimatedHours", String(data.estimatedHours));

    if (data.attachments?.length) {
      data.attachments.forEach((file) => formData.append("attachments", file));
    }

    return this.request("/assistance", {
      method: "POST",
      headers: this.getAuthHeaders(true),
      body: formData,
    });
  }

  async getMyAssistanceRequests(filters?: {
    status?: AssistanceRequestStatus;
    search?: string;
    sort?: string;
    order?: "ASC" | "DESC";
  }): Promise<{
    status: string;
    results: number;
    data: { requests: AssistanceRequest[] };
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.sort) params.append("sort", filters.sort);
    if (filters?.order) params.append("order", filters.order);

    return this.request(`/assistance/my-requests?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getAssistanceRequestDetails(
    requestId: string
  ): Promise<{
    status: string;
    data: { request: AssistanceRequest };
  }> {
    return this.request(`/assistance/${requestId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async cancelAssistanceRequest(
    requestId: string
  ): Promise<{
    status: string;
    message: string;
  }> {
    return this.request(`/assistance/${requestId}/cancel`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async getAllAssistanceRequests(filters?: {
    status?: AssistanceRequestStatus;
    priority?: AssistanceRequestPriority;
    companyId?: string;
    search?: string;
    sort?: string;
    order?: "ASC" | "DESC";
  }): Promise<{
    status: string;
    results: number;
    data: { requests: AssistanceRequest[] };
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.companyId) params.append("companyId", filters.companyId);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.sort) params.append("sort", filters.sort);
    if (filters?.order) params.append("order", filters.order);

    return this.request(`/assistance/admin/all-requests?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async updateAssistanceRequest(
    requestId: string,
    data: UpdateAssistanceRequestData
  ): Promise<{
    status: string;
    message: string;
    data: { request: AssistanceRequest };
  }> {
    return this.request(`/assistance/admin/${requestId}`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async convertAssistanceRequestToTask(
    requestId: string,
    data?: ConvertToTaskData
  ): Promise<{
    status: string;
    message: string;
    data: {
      task: Task;
      request: { id: string; taskId: string };
    };
  }> {
    return this.request(`/assistance/admin/${requestId}/convert-to-task`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async getAssistanceRequestStats(): Promise<{
    status: string;
    data: { stats: AssistanceRequestStats };
  }> {
    return this.request("/assistance/stats/overview", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async estimateAssistanceCost(
    estimatedHours: number,
    hourlyRate?: number
  ): Promise<{
    status: string;
    data: { calculation: CostEstimation };
  }> {
    const params = new URLSearchParams();
    params.append("estimatedHours", String(estimatedHours));
    if (hourlyRate !== undefined) params.append("hourlyRate", String(hourlyRate));

    return this.request(`/assistance/estimate-cost?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

/* ============================
   HARMONY
============================ */

async getHarmonyAssessment(): Promise<{
  status: string;
  data: {
    assessment: HarmonyAssessmentDefinition;
  };
}> {
  return this.request("/harmony/assessment", {
    method: "GET",
    headers: this.getAuthHeaders(false),
  });
}

async submitHarmonyAssessment(
  answers: HarmonyAssessmentAnswer[]
): Promise<{
  status: string;
  message?: string;
  data: {
    submissionId: string;
    profile: HarmonyProfile;
  };
}> {
  return this.request("/harmony/submissions", {
    method: "POST",
    headers: {
      ...this.getAuthHeaders(false),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answers }),
  });
}

async getMyHarmonyProfile(): Promise<{
  status: string;
  data: {
    profile: HarmonyProfile | null;
  };
}> {
  return this.request("/harmony/me/profile", {
    method: "GET",
    headers: this.getAuthHeaders(false),
  });
}

async getMyHarmonySubmissions(): Promise<{
  status: string;
  data: {
    submissions: any[];
  };
}> {
  return this.request("/harmony/me/submissions", {
    method: "GET",
    headers: this.getAuthHeaders(false),
  });
}

async getHarmonyScoreboard(): Promise<{
  status: string;
  data: HarmonyScoreboardData;
}> {
  return this.request("/harmony/scoreboard", {
    method: "GET",
    headers: this.getAuthHeaders(true),
  });
}

async compareHarmonyWithMember(userId: string): Promise<{
  status: string;
  data: {
    userA: {
      user: any;
      archetype: string;
      dimensionBands: Record<HarmonyDimensionKey, string>;
    };
    userB: {
      user: any;
      archetype: string;
      dimensionBands: Record<HarmonyDimensionKey, string>;
    };
    comparison: {
      compatibilityScore: number;
      interpretation: string;
      dimensionComparisons: HarmonyPairDimensionComparison[];
    };
  };
}> {
  return this.request(`/harmony/compatibility/${userId}`, {
    method: "GET",
    headers: this.getAuthHeaders(true),
  });
}

async getHarmonyAiSummaryMe(force?: boolean): Promise<HarmonyAiReportResponse> {
  const queryParams = new URLSearchParams();
  if (force) queryParams.append("force", "true");
  const query = queryParams.toString();
  
  return this.request(`/harmony/ai-summary/me${query ? `?${query}` : ""}`, {
    method: "GET",
    headers: this.getAuthHeaders(false), // NO x-company-id
  });
}

async getHarmonyAiSummaryTeam(force?: boolean): Promise<HarmonyAiReportResponse> {
    const queryParams = new URLSearchParams();
    if (force) queryParams.append("force", "true");
    const query = queryParams.toString();
    
    return this.request(`/harmony/ai-summary/team${query ? `?${query}` : ""}`, {
      method: "GET",
      headers: this.getAuthHeaders(true), // YES x-company-id
    });
  }

  async getOnboardingStatus(): Promise<OnboardingStatusResponse> {
    return this.request("/profile/onboarding-status", {
      method: "GET",
      headers: this.getAuthHeaders(false), // NO x-company-id
    });
  }

  async updateOnboarding(payload: UpdateOnboardingPayload): Promise<UpdateOnboardingResponse> {
    return this.request("/profile/onboarding", {
      method: "PATCH",
      headers: this.getAuthHeaders(false), // NO x-company-id
      body: JSON.stringify(payload),
    });
  }



  /* ============================
     NOTIFICATIONS
  ============================ */

  async getNotifications(params?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationsListResponse> {
    const search = new URLSearchParams();
    if (params?.unreadOnly !== undefined) {
      search.append("unreadOnly", String(params.unreadOnly));
    }
    if (params?.limit !== undefined) search.append("limit", String(params.limit));
    if (params?.offset !== undefined) search.append("offset", String(params.offset));
    const q = search.toString();
    return this.request(`/notifications${q ? `?${q}` : ""}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getWorkspaceNotificationDeliveryStatus(): Promise<{ status: string; data: NotificationDeliveryMetrics }> {
    return this.request("/notifications/delivery-status", { method: "GET", headers: this.getAuthHeaders() });
  }

  async processWorkspaceNotificationDeliveries(): Promise<{ status: string; data: { summary: NotificationDeliverySummary } }> {
    return this.request("/notifications/process-deliveries", { method: "POST", headers: this.getAuthHeaders(), body: JSON.stringify({ limit: 50 }) });
  }

  async getUnreadNotificationsCount(): Promise<{
    status: string;
    data: { count: number };
  }> {
    return this.request(`/notifications/unread-count`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async markNotificationRead(id: string): Promise<{
    status: string;
    message?: string;
    data?: { notification: Notification };
  }> {
    return this.request(`/notifications/${id}/read`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async markAllNotificationsRead(): Promise<{
    status: string;
    message?: string;
    data?: { updated: number };
  }> {
    return this.request(`/notifications/read-all`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async deleteNotification(id: string): Promise<{
    status: string;
    message?: string;
  }> {
    return this.request(`/notifications/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
    return this.request("/notification-preferences", { method: "GET", headers: this.getAuthHeaders(false) });
  }

  async updateNotificationPreferences(preferences: Array<Partial<NotificationPreference> & Pick<NotificationPreference, "category">>): Promise<NotificationPreferencesResponse> {
    return this.request("/notification-preferences", { method: "PATCH", headers: this.getAuthHeaders(false), body: JSON.stringify({ preferences }) });
  }

  /* ============================
     INVITES (Workspace tokens)
  ============================ */

  async createWorkspaceInvite(
    companyId: string,
    payload: { email: string; role: "owner" | "admin" | "manager" | "member" }
  ): Promise<{ status: string; message: string; data?: any }> {
    return this.request(`/companies/${companyId}/invites`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async getWorkspaceSettings(
    companyId: string
  ): Promise<GetWorkspaceSettingsResponse> {
    return this.request(`/company/${companyId}/settings`, {
      method: "GET",
      headers: this.getAuthHeaders(true),
    });
  }

  async updateWorkspaceSettings(
    companyId: string,
    settings: Partial<WorkspaceSettings>
  ): Promise<GetWorkspaceSettingsResponse & { message?: string }> {
    return this.request(`/company/${companyId}/settings`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  }

  async getWorkspaceCommercial(): Promise<{ status: string; data: WorkspaceCommercialOverview }> {
    return this.request("/workspace/commercial", { method: "GET", headers: this.getAuthHeaders(true) });
  }

  async getWorkspaceSeatImpact(additional = 1): Promise<{ status: string; data: WorkspaceSeatImpact }> {
    return this.request(`/workspace/commercial/seat-impact?additional=${encodeURIComponent(String(additional))}`, { method: "GET", headers: this.getAuthHeaders(true) });
  }

  async getWorkspaceGovernance(): Promise<WorkspaceGovernanceResponse> {
    return this.request("/workspace/governance", { method: "GET", headers: this.getAuthHeaders(true) });
  }

  async getWorkspaceGovernanceCapabilities(): Promise<WorkspaceGovernanceCapabilities> {
    return this.request("/workspace/governance/capabilities", { method: "GET", headers: this.getAuthHeaders(true) });
  }

  async updateWorkspaceGovernance(settings: Partial<WorkspaceGovernanceSettings>): Promise<WorkspaceGovernanceResponse> {
    return this.request("/workspace/governance", { method: "PATCH", headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" }, body: JSON.stringify(settings) });
  }

  async updateWorkspaceMemberRole(
    userId: string,
    payload: UpdateWorkspaceMemberRolePayload
  ): Promise<{
    status: string;
    message?: string;
    data?: { member?: CompanyMember };
  }> {
    return this.request(`/team/members/${userId}/role`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async acceptInvite(token: string): Promise<{ status: string; message?: string; data?: any }> {
    return this.request(`/invites/${token}/accept`, {
      method: "POST",
      headers: this.getAuthHeaders(false),
    });
  }

  async rejectInvite(token: string): Promise<{ status: string; message?: string; data?: any }> {
    return this.request(`/invites/${token}/reject`, {
      method: "POST",
      headers: this.getAuthHeaders(false),
    });
  }

  /* ============================
     DASHBOARD (workspace-scoped)
  ============================ */
  async getDashboard(): Promise<{
    status: string;
    data: any;
  }> {
    return this.request("/dashboard", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  /* ============================
     TEAM MEMBERS (workspace-scoped)
  ============================ */
  async getWorkspaceMember(userId: string): Promise<{
    status: string;
    data: { member: CompanyMember };
  }> {
    return this.request(`/team/members/${userId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async createProject(data: {
    name: string;
    description?: string;
    visibility?: "private" | "workspace";
    leadId?: string;
    color?: string;
    dueDate?: string;
    memberIds?: string[];
    teamId?: string | null;
  }): Promise<{ status: string; message?: string; data: { project: Project } }> {
    return this.request(`/projects`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async getProjects(filters?: { teamId?: string; workspaceId?: string; customFieldColumns?: string[]; search?: string }): Promise<{
    status: string;
    results?: number;
    data: { projects: Project[] } | { items?: Project[] } | any;
  }> {
    const params = new URLSearchParams();
    if (filters?.teamId) params.set("teamId", filters.teamId);
    if (filters?.search) params.set("search", filters.search.slice(0, 100));
    if (filters?.customFieldColumns?.length) params.set("customFieldColumns", JSON.stringify(filters.customFieldColumns.slice(0, 3)));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/projects${query}`, {
      method: "GET",
      headers: filters?.workspaceId
        ? { ...this.getAuthHeaders(false), "x-company-id": filters.workspaceId }
        : this.getAuthHeaders(),
    });
  }

  async getProjectById(id: string, workspaceId?: string | null): Promise<{
    status: string;
    data: { project: Project } | any;
  }> {
    const headers = this.getAuthHeaders();
    if (workspaceId) (headers as any)["x-company-id"] = workspaceId;
    return this.request(`/projects/${id}`, {
      method: "GET",
      headers,
    });
  }

  async updateProject(id: string, data: Partial<{
    name: string;
    description: string;
    visibility: "private" | "workspace";
    status: ProjectStatus;
    leadId?: string | null;
    color?: string | null;
    dueDate?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    settings?: Record<string, any> | null;
    teamId?: string | null;
  }>): Promise<{ status: string; message?: string; data: { project: Project } | any }> {
    return this.request(`/projects/${id}`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<{ status: string; message?: string }> {
    return this.request(`/projects/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async addProjectMembers(projectId: string, emails: string[], defaultRole: "owner" | "admin" | "member" | "viewer" = "member"): Promise<{ status: string; message?: string; data?: any }> {
    return this.request(`/projects/${projectId}/members`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ emails, defaultRole }),
    });
  }

  async removeProjectMember(projectId: string, userId: string): Promise<{ status: string; message?: string }> {
    return this.request(`/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async addProjectMemberDirect(projectId: string, userId: string, role: "owner" | "admin" | "member" | "viewer" = "member"): Promise<{ status: string; message?: string; data?: any }> {
    return this.request(`/projects/${projectId}/members/direct`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
  }

  async updateProjectMemberRole(projectId: string, userId: string, role: "owner" | "admin" | "member" | "viewer"): Promise<{ status: string; message?: string; data?: any }> {
    return this.request(`/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
  }

  async attachTaskToProject(projectId: string, taskId: string): Promise<{ status: string; message?: string }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });
  }

  async detachTaskFromProject(projectId: string, taskId: string): Promise<{ status: string; message?: string }> {
    return this.request(`/projects/${projectId}/tasks/${taskId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async inviteMembersByEmail(projectId: string, emails: string[], defaultRole: "owner" | "admin" | "member" | "viewer" = "member"): Promise<{ status: string; message?: string; data?: any }> {
    return this.request(`/projects/${projectId}/members/emails`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ emails, defaultRole }),
    });
  }

  async getProjectCandidates(projectId: string, includeExternal?: boolean): Promise<{ status: string; data: { candidates: any[] } | any }> {
    const params = new URLSearchParams();
    if (includeExternal) params.append("includeExternal", "1");
    return this.request(`/projects/${projectId}/candidates?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async acceptProjectInvite(token: string): Promise<{ status: string; message?: string; data?: any }> {
    return this.request(`/projects/invites/${token}/accept`, {
      method: "POST",
      headers: this.getAuthHeaders(false),
    });
  }

  async rejectProjectInvite(token: string): Promise<{ status: string; message?: string; data?: any }> {
    return this.request(`/projects/invites/${token}/reject`, {
      method: "POST",
      headers: this.getAuthHeaders(false),
    });
  }

  async listWorkspaceFolders(): Promise<{ status: string; data: { folders: Folder[] } | any }> {
    return this.request(`/drive/folders`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async createWorkspaceFolder(data: { name: string; description?: string; parentId?: string | null }): Promise<{ status: string; message?: string; data: { folder: Folder } }> {
    return this.request(`/drive/folders`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async listPersonalFolders(): Promise<{ status: string; data: { folders: Folder[] } | any }> {
    return this.request(`/drive/personal/folders`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async createPersonalFolder(data: { name: string; description?: string; parentId?: string | null }): Promise<{ status: string; message?: string; data: { folder: Folder } }> {
    return this.request(`/drive/personal/folders`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(false), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async listFilesInFolder(folderId: string): Promise<{ status: string; data: { files: FolderFile[] } | any }> {
    return this.request(`/drive/folders/${folderId}/files`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async uploadFilesToFolder(folderId: string, files: File[]): Promise<{ status: string; message?: string; data?: any }> {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return this.request(`/drive/folders/${folderId}/files`, {
      method: "POST",
      headers: this.getAuthHeaders(true),
      body: form,
    });
  }

  async deleteFile(fileId: string): Promise<{ status: string; message?: string }> {
    return this.request(`/drive/files/${fileId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async deleteFolder(folderId: string): Promise<{ status: string; message?: string }> {
    return this.request(`/drive/folders/${folderId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async getProjectMembers(projectId: string): Promise<{
    status: string;
    data: { members: Array<{ id: string; role: string; status: string; firstName: string; lastName: string; email: string }>; invites: ProjectInvite[] };
  }> {
    return this.request(`/projects/${projectId}/members`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async revokeProjectInvite(projectId: string, inviteId: string): Promise<{ status: string; message?: string }> {
    return this.request(`/projects/${projectId}/invites/${inviteId}/revoke`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async resendProjectInvite(projectId: string, inviteId: string): Promise<{ status: string; message?: string }> {
    return this.request(`/projects/${projectId}/invites/${inviteId}/resend`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  /* ============================
     PROJECT MODULE EXTENSIONS
  ============================ */

  async uploadProjectLogo(projectId: string, file: File): Promise<{ status: string; message: string; data: { logoUrl: string } }> {
    const form = new FormData();
    form.append("logo", file);
    return this.request(`/projects/${projectId}/logo`, {
      method: "POST",
      headers: this.getAuthHeaders(true),
      body: form,
    });
  }

  async deleteProjectLogo(projectId: string): Promise<{ status: string; message: string }> {
    return this.request(`/projects/${projectId}/logo`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async getProjectTasks(projectId: string): Promise<{ status: string; results: number; data: { tasks: Task[] } | Task[] | any }> {
    return this.request(`/projects/${projectId}/tasks`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async createProjectTask(projectId: string, data: CreateTaskData | FormData): Promise<{ status: string; data: { task: Task } | Task | any }> {
    const isFormData = data instanceof FormData;
    const headers: HeadersInit = isFormData
      ? this.getAuthHeaders(true)
      : { ...this.getAuthHeaders(true), "Content-Type": "application/json" };

    return this.request(`/projects/${projectId}/tasks`, {
      method: "POST",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  async updateProjectSettings(projectId: string, settings: Record<string, any>): Promise<{ status: string; data: { project: Project } }> {
    return this.request(`/projects/${projectId}/settings`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
  }

  async getProjectChecklists(projectId: string): Promise<{ status: string; data: { checklists: ProjectChecklist[] } | ProjectChecklist[] | any }> {
    return this.request(`/projects/${projectId}/checklists`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async createProjectChecklist(projectId: string, title: string): Promise<{ status: string; data: { checklist: ProjectChecklist } | ProjectChecklist | any }> {
    return this.request(`/projects/${projectId}/checklists`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async updateProjectChecklist(projectId: string, checklistId: string, title: string): Promise<{ status: string; data: { checklist: ProjectChecklist } }> {
    return this.request(`/projects/${projectId}/checklists/${checklistId}`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async deleteProjectChecklist(projectId: string, checklistId: string): Promise<{ status: string; message: string }> {
    return this.request(`/projects/${projectId}/checklists/${checklistId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async createChecklistItem(projectId: string, checklistId: string, title: string, sortOrder?: number): Promise<{ status: string; data: { item: ChecklistItem } }> {
    return this.request(`/projects/${projectId}/checklists/${checklistId}/items`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify({ title, sortOrder }),
    });
  }

  async updateChecklistItem(projectId: string, checklistId: string, itemId: string, data: Partial<{ title: string; isCompleted: boolean; sortOrder: number }>): Promise<{ status: string; data: { item: ChecklistItem } }> {
    return this.request(`/projects/${projectId}/checklists/${checklistId}/items/${itemId}`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async deleteChecklistItem(projectId: string, checklistId: string, itemId: string): Promise<{ status: string; message: string }> {
    return this.request(`/projects/${projectId}/checklists/${checklistId}/items/${itemId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  /* ============================
     ACCESS REQUESTS
  ============================ */
  async createAccessRequest(data: {
    permissionKey: WorkspaceRolePermissionKey;
    reason?: string;
  }): Promise<{
    status: string;
    message?: string;
    data?: { request: WorkspaceAccessRequest };
  }> {
    return this.request("/access-requests", {
      method: "POST",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify(data),
    });
  }
  
  async listAccessRequests(filters?: {
    status?: "pending" | "approved" | "denied" | string;
  }): Promise<{
    status: string;
    results?: number;
    data: { requests: WorkspaceAccessRequest[] };
  }> {
    const params = new URLSearchParams();
  
    if (filters?.status) {
      params.append("status", filters.status);
    }
  
    return this.request(
      `/access-requests${params.toString() ? `?${params.toString()}` : ""}`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );
  }
  
  async decideAccessRequest(
    id: string,
    data: { action: "approve" | "deny" }
  ): Promise<{
    status: string;
    message?: string;
    data?: { request: WorkspaceAccessRequest };
  }> {
    return this.request(`/access-requests/${id}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify(data),
    });
  }

  async listWorkspaceJoinRequests(): Promise<{ status: string; data: { requests: WorkspaceJoinRequest[] } }> {
    return this.request("/companies/join/requests", { method: "GET", headers: this.getAuthHeaders() });
  }

  async decideWorkspaceJoinRequest(id: string, action: "approve" | "reject"): Promise<{ status: string; message?: string }> {
    return this.request(`/companies/join/requests/${id}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify({ action }),
    });
  }


  async getMyEffectiveWorkspacePermissions(): Promise<EffectiveWorkspacePermissionsResponse> {
    return this.request("/access-requests/me/effective-permissions", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  /* ============================
    PROFESSIONAL / CV PROFILE
  ============================ */

  async getMyProfessionalProfile(): Promise<{ status: string; data: ProfessionalProfileBundle }> {
    return this.request("/profile/me", { method: "GET", headers: this.getAuthHeaders(false) });
  }

  async updateMyProfessionalProfile(payload: Partial<ProfessionalProfileDetails>) {
    return this.request("/profile/me", { method: "PUT", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }

  async createEducation(payload: Partial<EducationItem>) {
    return this.request("/profile/me/education", { method: "POST", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async updateEducation(id: string, payload: Partial<EducationItem>) {
    return this.request(`/profile/me/education/${id}`, { method: "PUT", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async deleteEducation(id: string) {
    return this.request(`/profile/me/education/${id}`, { method: "DELETE", headers: this.getAuthHeaders(false) });
  }

  async createWorkExperience(payload: Partial<WorkExperienceItem>) {
    return this.request("/profile/me/work-experience", { method: "POST", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async updateWorkExperience(id: string, payload: Partial<WorkExperienceItem>) {
    return this.request(`/profile/me/work-experience/${id}`, { method: "PUT", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async deleteWorkExperience(id: string) {
    return this.request(`/profile/me/work-experience/${id}`, { method: "DELETE", headers: this.getAuthHeaders(false) });
  }

  async createSkill(payload: Partial<SkillItem>) {
    return this.request("/profile/me/skills", { method: "POST", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async updateSkill(id: string, payload: Partial<SkillItem>) {
    return this.request(`/profile/me/skills/${id}`, { method: "PUT", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async deleteSkill(id: string) {
    return this.request(`/profile/me/skills/${id}`, { method: "DELETE", headers: this.getAuthHeaders(false) });
  }

  async createCertification(payload: Partial<CertificationItem>) {
    return this.request("/profile/me/certifications", { method: "POST", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async updateCertification(id: string, payload: Partial<CertificationItem>) {
    return this.request(`/profile/me/certifications/${id}`, { method: "PUT", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async deleteCertification(id: string) {
    return this.request(`/profile/me/certifications/${id}`, { method: "DELETE", headers: this.getAuthHeaders(false) });
  }

  async createProfileProject(payload: Partial<ProfileProjectItem>) {
    return this.request("/profile/me/projects", { method: "POST", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async updateProfileProject(id: string, payload: Partial<ProfileProjectItem>) {
    return this.request(`/profile/me/projects/${id}`, { method: "PUT", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async deleteProfileProject(id: string) {
    return this.request(`/profile/me/projects/${id}`, { method: "DELETE", headers: this.getAuthHeaders(false) });
  }

  async createLanguage(payload: Partial<LanguageItem>) {
    return this.request("/profile/me/languages", { method: "POST", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async updateLanguage(id: string, payload: Partial<LanguageItem>) {
    return this.request(`/profile/me/languages/${id}`, { method: "PUT", headers: this.getAuthHeaders(false), body: JSON.stringify(payload) });
  }
  async deleteLanguage(id: string) {
    return this.request(`/profile/me/languages/${id}`, { method: "DELETE", headers: this.getAuthHeaders(false) });
  }

  async downloadMyCv(filename = "CV.pdf"): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/profile/me/cv.pdf`, { headers: this.getAuthHeaders(false) });
    if (!res.ok) throw new Error("Failed to download CV");
    triggerBlobDownload(await res.blob(), filename);
  }

  async getUserProfessionalProfile(userId: string): Promise<{ status: string; data: ProfessionalProfileBundle }> {
    return this.request(`/profile/users/${userId}`, { method: "GET", headers: this.getAuthHeaders(false) });
  }

  async downloadUserCv(userId: string, filename = "CV.pdf"): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/profile/users/${userId}/cv.pdf`, { headers: this.getAuthHeaders(false) });
    if (!res.ok) throw new Error("Failed to download CV");
    triggerBlobDownload(await res.blob(), filename);
  }

  /* ============================
     CLIENT VIEW / RESOURCE ACCESS
  ============================ */

  async createClientViewShareLink(payload: {
    resourceType: ClientViewResourceType;
    resourceId: string;
    visibilityLevel?: "summary" | "detailed";
    expiresAt?: string | null;
  }): Promise<{ status: string; data: { shareLink: ClientViewShareLink } }> {
    return this.request("/client-view/share-links", {
      method: "POST",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify({
        visibilityLevel: "summary",
        ...payload,
      }),
    });
  }

  async getPublicClientView(
    token: string
  ): Promise<{ status: string; data: ClientViewPayload }> {
    const url = `${API_BASE_URL}/client-view/share/${encodeURIComponent(token)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    let result: any = {};
    try {
      result = await response.json();
    } catch {}
    if (!response.ok) {
      throw new Error(result?.message || "Unable to load client view");
    }
    return result;
  }

  async createResourceAccessRequest(payload: {
    token: string;
    reason?: string;
  }): Promise<{ status: string; data: { request: ResourceAccessRequest } }> {
    return this.request("/client-view/resource-access-requests", {
      method: "POST",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
  }

  async getResourceAccessRequests(params: {
    status?: "pending" | "approved" | "denied" | "revoked";
    resourceType?: ClientViewResourceType;
    resourceId?: string;
  } = {}): Promise<{ status: string; data: { requests: ResourceAccessRequest[] } }> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.resourceType) qs.set("resourceType", params.resourceType);
    if (params.resourceId) qs.set("resourceId", params.resourceId);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/client-view/resource-access-requests${suffix}`, {
      method: "GET",
      headers: this.getAuthHeaders(true),
    });
  }

  async getMyResourceAccessRequests(): Promise<{
    status: string;
    data: { requests: ResourceAccessRequest[] };
  }> {
    return this.request("/client-view/resource-access-requests/me", {
      method: "GET",
      headers: this.getAuthHeaders(true),
    });
  }

  async getSharedWithMe(): Promise<{ status: string; data: { resources: Array<{ id: string; resourceType: ClientViewResourceType; resourceId: string; companyId: string; accessLevel: ClientAccessLevel; capabilities?: ClientAccessCapabilities; grantedAt?: string | null; title: string }> } }> {
    return this.request("/client-view/shared-with-me", { method: "GET", headers: this.getAuthHeaders(true) });
  }

  async getAuthenticatedSharedResource(resourceType: ClientViewResourceType, resourceId: string): Promise<{ status: string; data: ClientViewPayload & { accessLevel: ClientAccessLevel; capabilities: ClientAccessCapabilities } }> {
    return this.request(`/client-view/shared/${resourceType}/${resourceId}`, { method: "GET", headers: this.getAuthHeaders(true) });
  }

  async decideResourceAccessRequest(
    requestId: string,
    status: "approved" | "denied",
    accessLevel?: ClientAccessLevel
  ): Promise<{ status: string; data: { request: ResourceAccessRequest } }> {
    return this.request(`/client-view/resource-access-requests/${requestId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify(accessLevel ? { status, accessLevel } : { status }),
    });
  }

  async updateResourceAccessLevel(requestId: string, accessLevel: ClientAccessLevel): Promise<{ status: string; data: { request: ResourceAccessRequest } }> {
    return this.request(`/client-view/resource-access-requests/${requestId}/access-level`, {
      method: "PATCH",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify({ accessLevel }),
    });
  }

  async getSharedTaskComments(resourceType: ClientViewResourceType, resourceId: string, taskId: string): Promise<{ status: string; data: { comments: SharedTaskComment[] } }> {
    return this.request(`/client-view/shared/${resourceType}/${resourceId}/tasks/${taskId}/comments`, { method: "GET", headers: this.getAuthHeaders(true) });
  }

  async addSharedTaskComment(resourceType: ClientViewResourceType, resourceId: string, taskId: string, payload: { content: string; parentCommentId?: string }): Promise<{ status: string; data: { comment: SharedTaskComment } }> {
    return this.request(`/client-view/shared/${resourceType}/${resourceId}/tasks/${taskId}/comments`, {
      method: "POST",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
  }

  async updateSharedTaskStatus(resourceType: ClientViewResourceType, resourceId: string, taskId: string, status: string): Promise<{ status: string; data: { task: { id: string; status: string } } }> {
    return this.request(`/client-view/shared/${resourceType}/${resourceId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify({ status }),
    });
  }

  async revokeResourceAccess(requestId: string): Promise<{ status: string; data: { request: ResourceAccessRequest } }> {
    return this.request(`/client-view/resource-access-requests/${requestId}/revoke`, {
      method: "PATCH",
      headers: this.getAuthHeaders(true),
    });
  }

  async getProjectHealth(): Promise<{
    status: string;
    data: {
      summary: ProjectHealthSummary;
      projects: ProjectHealthProject[];
    };
  }> {
    return this.request("/project-health", {
      method: "GET",
      headers: this.getAuthHeaders(true),
    });
  }

  async getWorkload(): Promise<{ status: string; data: WorkloadResponse }> {
    return this.request("/workload", {
      method: "GET",
      headers: this.getAuthHeaders(true),
    });
  }

  private timeTrackingQuery(filters: TimeTrackingFilters = {}): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
    const query = params.toString();
    return query ? `?${query}` : "";
  }
  async getActiveTimeTimer(): Promise<{ status: string; data: { timer: TimeEntry | null } }> {
    return this.request("/time-tracking/timer/active", { method: "GET", headers: this.getAuthHeaders(true) });
  }
  async startTimeTimer(input: { taskId: string; note?: string; billable?: boolean }): Promise<{ status: string; data: { entry: TimeEntry } }> {
    return this.request("/time-tracking/timer/start", { method: "POST", headers: this.getAuthHeaders(true), body: JSON.stringify(input) });
  }
  async stopTimeTimer(id?: string): Promise<{ status: string; data: { entry: TimeEntry } }> {
    return this.request(`/time-tracking/timer/stop${id ? `/${encodeURIComponent(id)}` : ""}`, { method: "POST", headers: this.getAuthHeaders(true) });
  }
  async cancelTimeTimer(): Promise<{ status: string; data: { cancelled: boolean } }> {
    return this.request("/time-tracking/timer/cancel", { method: "POST", headers: this.getAuthHeaders(true) });
  }
  async getTimeEntries(filters: TimeTrackingFilters = {}): Promise<{ status: string; data: { entries: TimeEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number }; visibility: string } }> {
    return this.request(`/time-tracking/entries${this.timeTrackingQuery(filters)}`, { method: "GET", headers: this.getAuthHeaders(true) });
  }
  async createManualTimeEntry(input: { taskId: string; date: string; durationSeconds: number; note?: string; billable?: boolean }): Promise<{ status: string; data: { entry: TimeEntry } }> {
    return this.request("/time-tracking/entries", { method: "POST", headers: this.getAuthHeaders(true), body: JSON.stringify(input) });
  }
  async updateTimeEntry(id: string, input: Partial<Pick<TimeEntry, "note" | "billable" | "durationSeconds">> & { date?: string }): Promise<{ status: string; data: { entry: TimeEntry } }> {
    return this.request(`/time-tracking/entries/${encodeURIComponent(id)}`, { method: "PATCH", headers: this.getAuthHeaders(true), body: JSON.stringify(input) });
  }
  async deleteTimeEntry(id: string): Promise<{ status: string; data: { deleted: boolean } }> {
    return this.request(`/time-tracking/entries/${encodeURIComponent(id)}`, { method: "DELETE", headers: this.getAuthHeaders(true) });
  }
  async getTimeTrackingSummary(filters: TimeTrackingFilters = {}): Promise<{ status: string; data: TimeTrackingSummary }> {
    return this.request(`/time-tracking/summary${this.timeTrackingQuery(filters)}`, { method: "GET", headers: this.getAuthHeaders(true) });
  }
  
  async getProjectHealthDetail(projectId: string): Promise<{
    status: string;
    data: {
      projectHealth: ProjectHealthProject;
    };
  }> {
    return this.request(`/project-health/${projectId}`, {
      method: "GET",
      headers: this.getAuthHeaders(true),
    });
  }

  async exportWorkspaceWorkbookXlsx(): Promise<void> {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
    const companyId = localStorage.getItem("activeCompanyId");
    if (!token) throw new ApiError("Not authenticated", 401);
    if (!companyId) throw new ApiError("No active workspace selected", 400);

    const res = await fetch(`${API_BASE_URL}/exports/workspace.xlsx`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-company-id": companyId,
      },
    });

    if (!res.ok) {
      let msg = "Export failed";
      try {
        const j = await res.json();
        msg = j?.message || msg;
      } catch {}
      throw new ApiError(msg, res.status);
    }

    const blob = await res.blob();
    const filename = `workspace-export-${companyId}.xlsx`;
    triggerBlobDownload(blob, filename);
  }

  async exportWorkspaceZip(): Promise<void> {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
    const companyId = localStorage.getItem("activeCompanyId");
    if (!token) throw new ApiError("Not authenticated", 401);
    if (!companyId) throw new ApiError("No active workspace selected", 400);

    const res = await fetch(`${API_BASE_URL}/exports/workspace`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-company-id": companyId,
      },
    });

    if (!res.ok) {
      let msg = "Export failed";
      try {
        const j = await res.json();
        msg = j?.message || msg;
      } catch {}
      throw new ApiError(msg, res.status);
    }

    const blob = await res.blob();
    const filename = `workspace-export-${companyId}.zip`;
    triggerBlobDownload(blob, filename);
  }
  
}

/** Parse the response header before considering metadata; never use the endpoint name. */
export function resolveDownloadFileName(disposition: string, metadataName = "", fallback = "download"): string {
  let fileName = "";
  const encoded = disposition.match(/(?:^|;)\s*filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (encoded) {
    try { fileName = decodeURIComponent(encoded[1].trim()); } catch { /* use plain filename or metadata */ }
  }
  if (!fileName) {
    const plain = disposition.match(/(?:^|;)\s*filename\s*=\s*(?:"([^"\r\n]+)"|([^;\r\n]+))/i);
    if (plain) fileName = plain[1] || plain[2].trim();
  }
  return fileName || metadataName || fallback;
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }
}

export type ConnectedStorageStatus = "active" | "reauth_required" | "disconnected" | "error";
export interface ConnectedStorageConnectionSummary {
  id: string;
  provider: "dropbox" | "google_drive" | "onedrive" | "box";
  status: ConnectedStorageStatus;
  lastVerifiedAt: string | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
  /** Present for workspace owners/admins only. */
  account?: { name: string | null; email: string | null };
  scopes?: string[];
  lastErrorCode?: string | null;
  canManage?: boolean;
}
export interface ConnectedStorageListResponse { canManage: boolean; connections: ConnectedStorageConnectionSummary[] }

export type ConnectedStorageTargetType = "project" | "task" | "comment";
/** The Project / Task / comment a file is being picked for. A new comment is identified by its task (`taskId`) instead of a comment id. */
export interface ConnectedStorageTarget { targetType: ConnectedStorageTargetType; targetId?: string; taskId?: string }
export interface ConnectedStorageItem {
  providerItemId: string;
  itemType: "file" | "folder";
  name: string;
  mimeType: string | null;
  size: number | null;
  revision: string | null;
  modifiedAt: string | null;
  /** Display only. The provider item id is the only identity. */
  displayPath: string | null;
  thumbnailUrl: null;
  selectable: boolean;
}
export interface ConnectedStorageListing { provider: string; parentId: string | null; folders: ConnectedStorageItem[]; files: ConnectedStorageItem[]; hasMore: boolean; cursor: string | null }
export interface ConnectedStorageSearchResult { provider: string; query: string; items: ConnectedStorageItem[]; hasMore: boolean; cursor: string | null }

export interface ConnectedStorageAttachment {
  id: string;
  targetType: ConnectedStorageTargetType;
  provider: "dropbox" | "google_drive" | "onedrive" | "box";
  itemId: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  revision: string | null;
  modifiedAt: string | null;
  availability: "available" | "unavailable" | "deleted" | "unknown";
  connectionStatus: ConnectedStorageStatus;
  attachedBy: string | null;
  createdAt: string;
  canOpen: boolean;
  /** Advisory: the server decides again (from the provider's current metadata and the file's bytes) when previewing. */
  previewType?: "image" | "pdf" | "text" | null;
  canPreview?: boolean;
  canUnlink: boolean;
}

export const api = new ApiClient();
