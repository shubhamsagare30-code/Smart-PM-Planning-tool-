import { AllocationRepository } from '../repositories/allocationRepository';
import { ProjectTaskRepository } from '../repositories/projectTaskRepository';
import { ProjectWorkflowService } from './projectWorkflowService';
import { calculateProjectFinancials } from '../utils/margin';
import { LeaveRepository } from '../repositories/leaveRepository';
import { LookupRepository } from '../repositories/lookupRepository';
import { ProjectRepository } from '../repositories/projectRepository';
import { ResourceRepository } from '../repositories/resourceRepository';
import { ForecastItem, HeatmapCell, SkillMatrixEntry } from '../types';
import {
  getDepartmentCapacityToday,
  getMonthlyCapacityTrend,
  getOrgAvailableCapacityPercent,
  getOrgUtilizationPercent,
} from '../utils/departmentCapacity';
import {
  getCurrentUtilizationForResource,
  getResourceUtilizationForDate,
  validateAllocationCapacity,
} from '../utils/capacity';
import { addDays, eachDayInRange, formatDate, getMonthKey, getNextMonths, getWeekKey, isWeekday } from '../utils/dates';
import { AppError } from '../utils/errors';
import { getAllocationMetrics } from '../utils/allocationMetrics';
import { getTaskSummaryForTasks } from '../utils/tasks';

export class DashboardService {
  private resourceRepo = new ResourceRepository();
  private projectRepo = new ProjectRepository();
  private allocationRepo = new AllocationRepository();
  private taskRepo = new ProjectTaskRepository();
  private workflow = new ProjectWorkflowService();

  getDashboard(projectId?: number) {
    const resources = this.resourceRepo.findAll({ status: 'active' });
    const projects = this.projectRepo.findAll('active');
    const allocations = this.allocationRepo.findAll();

    const resourceUtilization = resources.map((r) => ({
      name: r.name,
      utilization: getCurrentUtilizationForResource(r),
      capacity: r.capacity_percentage,
    }));

    const projectMap = new Map<number, { name: string; allocated: number; resources: Set<number> }>();
    for (const alloc of allocations) {
      if (!projectMap.has(alloc.project_id)) {
        projectMap.set(alloc.project_id, {
          name: alloc.project_name || `Project ${alloc.project_id}`,
          allocated: 0,
          resources: new Set(),
        });
      }
      const entry = projectMap.get(alloc.project_id)!;
      entry.allocated += alloc.allocation_percentage;
      entry.resources.add(alloc.resource_id);
    }

    const projectAllocation = Array.from(projectMap.values()).map((p) => ({
      name: p.name,
      allocated: p.allocated,
      resources: p.resources.size,
    }));

    const monthlyCapacity = getMonthlyCapacityTrend(resources, 6);
    const departmentCapacity = getDepartmentCapacityToday(resources);

    const allProjects = this.projectRepo.findAll();
    const projectHealth = allProjects.slice(0, 8).map((p) => {
      try {
        const dash = this.workflow.getDashboard(p.id);
        return {
          id: p.id,
          name: p.name,
          margin: dash.financials.grossMargin,
          marginStatus: dash.financials.marginStatus,
          completion: dash.completion.actual,
          timelineStatus: dash.timeline.status,
        };
      } catch {
        return { id: p.id, name: p.name, margin: 0, marginStatus: 'yellow' as const, completion: 0, timelineStatus: 'on_track' as const };
      }
    });

    const allTasks = allProjects.flatMap((p) => this.taskRepo.findByProject(p.id));
    const filteredTasks = projectId
      ? allTasks.filter((t) => t.project_id === projectId)
      : allTasks;
    const taskSummary = getTaskSummaryForTasks(filteredTasks);

    const allocationMetrics = getAllocationMetrics();

    return {
      totalResources: resources.length,
      activeProjects: projects.length,
      availableCapacity: getOrgAvailableCapacityPercent(resources),
      utilizationPercent: getOrgUtilizationPercent(resources),
      resourceUtilization,
      projectAllocation,
      monthlyCapacity,
      departmentCapacity,
      projectHealth,
      taskSummary,
      allocationMetrics,
      projects: allProjects.map((p) => ({ id: p.id, name: p.name })),
    };
  }
}

export class HeatmapService {
  private resourceRepo = new ResourceRepository();

