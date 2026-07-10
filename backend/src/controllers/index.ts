import { Request, Response } from 'express';
import { Project } from '../types';
import { AllocationRepository } from '../repositories/allocationRepository';
import { LeaveRepository } from '../repositories/leaveRepository';
import { LookupRepository } from '../repositories/lookupRepository';
import { ProjectRepository } from '../repositories/projectRepository';
import { ResourceRepository } from '../repositories/resourceRepository';
import {
  AllocationService,
  DashboardService,
  ForecastService,
  HeatmapService,
  ReportService,
  SkillMatrixService,
} from '../services';
import { ProjectWorkflowService } from '../services/projectWorkflowService';
import { ProjectTaskRepository } from '../repositories/projectTaskRepository';
import { ResourceRequestRepository } from '../repositories/resourceRequestRepository';
import { handleError } from '../utils/errors';
import { parseId } from '../utils/params';
import { PROJECT_FINANCIAL_KEYS, omitFinancialFields } from '../utils/financialAccess';
import { canViewProjectFinancials } from '../utils/permissions';
import { stripResourcesFinancials } from '../utils/financialAccess';
import { getCurrentUtilizationForResource } from '../utils/capacity';
import {
  allocationSchema, fullProjectSchema, leaveSchema, marginPreviewSchema,
  projectSchema, projectTaskSchema, resourceRequestSchema, resourceSchema,
} from '../utils/validation';
import * as XLSX from 'xlsx';

const resourceRepo = new ResourceRepository();
const projectRepo = new ProjectRepository();
const leaveRepo = new LeaveRepository();
const lookupRepo = new LookupRepository();
const allocationService = new AllocationService();
const dashboardService = new DashboardService();
const heatmapService = new HeatmapService();
const forecastService = new ForecastService();
const skillMatrixService = new SkillMatrixService();
const reportService = new ReportService();
const workflowService = new ProjectWorkflowService();
const taskRepo = new ProjectTaskRepository();
const requestRepo = new ResourceRequestRepository();

function stripProjectForUser(project: Project, req: Request): Project {
  if (!req.user || canViewProjectFinancials(req.user, project.id)) return project;
  return omitFinancialFields(project as unknown as Record<string, unknown>, PROJECT_FINANCIAL_KEYS) as unknown as Project;
}

function enrichResourceCapacity<T extends { id: number; status: string }>(resource: T) {
  if (resource.status !== 'active') {
    return { ...resource, booked_percent: 0, available_percent: 0 };
  }
  const booked = getCurrentUtilizationForResource(resource as Parameters<typeof getCurrentUtilizationForResource>[0]);
  return {
    ...resource,
    booked_percent: booked,
    available_percent: Math.round((100 - Math.min(booked, 100)) * 10) / 10,
  };
}

export const resourceController = {
  list(req: Request, res: Response) {
    try {
      const { search, skill_id, department_id, status } = req.query;
      const resources = resourceRepo.findAll({
        search: search as string,
        skill_id: skill_id ? parseInt(skill_id as string) : undefined,
        department_id: department_id ? parseInt(department_id as string) : undefined,
        status: status as string,
      });
      const enriched = resources.map(enrichResourceCapacity);
      res.json(req.user ? stripResourcesFinancials(enriched, req.user) : enriched);
    } catch (e) {
      handleError(e, res);
    }
  },

  get(req: Request, res: Response) {
    try {
      const resource = resourceRepo.findById(parseId(req.params.id));
      if (!resource) return res.status(404).json({ error: 'Resource not found' });
      const enriched = enrichResourceCapacity(resource);
      res.json(req.user ? stripResourcesFinancials([enriched], req.user)[0] : enriched);
    } catch (e) {
      handleError(e, res);
    }
  },

  create(req: Request, res: Response) {
    try {
      const data = resourceSchema.parse(req.body);
      const resource = resourceRepo.create(data);
      res.status(201).json(resource);
    } catch (e) {
      handleError(e, res);
    }
  },

  update(req: Request, res: Response) {
    try {
      const data = resourceSchema.partial().parse(req.body);
      const resource = resourceRepo.update(parseId(req.params.id), data);
      if (!resource) return res.status(404).json({ error: 'Resource not found' });
      res.json(resource);
    } catch (e) {
      handleError(e, res);
    }
  },

  archive(req: Request, res: Response) {
    try {
      const resource = resourceRepo.archive(parseId(req.params.id));
      if (!resource) return res.status(404).json({ error: 'Resource not found' });
      res.json(resource);
    } catch (e) {
      handleError(e, res);
    }
  },
};

