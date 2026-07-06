import { getDb } from './connection';
import { AllocationRepository } from '../repositories/allocationRepository';
import { ProjectRepository } from '../repositories/projectRepository';
import { ProjectTaskRepository } from '../repositories/projectTaskRepository';
import { ResourceRepository } from '../repositories/resourceRepository';
import { ResourceRequestRepository } from '../repositories/resourceRequestRepository';
import { TimeLogRepository } from '../repositories/timeLogRepository';
import { ProjectWorkflowService } from '../services/projectWorkflowService';
import { seedAllProjectTasks } from './task-seed';

function updateWorkflowProjects() {
  const projectRepo = new ProjectRepository();
  const allocationRepo = new AllocationRepository();
  const taskRepo = new ProjectTaskRepository();
  const requestRepo = new ResourceRequestRepository();
  const workflow = new ProjectWorkflowService();

  const plugin = projectRepo.findByName('Browser Plugin Creation for PM');
  const legacy = projectRepo.findByName('Legacy System Modernization');

  if (plugin) {
    projectRepo.update(plugin.id, {
      budget: 145000,
      actual_cost: 69600,
      planned_cost: 69600,
      duration_days: 64,
      software_cost: 6500,
      hardware_cost: 4000,
      desk_cost: 4200,
      office_cost: 4800,
      actual_completion_percent: 72,
      planned_completion_percent: 75,
      deliverables_planned: 12,
      deliverables_actual: 9,
    });
    const dash = workflow.getDashboard(plugin.id);
    console.log(`Browser Plugin margin: ${dash.financials.grossMargin}% (${dash.financials.marginStatus})`);
  }

  if (legacy) {
    projectRepo.update(legacy.id, {
      actual_cost: 201600,
      planned_cost: 196000,
      actual_completion_percent: 38,
      planned_completion_percent: 55,
      deliverables_planned: 24,
      deliverables_actual: 11,
    });
    const dash = workflow.getDashboard(legacy.id);
    console.log(`Legacy Modernization margin: ${dash.financials.grossMargin}% (${dash.financials.marginStatus})`);
    console.log(`Legacy suggestions: ${dash.suggestions.length} items`);
  } else {
    console.log('Creating Legacy System Modernization project...');
    createLegacyProject(projectRepo, allocationRepo, taskRepo, requestRepo, workflow);
  }

  seedAllProjectTasks();
}

function createLegacyProject(
  projectRepo: ProjectRepository,
  allocationRepo: AllocationRepository,
  taskRepo: ProjectTaskRepository,
  requestRepo: ResourceRequestRepository,
  workflow: ProjectWorkflowService
) {
  const legacy = projectRepo.create({
    name: 'Legacy System Modernization',
    client_name: 'GlobalBank Corp',
    start_date: '2025-01-15',
    end_date: '2025-09-30',
    status: 'active',
    budget: 280000,
    description: 'Migrate monolithic banking core to microservices. High complexity, regulatory overhead, and scope creep risk.',
    duration_days: 180,
    project_type: 'fixed_cost',
    monthly_rate: 0,
    software_cost: 12000,
    hardware_cost: 8500,
    desk_cost: 3600,
    office_cost: 2500,
    planned_cost: 196000,
    actual_cost: 201600,
    documentation_links: JSON.stringify([
      'https://drive.google.com/file/d/legacy-migration-sow/view',
      'https://asana.com/project/legacy-bank-modernization/board',
    ]),
    documentation_files: '[]',
    external_board_url: 'https://asana.com/project/legacy-bank-modernization/board',
    board_type: 'asana',
    planned_completion_percent: 55,
    actual_completion_percent: 38,
    deliverables_planned: 24,
    deliverables_actual: 11,
  });

  for (const a of [
    { resource_id: 5, pct: 90, start: '2025-01-15', end: '2025-09-30' },
    { resource_id: 6, pct: 85, start: '2025-01-15', end: '2025-09-30' },
    { resource_id: 7, pct: 70, start: '2025-02-01', end: '2025-09-30' },
    { resource_id: 4, pct: 60, start: '2025-03-01', end: '2025-09-30' },
  ]) {
    allocationRepo.create({ resource_id: a.resource_id, project_id: legacy.id, allocation_percentage: a.pct, start_date: a.start, end_date: a.end });
  }

  for (const [i, t] of [
    { title: 'Domain analysis & bounded contexts', column: 'done', assignee: 5, hours: 80 },
    { title: 'API gateway setup', column: 'done', assignee: 6, hours: 64 },
    { title: 'Account service extraction', column: 'in_progress', assignee: 5, hours: 120 },
    { title: 'Payment service migration', column: 'in_progress', assignee: 7, hours: 96 },
    { title: 'Regulatory compliance audit', column: 'blocked', assignee: 4, hours: 48 },
    { title: 'Data migration scripts', column: 'todo', assignee: 6, hours: 80 },
    { title: 'Load testing & performance', column: 'backlog', assignee: 7, hours: 40 },
  ].entries()) {
    const task = taskRepo.create({ project_id: legacy.id, title: t.title, kanban_column: t.column, assignee_id: t.assignee, planned_hours: t.hours, status: t.column === 'done' ? 'delivered' : t.column === 'blocked' ? 'blocked' : 'in_progress', sort_order: i });
    taskRepo.update(task.id, { actual_hours: t.column === 'done' ? t.hours : t.hours * 0.5 });
  }

  const crmProject = projectRepo.findAll().find((p) => p.name === 'Enterprise CRM Platform');
  if (crmProject) {
    requestRepo.create({
      requesting_project_id: legacy.id,
      source_project_id: crmProject.id,
      resource_id: 1,
      requested_allocation_percent: 10,
      message: 'Need Alice for 10% architecture review support on Legacy Modernization.',
    });
  }

  const dash = workflow.getDashboard(legacy.id);
  console.log(`Legacy Modernization margin: ${dash.financials.grossMargin}% (${dash.financials.marginStatus})`);
  console.log(`Legacy suggestions: ${dash.suggestions.length} items`);
}

