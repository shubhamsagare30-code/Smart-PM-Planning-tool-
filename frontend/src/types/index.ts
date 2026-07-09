export type ResourceStatus = 'active' | 'archived';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectType = 'fixed_cost' | 'monthly' | 'time_and_materials';
export type BoardType = 'internal' | 'trello' | 'asana' | 'zoho' | 'none';
export type TaskStatus = 'planned' | 'in_progress' | 'delivered' | 'blocked';
export type KanbanColumn =
  | 'product_backlog' | 'ready_for_dev' | 'sprint_backlog' | 'work_in_progress'
  | 'testing' | 'ready_staging_review' | 'pushed_to_production' | 'icebox'
  | 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type MarginStatus = 'red' | 'yellow' | 'green';
export type LeaveType = 'vacation' | 'sick_leave' | 'holiday' | 'training';
export type UserRole = 'admin' | 'director' | 'pm' | 'member';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  resource_id: number | null;
  is_active: boolean;
  must_change_password: boolean;
}

export interface TaskComment {
  id: string;
  author: string;
  text: string;
  created_at: string;
}

export interface Skill { id: number; name: string; }
export interface Department { id: number; name: string; }
export interface EmploymentType { id: number; name: string; }

export interface Resource {
  id: number;
  name: string;
  email: string;
  designation: string;
  department_id: number;
  department_name?: string;
  cost_per_day: number;
  employment_type_id: number;
  employment_type_name?: string;
  capacity_percentage: number;
  joining_date: string;
  status: ResourceStatus;
  skills?: Skill[];
}

export interface Project {
  id: number;
  name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  budget: number;
  description: string | null;
  duration_days: number | null;
  project_type: ProjectType;
  monthly_rate: number;
  hourly_rate?: number;
  software_cost: number;
  hardware_cost: number;
  desk_cost: number;
  office_cost: number;
  planned_cost: number;
  actual_cost: number;
  documentation_links: string;
  documentation_files: string;
  external_board_url: string | null;
  board_type: BoardType;
  planned_completion_percent: number;
  actual_completion_percent: number;
  deliverables_planned: number;
  deliverables_actual: number;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  task_uid: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_id: number | null;
  assignee_name?: string;
  planned_hours: number;
  actual_hours: number;
  kanban_column: KanbanColumn;
  sort_order: number;
  due_date?: string | null;
  reminder_date?: string | null;
  tags?: string;
  links?: string;
  attachments?: string;
  comments?: string;
}

export interface TimeLog {
  id: number;
  project_id: number;
  resource_id: number;
  resource_name?: string;
  log_date: string;
  hours: number;
  description: string | null;
}

export interface ResourceRequest {
  id: number;
  requesting_project_id: number;
  requesting_project_name?: string;
  source_project_id: number | null;
  source_project_name?: string;
  resource_id: number;
  resource_name?: string;
  requested_allocation_percent: number;
  status: RequestStatus;
  message: string | null;
}

export interface Allocation {
  id: number;
  resource_id: number;
  project_id: number;
  resource_name?: string;
  project_name?: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string;
}

export interface Leave {
  id: number;
  resource_id: number;
  resource_name?: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  notes: string | null;
}

export interface ProjectFinancials {
  revenue: number;
  employeeCost: number;
  softwareCost: number;
  hardwareCost: number;
  deskCost: number;
  officeCost: number;
  overheadCost: number;
  totalCost: number;
  grossMargin: number;
  marginStatus: MarginStatus;
  profit: number;
}

export interface SmartSuggestion {
  type: 'timeline' | 'resource' | 'cost' | 'margin';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actions: string[];
  availableResources?: Array<{ id: number; name: string; designation: string; available: number }>;
}

export interface ProjectDashboard {
  project: Project;
  financials: ProjectFinancials;
  timeline: {
    plannedDays: number;
    elapsedDays: number;
    adherencePercent: number;
    status: 'on_track' | 'at_risk' | 'behind';
    deliverablesPlanned: number;
    deliverablesActual: number;
    deliverablesAdherence: number;
  };
  cost: { planned: number; actual: number; variance: number; status: 'under' | 'on_track' | 'over' };
  completion: { planned: number; actual: number; variance: number; taskBased?: boolean };
  allocations: Allocation[];
  timeLogs: TimeLog[];
  tasks: ProjectTask[];
  resourceRequests: ResourceRequest[];
  suggestions: SmartSuggestion[];
  documentationLinks: string[];
  bucketBreakdown?: Array<{ key: string; label: string; count: number }>;
  delayedTasks?: Array<{ id: number; task_uid: string; title: string; due_date: string | null; kanban_column: string }>;
  taskSummary?: { delivered: number; inProgress: number; delayed: number; planned: number; total: number };
  taskProgress?: number;
}