export const projectController = {
  list(req: Request, res: Response) {
    try {
      const status = req.query.status as string | undefined;
      const projects = req.user
        ? projectRepo.findAllForUser(req.user.id, req.user.role, status)
        : projectRepo.findAll(status);
      res.json(projects.map((p) => stripProjectForUser(p, req)));
    } catch (e) {
      handleError(e, res);
    }
  },

  get(req: Request, res: Response) {
    try {
      const project = projectRepo.findById(parseId(req.params.id));
      if (!project) return res.status(404).json({ error: 'Project not found' });
      res.json(stripProjectForUser(project, req));
    } catch (e) {
      handleError(e, res);
    }
  },

  create(req: Request, res: Response) {
    try {
      const data = projectSchema.parse(req.body);
      if (data.start_date > data.end_date) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }
      const payload = {
        ...data,
        owner_user_id: req.user?.role === 'pm' ? req.user.id : req.user?.id ?? null,
      };
      const project = projectRepo.create(payload as Record<string, unknown>);
      res.status(201).json(stripProjectForUser(project, req));
    } catch (e) {
      handleError(e, res);
    }
  },

  update(req: Request, res: Response) {
    try {
      const data = projectSchema.partial().parse(req.body);
      const project = projectRepo.update(parseId(req.params.id), data);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      res.json(stripProjectForUser(project, req));
    } catch (e) {
      handleError(e, res);
    }
  },

  archive(req: Request, res: Response) {
    try {
      const project = projectRepo.archive(parseId(req.params.id));
      if (!project) return res.status(404).json({ error: 'Project not found' });
      res.json(project);
    } catch (e) {
      handleError(e, res);
    }
  },
};

export const allocationController = {
  list(req: Request, res: Response) {
    try {
      const filters: { resource_id?: number; project_id?: number } = {};
      if (req.query.resource_id) filters.resource_id = parseInt(req.query.resource_id as string);
      if (req.query.project_id) filters.project_id = parseInt(req.query.project_id as string);
      res.json(allocationService.findAll(filters));
    } catch (e) {
      handleError(e, res);
    }
  },

  get(req: Request, res: Response) {
    try {
      res.json(allocationService.findById(parseId(req.params.id)));
    } catch (e) {
      handleError(e, res);
    }
  },

  create(req: Request, res: Response) {
    try {
      const data = allocationSchema.parse(req.body);
      const result = allocationService.create(data);
      res.status(201).json(result);
    } catch (e) {
      handleError(e, res);
    }
  },

  update(req: Request, res: Response) {
    try {
      const data = allocationSchema.partial().parse(req.body);
      const result = allocationService.update(parseId(req.params.id), data);
      res.json(result);
    } catch (e) {
      handleError(e, res);
    }
  },

  delete(req: Request, res: Response) {
    try {
      res.json(allocationService.delete(parseId(req.params.id)));
    } catch (e) {
      handleError(e, res);
    }
  },
};

export const leaveController = {
  list(req: Request, res: Response) {
    try {
      const resourceId = req.query.resource_id ? parseInt(req.query.resource_id as string) : undefined;
      res.json(leaveRepo.findAll(resourceId));
    } catch (e) {
      handleError(e, res);
    }
  },

  get(req: Request, res: Response) {
    try {
      const leave = leaveRepo.findById(parseId(req.params.id));
      if (!leave) return res.status(404).json({ error: 'Leave not found' });
      res.json(leave);
    } catch (e) {
      handleError(e, res);
    }
  },

  create(req: Request, res: Response) {
    try {
      const data = leaveSchema.parse(req.body);
      if (data.start_date > data.end_date) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }
      const leave = leaveRepo.create(data);
      res.status(201).json(leave);
    } catch (e) {
      handleError(e, res);
    }
  },

  update(req: Request, res: Response) {
    try {
      const data = leaveSchema.partial().parse(req.body);
      const leave = leaveRepo.update(parseId(req.params.id), data);
      if (!leave) return res.status(404).json({ error: 'Leave not found' });
      res.json(leave);
    } catch (e) {
      handleError(e, res);
    }
  },

  delete(req: Request, res: Response) {
    try {
      if (!leaveRepo.delete(parseId(req.params.id))) {
        return res.status(404).json({ error: 'Leave not found' });
      }
      res.json({ success: true });
    } catch (e) {
      handleError(e, res);
    }
  },
};

export const lookupController = {
  departments(_req: Request, res: Response) {
    res.json(lookupRepo.findAllDepartments());
  },
  skills(_req: Request, res: Response) {
    res.json(lookupRepo.findAllSkills());
  },
  employmentTypes(_req: Request, res: Response) {
    res.json(lookupRepo.findAllEmploymentTypes());
  },
};

export const dashboardController = {
  get(req: Request, res: Response) {
    try {
      const projectId = req.query.project_id ? parseInt(req.query.project_id as string, 10) : undefined;
      res.json(dashboardService.getDashboard(projectId));
    } catch (e) {
      handleError(e, res);
    }
  },
};

export const heatmapController = {
  get(req: Request, res: Response) {
    try {
      const weeks = req.query.weeks ? parseInt(req.query.weeks as string) : 8;
      res.json(heatmapService.getHeatmap(weeks));
    } catch (e) {
      handleError(e, res);
    }
  },
};

export const forecastController = {
  get(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const validDays = ([30, 60, 90] as const).includes(days as 30 | 60 | 90) ? (days as 30 | 60 | 90) : 30;
      res.json(forecastService.getForecast(validDays));
    } catch (e) {
      handleError(e, res);
    }
  },
};