export function seedWorkflow() {
  const db = getDb();
  const projectRepo = new ProjectRepository();
  const allocationRepo = new AllocationRepository();
  const taskRepo = new ProjectTaskRepository();
  const timeLogRepo = new TimeLogRepository();
  const requestRepo = new ResourceRequestRepository();
  const resourceRepo = new ResourceRepository();
  const workflow = new ProjectWorkflowService();

  if (projectRepo.findByName('Browser Plugin Creation for PM')) {
    console.log('Updating existing workflow projects...');
    updateWorkflowProjects();
    return;
  }

  // Normalize costs for predictable margin calculations
  const demoCosts: Record<number, number> = { 1: 520, 2: 480, 3: 550, 4: 600, 5: 750, 6: 680, 7: 620 };
  for (const [id, cost] of Object.entries(demoCosts)) {
    db.prepare('UPDATE resources SET cost_per_day = ? WHERE id = ?').run(cost, +id);
  }

  // ─── Project 1: Browser Plugin — 52% gross margin (healthy) ───
  const plugin = projectRepo.create({
    name: 'Browser Plugin Creation for PM',
    client_name: 'Productivity Labs Inc.',
    start_date: '2025-05-01',
    end_date: '2025-08-15',
    status: 'active',
    budget: 145000,
    description: 'Build a Chrome/Firefox browser extension for project managers — resource capacity overlay, Jira quick-actions, and timeline snapshots.',
    duration_days: 64,
    project_type: 'fixed_cost',
    monthly_rate: 0,
    software_cost: 6500,
    hardware_cost: 4000,
    desk_cost: 4200,
    office_cost: 4800,
    planned_cost: 69600,
    actual_cost: 69600,
    documentation_links: JSON.stringify([
      'https://drive.google.com/file/d/1BxPm-plugin-spec/view',
      'https://drive.google.com/file/d/2CyPm-plugin-wireframes/view',
      'https://confluence.internal.com/display/PM/Browser+Plugin+PRD',
    ]),
    documentation_files: '[]',
    external_board_url: null,
    board_type: 'internal',
    planned_completion_percent: 75,
    actual_completion_percent: 72,
    deliverables_planned: 12,
    deliverables_actual: 9,
  });

  const pluginAllocs = [
    { resource_id: 1, pct: 50, start: '2025-05-01', end: '2025-08-15' },  // Alice - Lead Dev
    { resource_id: 2, pct: 65, start: '2025-05-01', end: '2025-08-15' },  // Bob - Frontend
    { resource_id: 3, pct: 35, start: '2025-05-15', end: '2025-08-15' },  // Carol - QA
  ];
  for (const a of pluginAllocs) {
    allocationRepo.create({
      resource_id: a.resource_id,
      project_id: plugin.id,
      allocation_percentage: a.pct,
      start_date: a.start,
      end_date: a.end,
    });
  }

  const pluginTasks = [
    { title: 'Extension architecture & manifest setup', column: 'done', assignee: 1, hours: 40, status: 'delivered' },
    { title: 'Jira API integration module', column: 'done', assignee: 1, hours: 56, status: 'delivered' },
    { title: 'Capacity overlay UI component', column: 'in_progress', assignee: 2, hours: 48, status: 'in_progress' },
    { title: 'Timeline snapshot feature', column: 'in_progress', assignee: 2, hours: 32, status: 'in_progress' },
    { title: 'Cross-browser testing (Chrome/Firefox)', column: 'todo', assignee: 3, hours: 24, status: 'planned' },
    { title: 'User onboarding flow', column: 'backlog', assignee: 2, hours: 20, status: 'planned' },
    { title: 'Chrome Web Store submission', column: 'backlog', assignee: 1, hours: 16, status: 'planned' },
    { title: 'Performance optimization', column: 'review', assignee: 1, hours: 24, status: 'in_progress' },
  ];
  for (const [i, t] of pluginTasks.entries()) {
    const task = taskRepo.create({
      project_id: plugin.id,
      title: t.title,
      kanban_column: t.column,
      assignee_id: t.assignee,
      planned_hours: t.hours,
      status: t.status,
      sort_order: i,
    });
    const actualH = t.column === 'done' ? t.hours : t.column === 'in_progress' ? t.hours * 0.6 : 0;
    if (actualH > 0) taskRepo.update(task.id, { actual_hours: actualH });
  }

  const pluginTimeLogs = [
    { resource_id: 1, date: '2025-05-10', hours: 32 },
    { resource_id: 1, date: '2025-05-24', hours: 40 },
    { resource_id: 1, date: '2025-06-07', hours: 36 },
    { resource_id: 2, date: '2025-05-10', hours: 38 },
    { resource_id: 2, date: '2025-05-24', hours: 42 },
    { resource_id: 2, date: '2025-06-07', hours: 35 },
    { resource_id: 3, date: '2025-06-01', hours: 24 },
  ];
  for (const log of pluginTimeLogs) {
    timeLogRepo.create({
      project_id: plugin.id,
      resource_id: log.resource_id,
      log_date: log.date,
      hours: log.hours,
      description: 'Sprint work',
    });
  }

  // ─── Project 2: Legacy Modernization — 28% margin (at risk) ───
  const legacy = projectRepo.create({
    name: 'Legacy System Modernization',
    client_name: 'GlobalBank Corp',
    start_date: '2025-01-15',
    end_date: '2025-09-30',
    status: 'active',
    budget: 280000,
    description: 'Migrate monolithic banking core to microservices. High complexity, regulatory overhead, and scope creep risk.',
    duration_days: 180,
    project_type: 'fixed_cost',
    monthly_rate: 0,
    software_cost: 12000,
    hardware_cost: 8500,
    desk_cost: 3600,
    office_cost: 2500,
    planned_cost: 196000,
    actual_cost: 201600,
    documentation_links: JSON.stringify([
      'https://drive.google.com/file/d/legacy-migration-sow/view',
      'https://asana.com/project/legacy-bank-modernization/board',
    ]),
    documentation_files: '[]',
    external_board_url: 'https://asana.com/project/legacy-bank-modernization/board',
    board_type: 'asana',
    planned_completion_percent: 55,
    actual_completion_percent: 38,
    deliverables_planned: 24,
    deliverables_actual: 11,
  });

  const legacyAllocs = [
    { resource_id: 5, pct: 90, start: '2025-01-15', end: '2025-09-30' },
    { resource_id: 6, pct: 85, start: '2025-01-15', end: '2025-09-30' },
    { resource_id: 7, pct: 70, start: '2025-02-01', end: '2025-09-30' },
    { resource_id: 4, pct: 60, start: '2025-03-01', end: '2025-09-30' },
  ];
  for (const a of legacyAllocs) {
    allocationRepo.create({
      resource_id: a.resource_id,
      project_id: legacy.id,
      allocation_percentage: a.pct,
      start_date: a.start,
      end_date: a.end,
    });
  }

  const legacyTasks = [
    { title: 'Domain analysis & bounded contexts', column: 'done', assignee: 5, hours: 80 },
    { title: 'API gateway setup', column: 'done', assignee: 6, hours: 64 },
    { title: 'Account service extraction', column: 'in_progress', assignee: 5, hours: 120 },
    { title: 'Payment service migration', column: 'in_progress', assignee: 7, hours: 96 },
    { title: 'Regulatory compliance audit', column: 'blocked', assignee: 4, hours: 48 },
    { title: 'Data migration scripts', column: 'todo', assignee: 6, hours: 80 },
    { title: 'Load testing & performance', column: 'backlog', assignee: 7, hours: 40 },
  ];
  for (const [i, t] of legacyTasks.entries()) {
    const task = taskRepo.create({
      project_id: legacy.id,
      title: t.title,
      kanban_column: t.column,
      assignee_id: t.assignee,
      planned_hours: t.hours,
      status: t.column === 'done' ? 'delivered' : t.column === 'blocked' ? 'blocked' : 'in_progress',
      sort_order: i,
    });
    taskRepo.update(task.id, { actual_hours: t.column === 'done' ? t.hours : t.hours * 0.5 });
  }

  // Resource request: Alice (90% on CRM) request 10% for another project
  const crmProject = projectRepo.findAll().find((p) => p.name === 'Enterprise CRM Platform');
  if (crmProject) {
    requestRepo.create({
      requesting_project_id: legacy.id,
      source_project_id: crmProject.id,
      resource_id: 1,
      requested_allocation_percent: 10,
      message: 'Need Alice for 10% architecture review support on Legacy Modernization. She has capacity on CRM project.',
    });
  }

  const dash1 = workflow.getDashboard(plugin.id);
  const dash2 = workflow.getDashboard(legacy.id);
  console.log(`Browser Plugin margin: ${dash1.financials.grossMargin}% (${dash1.financials.marginStatus})`);
  console.log(`Legacy Modernization margin: ${dash2.financials.grossMargin}% (${dash2.financials.marginStatus})`);
  console.log(`Legacy suggestions: ${dash2.suggestions.length} items`);
  console.log('Workflow seed complete.');
}
