import { z } from 'zod';

export const resourceSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  designation: z.string().min(1).max(100),
  department_id: z.number().int().positive(),
  cost_per_day: z.number().min(0),
  employment_type_id: z.number().int().positive(),
  capacity_percentage: z.number().int().min(0).max(100).default(100),
  joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['active', 'archived']).optional(),
  skill_ids: z.array(z.number().int().positive()).optional(),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(200),
  client_name: z.string().min(1).max(200),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['active', 'on_hold', 'completed', 'archived']).optional(),
  budget: z.number().min(0),
  description: z.string().optional().nullable(),
  duration_days: z.number().int().positive().optional().nullable(),
  project_type: z.enum(['fixed_cost', 'monthly', 'time_and_materials']).optional(),
  monthly_rate: z.number().min(0).optional(),
  software_cost: z.number().min(0).optional(),
  hardware_cost: z.number().min(0).optional(),
  desk_cost: z.number().min(0).optional(),
  office_cost: z.number().min(0).optional(),
  documentation_links: z.string().optional(),
  external_board_url: z.string().optional().nullable(),
  board_type: z.enum(['internal', 'trello', 'asana', 'zoho', 'none']).optional(),
  planned_completion_percent: z.number().min(0).max(100).optional(),
  actual_completion_percent: z.number().min(0).max(100).optional(),
  deliverables_planned: z.number().int().min(0).optional(),
  deliverables_actual: z.number().int().min(0).optional(),
  actual_cost: z.number().min(0).optional(),
  planned_cost: z.number().min(0).optional(),
});

export const projectTaskSchema = z.object({
  project_id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(['planned', 'in_progress', 'delivered', 'blocked']).optional(),
  assignee_id: z.number().int().positive().optional().nullable(),
  planned_start: z.string().optional().nullable(),
  planned_end: z.string().optional().nullable(),
  planned_hours: z.number().min(0).optional(),
  kanban_column: z.enum([
    'product_backlog', 'ready_for_dev', 'sprint_backlog', 'work_in_progress',
    'testing', 'ready_staging_review', 'pushed_to_production', 'icebox',
  ]).optional(),
  due_date: z.string().optional().nullable(),
  reminder_date: z.string().optional().nullable(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  links: z.union([z.string(), z.array(z.string())]).optional(),
  attachments: z.union([z.string(), z.array(z.string())]).optional(),
});

export const resourceRequestSchema = z.object({
  requesting_project_id: z.number().int().positive(),
  source_project_id: z.number().int().positive().optional().nullable(),
  resource_id: z.number().int().positive(),
  requested_allocation_percent: z.number().int().min(1).max(100),
  message: z.string().optional().nullable(),
});

export const marginPreviewSchema = z.object({
  project: projectSchema,
  allocations: z.array(z.object({
    resource_id: z.number().int().positive(),
    allocation_percentage: z.number().int().min(1).max(100),
    start_date: z.string(),
    end_date: z.string(),
  })),
});

export const fullProjectSchema = z.object({
  project: projectSchema,
  allocations: z.array(z.object({
    resource_id: z.number().int().positive(),
    allocation_percentage: z.number().int().min(1).max(100),
    start_date: z.string(),
    end_date: z.string(),
  })).optional(),
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    kanban_column: z.string().optional(),
    assignee_id: z.number().optional(),
    planned_hours: z.number().optional(),
  })).optional(),
  documentationLinks: z.array(z.string()).optional(),
});

export const allocationSchema = z.object({
  resource_id: z.number().int().positive(),
  project_id: z.number().int().positive(),
  allocation_percentage: z.number().int().min(1).max(100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const leaveSchema = z.object({
  resource_id: z.number().int().positive(),
  leave_type: z.enum(['vacation', 'sick_leave', 'holiday', 'training']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional().nullable(),
});
