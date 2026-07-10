import { AllocationRepository } from '../repositories/allocationRepository';
import { ProjectRepository } from '../repositories/projectRepository';
import { ProjectTaskRepository } from '../repositories/projectTaskRepository';
import { ResourceRepository } from '../repositories/resourceRepository';
import { ResourceRequestRepository } from '../repositories/resourceRequestRepository';
import { TimeLogRepository } from '../repositories/timeLogRepository';
import { SprintService } from './sprintService';
import {
  Allocation,
  Project,
  ProjectDashboard,
  Resource,
  SmartSuggestion,
} from '../types';
import { getCurrentUtilizationForResource, getResourceUtilizationForDate } from '../utils/capacity';
import { formatDate, parseDate, workingDaysInRange } from '../utils/dates';
import { calculateProjectFinancials, previewFinancials } from '../utils/margin';
import { AppError } from '../utils/errors';
import {
  calculateTaskProgress, getBucketBreakdown, getTaskSummaryForTasks, isTaskDelayed,
} from '../utils/tasks';

export class ProjectWorkflowService {
  private projectRepo = new ProjectRepository();
  private allocationRepo = new AllocationRepository();
  private resourceRepo = new ResourceRepository();
  private taskRepo = new ProjectTaskRepository();
  private timeLogRepo = new TimeLogRepository();
  private requestRepo = new ResourceRequestRepository();
  private sprintService = new SprintService();

  getDashboard(projectId: number): ProjectDashboard {
    const project = this.projectRepo.findById(projectId);
    if (!project) throw new AppError(404, 'Project not found');

    const allocations = this.allocationRepo.findAll({ project_id: projectId });
    const resources = this.resourceRepo.findAll({ status: 'active' });
    const timeLogs = this.timeLogRepo.findByProject(projectId);
    const tasks = this.taskRepo.findByProject(projectId);
    const resourceRequests = this.requestRepo.findAll(projectId);

    const financials = calculateProjectFinancials(project, allocations, resources, timeLogs, true);

    const plannedDays = project.duration_days || workingDaysInRange(project.start_date, project.end_date);
    const today = formatDate(new Date());
    const elapsedDays = today >= project.start_date
      ? Math.min(workingDaysInRange(project.start_date, today), plannedDays)
      : 0;

    const expectedCompletion = plannedDays > 0 ? (elapsedDays / plannedDays) * 100 : 0;

    let timelineStatus: 'on_track' | 'at_risk' | 'behind' = 'on_track';

    const deliverablesAdherence = project.deliverables_planned > 0
      ? Math.round((project.deliverables_actual / project.deliverables_planned) * 100)
      : 100;

    const plannedCost = financials.totalCost;
    const actualCost = project.actual_cost > 0 ? project.actual_cost : financials.totalCost;
    const costVariance = actualCost - plannedCost;
    let costStatus: 'under' | 'on_track' | 'over' = 'on_track';
    if (costVariance > plannedCost * 0.05) costStatus = 'over';
    else if (costVariance < -plannedCost * 0.05) costStatus = 'under';

    const documentationLinks = JSON.parse(project.documentation_links || '[]') as string[];

    const taskProgress = calculateTaskProgress(tasks);
    const bucketBreakdown = getBucketBreakdown(tasks);
    const delayedTasks = tasks.filter(isTaskDelayed).map((t) => ({
      id: t.id,
      task_uid: t.task_uid,
      title: t.title,
      due_date: t.due_date,
      kanban_column: t.kanban_column,
    }));
    const taskSummary = getTaskSummaryForTasks(tasks);
    const sprintSummary = this.sprintService.getSummary(projectId);

    // Sync completion from bucket-based task progress
    const actualCompletion = taskProgress;
    const completionVariance = actualCompletion - expectedCompletion;
    if (completionVariance < -15) timelineStatus = 'behind';
    else if (completionVariance < -5) timelineStatus = 'at_risk';

    return {
      project,
      financials,
      timeline: {
        plannedDays,
        elapsedDays,
        adherencePercent: Math.round(100 + completionVariance),
        status: timelineStatus,
        deliverablesPlanned: project.deliverables_planned,
        deliverablesActual: project.deliverables_actual,
        deliverablesAdherence,
      },
      cost: {
        planned: Math.round(plannedCost),
        actual: Math.round(actualCost),
        variance: Math.round(costVariance),
        status: costStatus,
      },
      completion: {
        planned: project.planned_completion_percent,
        actual: actualCompletion,
        variance: Math.round(actualCompletion - project.planned_completion_percent),
        taskBased: true,
      },
      allocations,
      timeLogs,
      tasks,
      resourceRequests,
      suggestions: this.generateSuggestions(project, allocations, resources, financials.grossMargin),
      documentationLinks,
      bucketBreakdown,
      delayedTasks,
      taskSummary,
      taskProgress,
      sprintSummary,
    };
  }