export interface AllocationMetrics {
  overAllocatedCount: number;
  overAllocatedNames: string[];
  benchAvailableCount: number;
  avgUtilization: number;
  contextSwitching: Array<{ name: string; projectCount: number; utilization: number }>;
  leaveImpact: Array<{ name: string; utilization: number }>;
}

export interface DashboardData {
  totalResources: number;
  activeProjects: number;
  availableCapacity: number;
  utilizationPercent: number;
  resourceUtilization: Array<{ name: string; utilization: number; capacity: number }>;
  projectAllocation: Array<{ name: string; allocated: number; resources: number }>;
  monthlyCapacity: Array<{ month: string; capacity: number; allocated: number; available: number }>;
  projectHealth?: Array<{ id: number; name: string; margin: number; marginStatus: string; completion: number; timelineStatus: string }>;
  taskSummary?: { delivered: number; inProgress: number; delayed: number; planned: number; total: number };
  allocationMetrics?: AllocationMetrics;
  projects?: Array<{ id: number; name: string }>;
}

export interface StandupSession {
  id: number;
  project_id: number;
  session_date: string;
  notes: string;
  attendees: string;
  duration_min: number | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface StandupDecision {
  id: number;
  session_id: number;
  decision: string;
  action: string | null;
  owner_name: string | null;
  due_date: string | null;
  category: string;
  created_at: string;
}

export interface StandupParkingItem {
  id: number;
  session_id: number;
  text: string;
  resolved: boolean;
  created_at: string;
}

export interface StandupTaskBrief {
  id: number;
  task_uid?: string;
  title: string;
  assignee_name?: string;
  due_date?: string | null;
  kanban_column: string;
  planned_hours: number;
  status: string;
}

export interface StandupAgenda {
  sessionDate: string;
  sinceDate: string;
  doneSinceLastStandup: StandupTaskBrief[];
  dueToday: StandupTaskBrief[];
  overdue: StandupTaskBrief[];
  inProgress: StandupTaskBrief[];
  blocked: StandupTaskBrief[];
  peopleRound: Array<{ name: string; today: StandupTaskBrief[]; inProgress: StandupTaskBrief[] }>;
}

export interface StandupSessionData {
  session: StandupSession;
  agenda: StandupAgenda;
  decisions: StandupDecision[];
  parking: StandupParkingItem[];
  history: StandupSession[];
  projectName: string;
}

export interface MorningBriefingItem {
  projectId: number;
  projectName: string;
  status: string;
  dueTodayCount: number;
  overdueCount: number;
  blockedCount: number;
  standupPrepared: boolean;
  topDueToday: string[];
  topOverdue: string[];
}

export interface MorningBriefing {
  date: string;
  totalDueToday: number;
  totalOverdue: number;
  projectsNeedingAttention: number;
  items: MorningBriefingItem[];
}

export interface StandupEmailDraft {
  subject: string;
  body: string;
  mailto: string;
}

export interface HeatmapCell {
  resourceId: number;
  resourceName: string;
  week: string;
  utilization: number;
  status: 'under' | 'warning' | 'over';
}

export interface ForecastItem {
  type: 'conflict' | 'shortage' | 'expiring';
  resourceId?: number;
  resourceName?: string;
  projectId?: number;
  projectName?: string;
  message: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SkillMatrixEntry {
  skill: string;
  resources: Array<{ id: number; name: string; designation: string; department: string; available: number }>;
}

export interface AllocationResult {
  allocation: Allocation;
  warnings: string[];
  maxUtilization: number;
}

export interface RequestImpact {
  resource: { id: number; name: string; availableCapacity: number };
  requestingProject: { name: string; marginBefore: number; marginAfter: number; marginChange: number };
  sourceProject: {
    projectName: string;
    currentAllocation: number;
    afterAllocation: number;
    marginBefore: number;
    marginAfter: number;
    warning: string | null;
  } | null;
  feasible: boolean;
}