  getHeatmap(weeks = 8): HeatmapCell[] {
    const resources = this.resourceRepo.findAll({ status: 'active' });
    const cells: HeatmapCell[] = [];
    const today = new Date();

    for (let w = 0; w < weeks; w++) {
      const weekStart = addDays(today, w * 7);
      const weekKey = getWeekKey(formatDate(weekStart));
      const weekDays = eachDayInRange(weekKey, formatDate(addDays(weekStart, 4))).filter(isWeekday);

      for (const resource of resources) {
        let totalUtil = 0;
        let count = 0;

        for (const day of weekDays) {
          const { allocated, leaveImpact, capacity } = getResourceUtilizationForDate(resource.id, day);
          const effective = Math.max(0, capacity - leaveImpact);
          const util = effective > 0 ? (allocated / effective) * 100 : allocated > 0 ? 100 : 0;
          totalUtil += util;
          count++;
        }

        const utilization = count > 0 ? Math.round((totalUtil / count) * 10) / 10 : 0;
        let status: 'under' | 'warning' | 'over' = 'under';
        if (utilization > 100) status = 'over';
        else if (utilization >= 80) status = 'warning';

        cells.push({
          resourceId: resource.id,
          resourceName: resource.name,
          week: weekKey,
          utilization,
          status,
        });
      }
    }

    return cells;
  }
}

export class ForecastService {
  private resourceRepo = new ResourceRepository();
  private allocationRepo = new AllocationRepository();
  private projectRepo = new ProjectRepository();

  getForecast(days: 30 | 60 | 90): ForecastItem[] {
    const items: ForecastItem[] = [];
    const today = formatDate(new Date());
    const endDate = formatDate(addDays(new Date(), days));
    const resources = this.resourceRepo.findAll({ status: 'active' });

    for (const resource of resources) {
      const forecastDays = eachDayInRange(today, endDate).filter(isWeekday);
      for (const day of forecastDays) {
        const { allocated, leaveImpact, capacity } = getResourceUtilizationForDate(resource.id, day);
        const effective = Math.max(0, capacity - leaveImpact);
        if (effective > 0 && allocated > effective) {
          items.push({
            type: 'conflict',
            resourceId: resource.id,
            resourceName: resource.name,
            message: `${resource.name} is over-allocated at ${Math.round((allocated / effective) * 100)}% on ${day}`,
            date: day,
            severity: allocated > effective * 1.2 ? 'high' : 'medium',
          });
        }
      }

      const util = getCurrentUtilizationForResource(resource);
      if (util < 50) {
        items.push({
          type: 'shortage',
          resourceId: resource.id,
          resourceName: resource.name,
          message: `${resource.name} has low utilization (${util}%) — available for new assignments`,
          date: today,
          severity: 'low',
        });
      }
    }

    const expiring = this.allocationRepo.findExpiringBefore(endDate);
    for (const alloc of expiring) {
      items.push({
        type: 'expiring',
        resourceId: alloc.resource_id,
        resourceName: alloc.resource_name,
        projectId: alloc.project_id,
        projectName: alloc.project_name,
        message: `Allocation of ${alloc.resource_name} to ${alloc.project_name} ends on ${alloc.end_date}`,
        date: alloc.end_date,
        severity: 'medium',
      });
    }

    const uniqueConflicts = new Map<string, ForecastItem>();
    for (const item of items) {
      if (item.type === 'conflict') {
        const key = `${item.resourceId}-${item.date}`;
        if (!uniqueConflicts.has(key)) uniqueConflicts.set(key, item);
      }
    }

    const conflicts = Array.from(uniqueConflicts.values()).slice(0, 20);
    const shortages = items.filter((i) => i.type === 'shortage').slice(0, 10);
    const expiringItems = items.filter((i) => i.type === 'expiring').slice(0, 15);

    return [...conflicts, ...shortages, ...expiringItems];
  }
}

export class SkillMatrixService {
  private lookupRepo = new LookupRepository();
  private resourceRepo = new ResourceRepository();

  getMatrix(skillSearch?: string, roleSearch?: string): SkillMatrixEntry[] {
    const skills = this.lookupRepo.findAllSkills();
    const resources = this.resourceRepo.findAll({ status: 'active' });
    const entries: SkillMatrixEntry[] = [];

    for (const skill of skills) {
      if (skillSearch && !skill.name.toLowerCase().includes(skillSearch.toLowerCase())) continue;

      const skillResources = resources
        .filter((r) => r.skills?.some((s) => s.id === skill.id))
        .filter((r) => !roleSearch || r.designation.toLowerCase().includes(roleSearch.toLowerCase()))
        .map((r) => ({
          id: r.id,
          name: r.name,
          designation: r.designation,
          department: r.department_name || '',
          available: Math.max(0, 100 - getCurrentUtilizationForResource(r)),
        }));

      if (skillResources.length > 0) {
        entries.push({ skill: skill.name, resources: skillResources });
      }
    }

    return entries;
  }
}

export class AllocationService {
  private allocationRepo = new AllocationRepository();
  private resourceRepo = new ResourceRepository();
  private projectRepo = new ProjectRepository();