  previewMargin(
    projectData: Partial<Project> & { budget: number; start_date: string; end_date: string },
    draftAllocations: Array<{ resource_id: number; allocation_percentage: number; start_date: string; end_date: string }>
  ) {
    const resources = this.resourceRepo.findAll({ status: 'active' });
    return previewFinancials(projectData, draftAllocations, resources);
  }

  generateSuggestions(
    project: Project,
    allocations: Allocation[],
    resources: Resource[],
    grossMargin: number
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const today = formatDate(new Date());
    const plannedDays = project.duration_days || workingDaysInRange(project.start_date, project.end_date);
    const elapsedDays = today >= project.start_date
      ? Math.min(workingDaysInRange(project.start_date, today), plannedDays)
      : 0;
    const expectedCompletion = plannedDays > 0 ? (elapsedDays / plannedDays) * 100 : 0;

    if (project.actual_completion_percent < expectedCompletion - 10) {
      const available = resources
        .filter((r) => {
          const util = getCurrentUtilizationForResource(r);
          return util < 70 && !allocations.some((a) => a.resource_id === r.id);
        })
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          name: r.name,
          designation: r.designation,
          available: Math.round(100 - getCurrentUtilizationForResource(r)),
        }));

      suggestions.push({
        type: 'timeline',
        severity: 'high',
        title: 'Timeline at Risk',
        message: `Project is ${Math.round(expectedCompletion - project.actual_completion_percent)}% behind planned progress. Consider adding resources to recover schedule.`,
        actions: [
          'Add 1-2 senior developers at 50% allocation',
          'Reprioritize backlog to focus on critical deliverables',
          'Extend timeline by 2 weeks with client approval',
        ],
        availableResources: available,
      });
    }

    if (allocations.length < 2 && project.status === 'active') {
      const available = resources
        .filter((r) => getCurrentUtilizationForResource(r) < 60)
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          name: r.name,
          designation: r.designation,
          available: Math.round(100 - getCurrentUtilizationForResource(r)),
        }));

      suggestions.push({
        type: 'resource',
        severity: 'medium',
        title: 'Understaffed Project',
        message: 'This project has fewer than 2 allocated resources. Adding team members can improve delivery velocity.',
        actions: ['Review skill matrix for available developers', 'Submit resource requests for partially allocated staff'],
        availableResources: available,
      });
    }

    if (grossMargin < 30) {
      suggestions.push({
        type: 'margin',
        severity: 'high',
        title: 'Critical Margin — Below 30%',
        message: `Gross margin is ${grossMargin}% (target: 50%+). Immediate cost control required.`,
        actions: [
          'Reduce non-essential software licenses and cloud spend',
          'Renegotiate scope — defer Phase 2 features to a follow-on SOW',
          'Replace senior resources with mid-level where tasks allow',
          'Increase project revenue via approved change request (+15%)',
          'Optimize allocation — reduce overlapping roles by 10-15%',
        ],
      });
    } else if (grossMargin < 50) {
      suggestions.push({
        type: 'cost',
        severity: 'medium',
        title: 'Margin Below Target',
        message: `Gross margin is ${grossMargin}%. Target is 50%+. Review cost structure.`,
        actions: [
          'Audit hardware and desk allocation costs',
          'Review time logs for scope creep',
          'Consider fixed-scope change control for new requests',
        ],
      });
    }

    if (project.actual_cost > project.planned_cost && project.planned_cost > 0) {
      const overrun = Math.round(((project.actual_cost - project.planned_cost) / project.planned_cost) * 100);
      suggestions.push({
        type: 'cost',
        severity: overrun > 15 ? 'high' : 'medium',
        title: 'Cost Overrun Detected',
        message: `Actual cost exceeds planned by ${overrun}%. Review resource utilization and overhead.`,
        actions: [
          'Freeze new resource additions until margin recovers',
          'Conduct weekly cost review with delivery lead',
          'Bill additional hours to client if T&M clauses apply',
        ],
      });
    }

    return suggestions;
  }

  analyzeResourceRequest(
    requestingProjectId: number,
    resourceId: number,
    requestedPercent: number
  ) {
    const resource = this.resourceRepo.findById(resourceId);
    if (!resource) throw new AppError(404, 'Resource not found');

    const today = formatDate(new Date());
    const { allocated, capacity } = getResourceUtilizationForDate(resourceId, today);
    const available = Math.max(0, capacity - allocated);

    const existingAllocs = this.allocationRepo.findAll({ resource_id: resourceId });
    const sourceProject = existingAllocs.length > 0
      ? this.projectRepo.findById(existingAllocs[0].project_id)
      : null;

    const requestingProject = this.projectRepo.findById(requestingProjectId);
    if (!requestingProject) throw new AppError(404, 'Requesting project not found');

    const resources = this.resourceRepo.findAll({ status: 'active' });

    const currentRequestingAllocs = this.allocationRepo.findAll({ project_id: requestingProjectId });
    const currentSourceAllocs = sourceProject
      ? this.allocationRepo.findAll({ project_id: sourceProject.id })
      : [];

    const newRequestingAllocs = [
      ...currentRequestingAllocs,
      {
        resource_id: resourceId,
        allocation_percentage: requestedPercent,
        start_date: requestingProject.start_date,
        end_date: requestingProject.end_date,
      },
    ];

    const requestingMarginBefore = calculateProjectFinancials(
      requestingProject, currentRequestingAllocs, resources
    );
    const requestingMarginAfter = previewFinancials(
      requestingProject,
      newRequestingAllocs.map((a) => ({
        resource_id: a.resource_id,
        allocation_percentage: a.allocation_percentage,
        start_date: a.start_date,
        end_date: a.end_date,
      })),
      resources
    );

    let sourceImpact = null;
    if (sourceProject && existingAllocs.length > 0) {
      const sourceMarginBefore = calculateProjectFinancials(
        sourceProject, currentSourceAllocs, resources
      );
      sourceImpact = {
        projectName: sourceProject.name,
        currentAllocation: existingAllocs[0].allocation_percentage,
        afterAllocation: Math.max(0, existingAllocs[0].allocation_percentage - requestedPercent),
        marginBefore: sourceMarginBefore.grossMargin,
        marginAfter: sourceMarginBefore.grossMargin,
        warning: requestedPercent > available
          ? `Resource only has ${available}% available capacity`
          : null,
      };
    }

    return {
      resource: { id: resource.id, name: resource.name, availableCapacity: available },
      requestingProject: {
        name: requestingProject.name,
        marginBefore: requestingMarginBefore.grossMargin,
        marginAfter: requestingMarginAfter.grossMargin,
        marginChange: Math.round((requestingMarginAfter.grossMargin - requestingMarginBefore.grossMargin) * 10) / 10,
      },
      sourceProject: sourceImpact,
      feasible: requestedPercent <= available,
    };
  }

  createFullProject(data: {
    project: Record<string, unknown>;
    allocations?: Array<{ resource_id: number; allocation_percentage: number; start_date: string; end_date: string }>;
    tasks?: Array<{ title: string; description?: string; kanban_column?: string; assignee_id?: number; planned_hours?: number }>;
    documentationLinks?: string[];
  }) {
    const links = JSON.stringify(data.documentationLinks || []);
    const project = this.projectRepo.create({
      status: 'active',
      project_type: 'fixed_cost',
      monthly_rate: 0,
      software_cost: 0,
      hardware_cost: 0,
      desk_cost: 0,
      office_cost: 0,
      board_type: 'internal',
      documentation_files: '[]',
      planned_completion_percent: 0,
      actual_completion_percent: 0,
      deliverables_planned: 0,
      deliverables_actual: 0,
      planned_cost: 0,
      actual_cost: 0,
      ...data.project,
      documentation_links: links,
    });

    if (data.allocations) {
      for (const alloc of data.allocations) {
        this.allocationRepo.create({ ...alloc, project_id: project.id });
      }
    }

    if (data.tasks) {
      for (const task of data.tasks) {
        this.taskRepo.create({ ...task, project_id: project.id });
      }
    }

    const resources = this.resourceRepo.findAll({ status: 'active' });
    const allocs = this.allocationRepo.findAll({ project_id: project.id });
    const financials = calculateProjectFinancials(project, allocs, resources);
    this.projectRepo.update(project.id, { planned_cost: financials.totalCost });

    return this.getDashboard(project.id);
  }
}