export const skillMatrixController = {
  get(req: Request, res: Response) {
    try {
      res.json(
        skillMatrixService.getMatrix(
          req.query.skill as string,
          req.query.role as string
        )
      );
    } catch (e) {
      handleError(e, res);
    }
  },
};

function toCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export const reportController = {
  get(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const format = (req.query.format as string) || 'json';

      let data: unknown;
      switch (type) {
        case 'resource-utilization':
          data = reportService.getResourceUtilizationReport();
          break;
        case 'project-allocation':
          data = reportService.getProjectAllocationReport();
          break;
        case 'capacity':
          data = reportService.getCapacityReport();
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }

      if (format === 'json') {
        return res.json(data);
      }

      const flatData = Array.isArray(data)
        ? data.map((item) => {
            if (typeof item === 'object' && item !== null) {
              const flat: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(item)) {
                flat[k] = typeof v === 'object' ? JSON.stringify(v) : v;
              }
              return flat;
            }
            return { value: item };
          })
        : [{ data: JSON.stringify(data) }];

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}.csv"`);
        return res.send(toCsv(flatData as Record<string, unknown>[]));
      }

      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(flatData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${type}.xlsx"`);
        return res.send(buffer);
      }

      res.status(400).json({ error: 'Invalid format. Use json, csv, or xlsx' });
    } catch (e) {
      handleError(e, res);
    }
  },
};

export const projectWorkflowController = {
  getDashboard(req: Request, res: Response) {
    try {
      const projectId = parseId(req.params.id);
      const dash = workflowService.getDashboard(projectId);
      if (req.user && !canViewProjectFinancials(req.user, projectId)) {
        const { financials, cost, suggestions, ...safe } = dash;
        return res.json({
          ...safe,
          suggestions: suggestions.filter((s) => s.type !== 'margin' && s.type !== 'cost'),
        });
      }
      res.json(dash);
    } catch (e) {
      handleError(e, res);
    }
  },

  previewMargin(req: Request, res: Response) {
    try {
      const data = marginPreviewSchema.parse(req.body);
      res.json(workflowService.previewMargin(data.project, data.allocations));
    } catch (e) {
      handleError(e, res);
    }
  },

  createFull(req: Request, res: Response) {
    try {
      const data = fullProjectSchema.parse(req.body);
      const dashboard = workflowService.createFullProject(data);
      res.status(201).json(dashboard);
    } catch (e) {
      handleError(e, res);
    }
  },

  analyzeRequest(req: Request, res: Response) {
    try {
      const { requesting_project_id, resource_id, requested_allocation_percent } = req.body;
      res.json(workflowService.analyzeResourceRequest(
        requesting_project_id, resource_id, requested_allocation_percent
      ));
    } catch (e) {
      handleError(e, res);
    }
  },

  listTasks(req: Request, res: Response) {
    try {
      res.json(taskRepo.findByProject(parseId(req.params.id)));
    } catch (e) {
      handleError(e, res);
    }
  },

  createTask(req: Request, res: Response) {
    try {
      const data = projectTaskSchema.parse(req.body);
      const payload = {
        ...data,
        tags: Array.isArray(data.tags) ? JSON.stringify(data.tags) : data.tags,
        links: Array.isArray(data.links) ? JSON.stringify(data.links) : data.links,
        attachments: Array.isArray(data.attachments) ? JSON.stringify(data.attachments) : data.attachments,
      };
      res.status(201).json(taskRepo.create(payload));
    } catch (e) {
      handleError(e, res);
    }
  },

  updateTask(req: Request, res: Response) {
    try {
      const body = { ...req.body };
      if (Array.isArray(body.tags)) body.tags = JSON.stringify(body.tags);
      if (Array.isArray(body.links)) body.links = JSON.stringify(body.links);
      if (Array.isArray(body.attachments)) body.attachments = JSON.stringify(body.attachments);
      const task = taskRepo.update(parseId(req.params.taskId), body);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (e) {
      handleError(e, res);
    }
  },

  addTaskComment(req: Request, res: Response) {
    try {
      const { author, text } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: 'Comment text is required' });
      const task = taskRepo.addComment(parseId(req.params.taskId), author || 'PM', text.trim());
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (e) {
      handleError(e, res);
    }
  },

  deleteTask(req: Request, res: Response) {
    try {
      if (!taskRepo.delete(parseId(req.params.taskId))) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({ success: true });
    } catch (e) {
      handleError(e, res);
    }
  },

  listRequests(req: Request, res: Response) {
    try {
      const projectId = req.query.project_id ? parseInt(req.query.project_id as string) : undefined;
      res.json(requestRepo.findAll(projectId));
    } catch (e) {
      handleError(e, res);
    }
  },

  createRequest(req: Request, res: Response) {
    try {
      const data = resourceRequestSchema.parse(req.body);
      res.status(201).json(requestRepo.create(data));
    } catch (e) {
      handleError(e, res);
    }
  },

  updateRequestStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      const request = requestRepo.updateStatus(parseId(req.params.id), status);
      if (!request) return res.status(404).json({ error: 'Request not found' });
      res.json(request);
    } catch (e) {
      handleError(e, res);
    }
  },
};
