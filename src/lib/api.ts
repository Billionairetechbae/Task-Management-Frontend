// src/lib/api.ts
import { envOr } from "@/lib/env";

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
  };
}

export type PermissionMode = "restricted" | "free";

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
  | "upload_workspace_files";

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
  visibilityLevel: "summary" | "detailed";
  canRequestAccess: boolean;
  task: {
    title: string;
    description?: string | null;
    status?: string | null;
    priority?: string | null;
    deadline?: string | null;
    category?: string | null;
    progress: number;
    assignee?: string | null;
    subtasks: Array<{
      title: string;
      status?: string | null;
      priority?: string | null;
      deadline?: string | null;
    }>;
  };
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
  accessLevel: "viewer";
  status: "pending" | "approved" | "denied";
  reason?: string | null;
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
}

export interface LoginData {
  email: string;
  password: string;
}

/* ============================
   TASKS & ATTACHMENTS
============================ */

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
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

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "completed" | "delayed" | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  category: string;
  estimatedHours: number;
  actualHours: number | null;
  tier: string;

  assignedAssistantId: string | null;
  executiveId: string;
  assigneeId: string | null;
  parentTaskId?: string | null;

  createdAt: string;
  updatedAt: string;

  company?: {
    id: string;
    name: string;
    companyCode?: string;
    industry?: string;
  };

  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
  };

  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    company?: string;
  } | null;

  attachments?: TaskAttachment[];
  parentTask?: Task | null;
  subtasks?: TaskSubtask[];
  subtaskCount?: number;
  activities?: TaskActivity[];
  watcherCount?: number;
  isWatching?: boolean;
  recentWatchers?: TaskWatcher[];
  /** Some APIs return full watcher list instead of only counts */
  watchers?: TaskWatcher[];

  // Some backends return this
  assignees?: any[];
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string;
  category: string;
  estimatedHours?: number;
  assigneeId?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  deadline?: string;
  category?: string;
  estimatedHours?: number;
  actualHours?: number;
  assigneeId?: string | null;
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
    team_members: any;
    members?: CompanyMember[];
  };
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
  fileUrl: string;
  publicId: string;
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

export interface AssistanceRequestAttachment {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  publicId: string;
  uploadedAt: string;
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
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
  checklists?: ProjectChecklist[];
  _count?: { tasks?: number; checklists?: number };
}

export interface CreateProjectData {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  settings?: Record<string, any>;
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
  | "upload_workspace_files";

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
    logoUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  healthScore: number;
  healthStatus: ProjectHealthStatus;
  healthLabel: string;
  healthDescription: string;
  metrics: ProjectHealthMetrics;
  workload: ProjectHealthWorkload;
  riskReasons: string[];
  recommendedActions: string[];
  priorityTasks: ProjectHealthPriorityTask[];
  generatedAt: string;
}

export interface ProjectHealthSummary {
  totalProjects: number;
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ============================
   API CLIENT
============================ */

class ApiClient {
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

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${path}`;

    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;

    // Ensure JSON calls always have Content-Type
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      if (
        typeof path === "string" &&
        path.startsWith("/tasks") &&
        (options.method || "GET") === "GET"
      ) {
        const hdrObj: Record<string, string> = {};
        headers.forEach((v, k) => (hdrObj[k] = v));
        // TEMP DEBUG: verify x-company-id header is present on GET /tasks
        console.log("API DEBUG /tasks headers:", hdrObj);
      }
    } catch {}

    const response = await fetch(url, { ...options, headers });

    let result: any;
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      const message: string = result?.message || "Request failed";

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
        message.toLowerCase().includes("workspace")
      ) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("workspace:missing", {
              detail: { message },
            })
          );
        }
      }

      throw new Error(message);
    }

    return result as T;
  }

  /* ============================
     AUTH
  ============================ */

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
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("token", result.token);
    }
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
    filters?: TaskFilters
  ): Promise<{ status: string; results: number; data: { tasks: Task[] } }> {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.priority) queryParams.append("priority", filters.priority);
    if (filters?.category) queryParams.append("category", filters.category);

    return this.request(`/tasks?${queryParams.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getAllTasksCrossWorkspace(
    filters?: AllTasksFilters
  ): Promise<AllTasksResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("scope", "assigned_all");
    if (filters?.page) queryParams.append("page", filters.page.toString());
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());
    if (filters?.search) queryParams.append("search", filters.search);
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.priority) queryParams.append("priority", filters.priority);
    if (filters?.companyId) queryParams.append("companyId", filters.companyId);

    return this.request(`/tasks?${queryParams.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  async getTaskById(
    taskId: string
  ): Promise<{ status: string; data: { task: Task } }> {
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
    data: { title: string; status?: TaskSubtask["status"]; sortOrder?: number }
  ): Promise<{ status: string; message?: string; data: { subtask: TaskSubtask } | TaskSubtask }> {
    return this.request(`/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async updateTaskSubtask(
    taskId: string,
    subtaskId: string,
    data: Partial<{ title: string; status: TaskSubtask["status"]; sortOrder: number }>
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
  ): Promise<{ status: string; message: string; data: { task: Task } }> {
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

  async getTeamMemberDashboard(): Promise<{
    status: string;
    data: AssistantDashboard;
  }> {
    return this.request("/dashboard/team_member", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async createWorkspace(data: { name: string; industry?: string; size?: string }) {
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
    return this.request("/team/team_members", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
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
    data: { company: Company };
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
    content: string
  ): Promise<{
    success: boolean;
    comment: TaskComment;
    involvedUsers: string[];
  }> {
    return this.request(`/task-comments/task/${taskId}/comments`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
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
  }): Promise<{ status: string; message?: string; data: { project: Project } }> {
    return this.request(`/projects`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async getProjects(): Promise<{
    status: string;
    results?: number;
    data: { projects: Project[] } | { items?: Project[] } | any;
  }> {
    return this.request(`/projects`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getProjectById(id: string): Promise<{
    status: string;
    data: { project: Project } | any;
  }> {
    return this.request(`/projects/${id}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
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
  }>): Promise<{ status: string; message?: string; data: { project: Project } | any }> {
    return this.request(`/projects/${id}`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(true), "Content-Type": "application/json" },
      body: JSON.stringify(data),
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
    status?: "pending" | "approved" | "denied";
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

  async decideResourceAccessRequest(
    requestId: string,
    status: "approved" | "denied"
  ): Promise<{ status: string; data: { request: ResourceAccessRequest } }> {
    return this.request(`/client-view/resource-access-requests/${requestId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(true),
      body: JSON.stringify({ status }),
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
    if (!token) throw new Error("Not authenticated");
    if (!companyId) throw new Error("No active workspace selected");

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
      throw new Error(msg);
    }

    const blob = await res.blob();
    const filename = `workspace-export-${companyId}.xlsx`;
    triggerBlobDownload(blob, filename);
  }

  async exportWorkspaceZip(): Promise<void> {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
    const companyId = localStorage.getItem("activeCompanyId");
    if (!token) throw new Error("Not authenticated");
    if (!companyId) throw new Error("No active workspace selected");

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
      throw new Error(msg);
    }

    const blob = await res.blob();
    const filename = `workspace-export-${companyId}.zip`;
    triggerBlobDownload(blob, filename);
  }
  
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const api = new ApiClient();