  findAll(filters?: { resource_id?: number; project_id?: number }) {
    return this.allocationRepo.findAll(filters);
  }

  findById(id: number) {
    const alloc = this.allocationRepo.findById(id);
    if (!alloc) throw new AppError(404, 'Allocation not found');
    return alloc;
  }

  create(data: {
    resource_id: number;
    project_id: number;
    allocation_percentage: number;
    start_date: string;
    end_date: string;
  }) {
    const resource = this.resourceRepo.findById(data.resource_id);
    if (!resource || resource.status === 'archived') {
      throw new AppError(400, 'Resource not found or archived');
    }
    const project = this.projectRepo.findById(data.project_id);
    if (!project || project.status === 'archived') {
      throw new AppError(400, 'Project not found or archived');
    }
    if (data.start_date > data.end_date) {
      throw new AppError(400, 'Start date must be before end date');
    }

    const validation = validateAllocationCapacity(
      data.resource_id,
      data.allocation_percentage,
      data.start_date,
      data.end_date
    );

    if (!validation.valid) {
      throw new AppError(
        400,
        `Cannot allocate: resource would exceed 100% capacity (peak ${validation.maxUtilization}%). Reduce allocation or free up capacity on overlapping dates.`
      );
    }

    const allocation = this.allocationRepo.create(data);
    return { allocation, warnings: validation.warnings, maxUtilization: validation.maxUtilization };
  }

  update(
    id: number,
    data: Partial<{
      resource_id: number;
      project_id: number;
      allocation_percentage: number;
      start_date: string;
      end_date: string;
    }>
  ) {
    const existing = this.allocationRepo.findById(id);
    if (!existing) throw new AppError(404, 'Allocation not found');

    const merged = { ...existing, ...data };
    const validation = validateAllocationCapacity(
      merged.resource_id,
      merged.allocation_percentage,
      merged.start_date,
      merged.end_date,
      id
    );

    if (!validation.valid) {
      throw new AppError(
        400,
        `Cannot update allocation: resource would exceed 100% capacity (peak ${validation.maxUtilization}%).`
      );
    }

    const allocation = this.allocationRepo.update(id, data);
    return { allocation, warnings: validation.warnings, maxUtilization: validation.maxUtilization };
  }

  delete(id: number) {
    if (!this.allocationRepo.delete(id)) throw new AppError(404, 'Allocation not found');
    return { success: true };
  }
}

export class ReportService {
  private resourceRepo = new ResourceRepository();
  private allocationRepo = new AllocationRepository();
  private projectRepo = new ProjectRepository();

  getResourceUtilizationReport() {
    const resources = this.resourceRepo.findAll({ status: 'active' });
    return resources.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      department: r.department_name,
      designation: r.designation,
      capacity: r.capacity_percentage,
      utilization: getCurrentUtilizationForResource(r),
      available: Math.max(0, r.capacity_percentage - getCurrentUtilizationForResource(r)),
      cost_per_day: r.cost_per_day,
      skills: r.skills?.map((s) => s.name).join(', ') || '',
    }));
  }

  getProjectAllocationReport() {
    const projects = this.projectRepo.findAll();
    const allocations = this.allocationRepo.findAll();
    return projects.map((p) => {
      const projectAllocs = allocations.filter((a) => a.project_id === p.id);
      return {
        id: p.id,
        name: p.name,
        client: p.client_name,
        status: p.status,
        budget: p.budget,
        resource_count: new Set(projectAllocs.map((a) => a.resource_id)).size,
        total_allocation: projectAllocs.reduce((sum, a) => sum + a.allocation_percentage, 0),
        allocations: projectAllocs.map((a) => ({
          resource: a.resource_name,
          percentage: a.allocation_percentage,
          start: a.start_date,
          end: a.end_date,
        })),
      };
    });
  }

  getCapacityReport() {
    const resources = this.resourceRepo.findAll({ status: 'active' });
    const months = getNextMonths(3);
    return months.map((month) => {
      const resourcesData = resources.map((r) => {
        const days = eachDayInRange(`${month}-01`, `${month}-28`).filter(
          (d) => getMonthKey(d) === month && isWeekday(d)
        );
        let avgUtil = 0;
        for (const day of days) {
          const { allocated, leaveImpact, capacity } = getResourceUtilizationForDate(r.id, day);
          const effective = Math.max(0, capacity - leaveImpact);
          avgUtil += effective > 0 ? (allocated / effective) * 100 : 0;
        }
        avgUtil = days.length > 0 ? Math.round((avgUtil / days.length) * 10) / 10 : 0;
        return { name: r.name, utilization: avgUtil };
      });
      return { month, resources: resourcesData };
    });
  }
}
