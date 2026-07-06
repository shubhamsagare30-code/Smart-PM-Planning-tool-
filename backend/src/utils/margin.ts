import { Allocation, Project, Resource, TimeLog } from '../types';
import { workingDaysInRange } from './dates';

export type MarginStatus = 'red' | 'yellow' | 'green';

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

export interface AllocationCostInput {
  resource_id: number;
  allocation_percentage: number;
  start_date: string;
  end_date: string;
  cost_per_day?: number;
}

export function getMarginStatus(margin: number): MarginStatus {
  if (margin < 30) return 'red';
  if (margin < 50) return 'yellow';
  return 'green';
}

export function calculateRevenue(project: Pick<Project, 'budget' | 'project_type' | 'monthly_rate' | 'duration_days' | 'start_date' | 'end_date'>): number {
  const durationDays = project.duration_days || workingDaysInRange(project.start_date, project.end_date);
  if (project.project_type === 'monthly') {
    const months = Math.max(durationDays / 22, 1);
    return Math.round((project.monthly_rate || 0) * months);
  }
  return project.budget;
}

export function calculateEmployeeCost(
  allocations: AllocationCostInput[],
  resources: Pick<Resource, 'id' | 'cost_per_day'>[],
  durationDays: number
): number {
  let total = 0;
  const resourceMap = new Map(resources.map((r) => [r.id, r.cost_per_day]));

  for (const alloc of allocations) {
    const costPerDay = alloc.cost_per_day ?? resourceMap.get(alloc.resource_id) ?? 0;
    const allocDays = workingDaysInRange(alloc.start_date, alloc.end_date);
    const effectiveDays = Math.min(allocDays, durationDays) * (alloc.allocation_percentage / 100);
    total += costPerDay * effectiveDays;
  }

  return Math.round(total * 100) / 100;
}

export function calculateActualEmployeeCost(
  timeLogs: TimeLog[],
  resources: Pick<Resource, 'id' | 'cost_per_day'>[]
): number {
  const resourceMap = new Map(resources.map((r) => [r.id, r.cost_per_day]));
  let total = 0;
  for (const log of timeLogs) {
    const costPerDay = resourceMap.get(log.resource_id) ?? 0;
    total += (log.hours / 8) * costPerDay;
  }
  return Math.round(total * 100) / 100;
}

export function calculateProjectFinancials(
  project: Project,
  allocations: Allocation[],
  resources: Resource[],
  timeLogs: TimeLog[] = [],
  useActual = false
): ProjectFinancials {
  const durationDays = project.duration_days || workingDaysInRange(project.start_date, project.end_date);
  const revenue = calculateRevenue(project);

  const allocInputs: AllocationCostInput[] = allocations.map((a) => ({
    resource_id: a.resource_id,
    allocation_percentage: a.allocation_percentage,
    start_date: a.start_date,
    end_date: a.end_date,
  }));

  const employeeCost = calculateEmployeeCost(allocInputs, resources, durationDays);
  const actualEmployeeCost = calculateActualEmployeeCost(timeLogs, resources);

  const softwareCost = project.software_cost || 0;
  const hardwareCost = project.hardware_cost || 0;
  const deskCost = project.desk_cost || 0;
  const officeCost = project.office_cost || 0;
  const overheadCost = softwareCost + hardwareCost + deskCost + officeCost;

  const plannedCost = employeeCost + overheadCost;
  const actualOverhead = overheadCost * Math.min((project.actual_completion_percent || 0) / 100, 1);
  const computedActualCost = actualEmployeeCost + actualOverhead;

  const totalCost = useActual && (project.actual_cost > 0 || timeLogs.length > 0)
    ? (project.actual_cost > 0 ? project.actual_cost : computedActualCost)
    : plannedCost;

  const profit = revenue - totalCost;
  const grossMargin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

  return {
    revenue,
    employeeCost: useActual && timeLogs.length > 0 ? actualEmployeeCost : employeeCost,
    softwareCost,
    hardwareCost,
    deskCost,
    officeCost,
    overheadCost,
    totalCost: Math.round(totalCost * 100) / 100,
    grossMargin,
    marginStatus: getMarginStatus(grossMargin),
    profit: Math.round(profit * 100) / 100,
  };
}

export function previewFinancials(
  project: Partial<Project> & { budget: number; start_date: string; end_date: string },
  draftAllocations: AllocationCostInput[],
  resources: Resource[]
): ProjectFinancials {
  const durationDays = project.duration_days || workingDaysInRange(project.start_date, project.end_date);
  const fullProject = {
    budget: project.budget,
    project_type: project.project_type || 'fixed_cost',
    monthly_rate: project.monthly_rate || 0,
    duration_days: durationDays,
    start_date: project.start_date,
    end_date: project.end_date,
    software_cost: project.software_cost || 0,
    hardware_cost: project.hardware_cost || 0,
    desk_cost: project.desk_cost || 0,
    office_cost: project.office_cost || 0,
    actual_cost: 0,
    actual_completion_percent: 0,
  } as Project;

  return calculateProjectFinancials(
    fullProject,
    draftAllocations.map((a, i) => ({ ...a, id: i, project_id: 0, created_at: '', updated_at: '' })) as Allocation[],
    resources
  );
}
