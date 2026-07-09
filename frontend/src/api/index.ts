import axios from 'axios';
import type {
  Allocation, AllocationResult, AuthUser, DashboardData, Department, EmploymentType,
  ForecastItem, HeatmapCell, Leave, Project, ProjectDashboard, ProjectFinancials,
  ProjectTask, RequestImpact, Resource, ResourceRequest, Skill, SkillMatrixEntry, UserRole,
} from '../types';
import { getStoredToken } from '../auth/token';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('smart_pm_token');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
};

export const adminApi = {
  listUsers: () => api.get<AuthUser[]>('/admin/users').then((r) => r.data),
  createUser: (data: { email: string; password: string; name: string; role: UserRole; resource_id?: number }) =>
    api.post<AuthUser>('/admin/users', data).then((r) => r.data),
  updateUser: (id: number, data: Partial<{ name: string; role: UserRole; is_active: boolean; password: string }>) =>
    api.put<AuthUser>(`/admin/users/${id}`, data).then((r) => r.data),
  assignProject: (userId: number, projectId: number, memberRole: 'pm' | 'member' = 'member') =>
    api.post(`/admin/users/${userId}/projects`, { project_id: projectId, member_role: memberRole }).then((r) => r.data),
};

export const lookupsApi = {
  departments: () => api.get<Department[]>('/lookups/departments').then((r) => r.data),
  skills: () => api.get<Skill[]>('/lookups/skills').then((r) => r.data),
  employmentTypes: () => api.get<EmploymentType[]>('/lookups/employment-types').then((r) => r.data),
};

export const resourcesApi = {
  list: (params?: { search?: string; skill_id?: number; department_id?: number; status?: string }) =>
    api.get<Resource[]>('/resources', { params }).then((r) => r.data),
  get: (id: number) => api.get<Resource>(`/resources/${id}`).then((r) => r.data),
  create: (data: Partial<Resource> & { skill_ids?: number[] }) =>
    api.post<Resource>('/resources', data).then((r) => r.data),
  update: (id: number, data: Partial<Resource> & { skill_ids?: number[] }) =>
    api.put<Resource>(`/resources/${id}`, data).then((r) => r.data),
  archive: (id: number) => api.patch<Resource>(`/resources/${id}/archive`).then((r) => r.data),
};

export const projectsApi = {
  list: (status?: string) => api.get<Project[]>('/projects', { params: { status } }).then((r) => r.data),
  get: (id: number) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data).then((r) => r.data),
  update: (id: number, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data).then((r) => r.data),
  archive: (id: number) => api.patch<Project>(`/projects/${id}/archive`).then((r) => r.data),
  getDashboard: (id: number) => api.get<ProjectDashboard>(`/projects/${id}/dashboard`).then((r) => r.data),
  previewMargin: (project: Partial<Project>, allocations: Array<{ resource_id: number; allocation_percentage: number; start_date: string; end_date: string }>) =>
    api.post<ProjectFinancials>('/projects/preview-margin', { project, allocations }).then((r) => r.data),
  createFull: (data: {
    project: Partial<Project>;
    allocations?: Array<{ resource_id: number; allocation_percentage: number; start_date: string; end_date: string }>;
    tasks?: Array<{ title: string; description?: string; kanban_column?: string; assignee_id?: number; planned_hours?: number }>;
    documentationLinks?: string[];
  }) => api.post<ProjectDashboard>('/projects/full', data).then((r) => r.data),
  listTasks: (projectId: number) => api.get<ProjectTask[]>(`/projects/${projectId}/tasks`).then((r) => r.data),
  createTask: (projectId: number, data: Record<string, unknown>) =>
    api.post<ProjectTask>(`/projects/${projectId}/tasks`, { ...data, project_id: projectId }).then((r) => r.data),
  updateTask: (projectId: number, taskId: number, data: Partial<ProjectTask>) =>
    api.put<ProjectTask>(`/projects/${projectId}/tasks/${taskId}`, data).then((r) => r.data),
  addTaskComment: (projectId: number, taskId: number, author: string, text: string) =>
    api.post<ProjectTask>(`/projects/${projectId}/tasks/${taskId}/comments`, { author, text }).then((r) => r.data),
};

export const resourceRequestsApi = {
  list: (projectId?: number) => api.get<ResourceRequest[]>('/resource-requests', { params: { project_id: projectId } }).then((r) => r.data),
  create: (data: Omit<ResourceRequest, 'id' | 'status'>) => api.post<ResourceRequest>('/resource-requests', data).then((r) => r.data),
  analyze: (data: { requesting_project_id: number; resource_id: number; requested_allocation_percent: number }) =>
    api.post<RequestImpact>('/resource-requests/analyze', data).then((r) => r.data),
  updateStatus: (id: number, status: string) => api.patch<ResourceRequest>(`/resource-requests/${id}`, { status }).then((r) => r.data),
};

export const allocationsApi = {
  list: (params?: { resource_id?: number; project_id?: number }) =>
    api.get<Allocation[]>('/allocations', { params }).then((r) => r.data),
  create: (data: Omit<Allocation, 'id'>) =>
    api.post<AllocationResult>('/allocations', data).then((r) => r.data),
  update: (id: number, data: Partial<Allocation>) =>
    api.put<AllocationResult>(`/allocations/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/allocations/${id}`).then((r) => r.data),
};

export const leavesApi = {
  list: (resourceId?: number) =>
    api.get<Leave[]>('/leaves', { params: { resource_id: resourceId } }).then((r) => r.data),
  create: (data: Omit<Leave, 'id'>) => api.post<Leave>('/leaves', data).then((r) => r.data),
  update: (id: number, data: Partial<Leave>) => api.put<Leave>(`/leaves/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/leaves/${id}`).then((r) => r.data),
};

export const dashboardApi = {
  get: (projectId?: number) =>
    api.get<DashboardData>('/dashboard', { params: projectId ? { project_id: projectId } : {} }).then((r) => r.data),
};

export const heatmapApi = {
  get: (weeks?: number) => api.get<HeatmapCell[]>('/heatmap', { params: { weeks } }).then((r) => r.data),
};

export const forecastApi = {
  get: (days: 30 | 60 | 90) => api.get<ForecastItem[]>('/forecast', { params: { days } }).then((r) => r.data),
};

export const skillMatrixApi = {
  get: (skill?: string, role?: string) =>
    api.get<SkillMatrixEntry[]>('/skill-matrix', { params: { skill, role } }).then((r) => r.data),
};

export const reportsApi = {
  download: (type: string, format: 'csv' | 'xlsx') =>
    api.get(`/reports/${type}`, { params: { format }, responseType: 'blob' }).then((r) => r.data),
};
