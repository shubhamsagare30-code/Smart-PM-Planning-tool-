import { getDb } from './connection';
import { ProjectTaskRepository } from '../repositories/projectTaskRepository';
import { KANBAN_BUCKETS } from '../utils/tasks';

type ProjectHealth = 'healthy' | 'at_risk';

interface TaskDef {
  title: string;
  column: string;
  hours: number;
  assigneeIdx: number;
  dueOffsetDays: number; // negative = overdue for at_risk
  tags: string[];
}

function makeTasks(projectName: string, health: ProjectHealth, assignees: number[], projectId?: number): number {
  const taskRepo = new ProjectTaskRepository();
  const db = getDb();
  const project = projectId
    ? { id: projectId }
    : db.prepare('SELECT id FROM projects WHERE name = ?').get(projectName) as { id: number } | undefined;
  if (!project) return 0;

  db.prepare('DELETE FROM project_tasks WHERE project_id = ?').run(project.id);

  const today = new Date();
  const due = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const healthyDistribution: TaskDef[] = [
    { title: 'Product vision & requirements doc', column: 'pushed_to_production', hours: 24, assigneeIdx: 0, dueOffsetDays: -14, tags: ['planning'] },
    { title: 'Technical architecture design', column: 'pushed_to_production', hours: 32, assigneeIdx: 0, dueOffsetDays: -7, tags: ['architecture'] },
    { title: 'API contract definition', column: 'ready_staging_review', hours: 20, assigneeIdx: 1, dueOffsetDays: 3, tags: ['api'] },
    { title: 'Core feature implementation', column: 'testing', hours: 48, assigneeIdx: 1, dueOffsetDays: 7, tags: ['dev'] },
    { title: 'UI component library setup', column: 'work_in_progress', hours: 36, assigneeIdx: 1, dueOffsetDays: 10, tags: ['frontend'] },
    { title: 'Database schema migration', column: 'work_in_progress', hours: 28, assigneeIdx: 0, dueOffsetDays: 12, tags: ['backend'] },
    { title: 'Integration test suite', column: 'sprint_backlog', hours: 24, assigneeIdx: 2, dueOffsetDays: 18, tags: ['qa'] },
    { title: 'Performance benchmarking', column: 'sprint_backlog', hours: 16, assigneeIdx: 2, dueOffsetDays: 21, tags: ['perf'] },
    { title: 'Security review checklist', column: 'ready_for_dev', hours: 12, assigneeIdx: 0, dueOffsetDays: 25, tags: ['security'] },
    { title: 'User documentation draft', column: 'ready_for_dev', hours: 16, assigneeIdx: 2, dueOffsetDays: 28, tags: ['docs'] },
    { title: 'Accessibility audit', column: 'product_backlog', hours: 20, assigneeIdx: 1, dueOffsetDays: 35, tags: ['a11y'] },
    { title: 'Mobile responsive layout', column: 'product_backlog', hours: 24, assigneeIdx: 1, dueOffsetDays: 40, tags: ['frontend'] },
    { title: 'Analytics instrumentation', column: 'product_backlog', hours: 12, assigneeIdx: 0, dueOffsetDays: 45, tags: ['analytics'] },
    { title: 'Release runbook', column: 'icebox', hours: 8, assigneeIdx: 0, dueOffsetDays: 60, tags: ['ops'] },
    { title: 'Phase 2 feature brainstorm', column: 'icebox', hours: 4, assigneeIdx: 2, dueOffsetDays: 90, tags: ['future'] },
    { title: 'Stakeholder demo preparation', column: 'testing', hours: 8, assigneeIdx: 2, dueOffsetDays: 5, tags: ['demo'] },
  ];

  const atRiskDistribution: TaskDef[] = [
    { title: 'Legacy system audit', column: 'pushed_to_production', hours: 80, assigneeIdx: 0, dueOffsetDays: -30, tags: ['audit'] },
    { title: 'API gateway PoC', column: 'pushed_to_production', hours: 64, assigneeIdx: 1, dueOffsetDays: -20, tags: ['infra'] },
    { title: 'Account service extraction', column: 'work_in_progress', hours: 120, assigneeIdx: 0, dueOffsetDays: -5, tags: ['migration'] },
    { title: 'Payment module refactor', column: 'work_in_progress', hours: 96, assigneeIdx: 2, dueOffsetDays: -3, tags: ['migration'] },
    { title: 'Regulatory compliance review', column: 'testing', hours: 48, assigneeIdx: 3, dueOffsetDays: -2, tags: ['compliance'] },
    { title: 'Data migration scripts v2', column: 'sprint_backlog', hours: 80, assigneeIdx: 1, dueOffsetDays: -1, tags: ['data'] },
    { title: 'COBOL bridge adapter', column: 'ready_for_dev', hours: 64, assigneeIdx: 2, dueOffsetDays: 5, tags: ['legacy'] },
    { title: 'Load testing at scale', column: 'product_backlog', hours: 40, assigneeIdx: 2, dueOffsetDays: 10, tags: ['perf'] },
    { title: 'Disaster recovery plan', column: 'product_backlog', hours: 24, assigneeIdx: 1, dueOffsetDays: 15, tags: ['ops'] },
    { title: 'Security pen test remediation', column: 'ready_for_dev', hours: 32, assigneeIdx: 3, dueOffsetDays: -4, tags: ['security'] },
    { title: 'UAT sign-off coordination', column: 'sprint_backlog', hours: 16, assigneeIdx: 0, dueOffsetDays: 7, tags: ['uat'] },
    { title: 'Production cutover checklist', column: 'product_backlog', hours: 56, assigneeIdx: 0, dueOffsetDays: 20, tags: ['release'] },
    { title: 'Technical debt sprint', column: 'work_in_progress', hours: 40, assigneeIdx: 1, dueOffsetDays: -7, tags: ['debt'] },
    { title: 'Monitoring & alerting setup', column: 'ready_staging_review', hours: 28, assigneeIdx: 2, dueOffsetDays: 2, tags: ['ops'] },
    { title: 'Stakeholder status report', column: 'testing', hours: 8, assigneeIdx: 3, dueOffsetDays: 1, tags: ['reporting'] },
    { title: 'Future state architecture', column: 'icebox', hours: 16, assigneeIdx: 0, dueOffsetDays: 60, tags: ['future'] },
  ];

  let templates = health === 'at_risk' ? atRiskDistribution : healthyDistribution;

  if (!projectName.includes('Browser') && !projectName.includes('Legacy')) {
    templates = healthyDistribution.map((t, i) => ({
      ...t,
      title: `${t.title} — ${projectName}`.slice(0, 55),
      column: health === 'at_risk' && i >= 10 ? atRiskDistribution[i % atRiskDistribution.length].column : t.column,
      dueOffsetDays: health === 'at_risk' && i >= 8 ? -Math.abs(t.dueOffsetDays % 7) - 1 : t.dueOffsetDays,
    }));
  }

  for (const [i, t] of templates.entries()) {
    const assignee = assignees[t.assigneeIdx % assignees.length] ?? assignees[0];
    taskRepo.create({
      project_id: project.id,
      title: t.title,
      description: `Task for ${projectName}. Track progress through agile buckets.`,
      kanban_column: t.column,
      assignee_id: assignee,
      planned_hours: t.hours,
      status: t.column === 'pushed_to_production' ? 'delivered' : t.column === 'work_in_progress' ? 'in_progress' : 'planned',
      sort_order: i,
      due_date: due(t.dueOffsetDays),
      reminder_date: due(t.dueOffsetDays - 2),
      tags: JSON.stringify(t.tags),
      links: JSON.stringify([]),
      attachments: JSON.stringify([]),
    });
  }

  return templates.length;
}

export function seedProjectTasks(projectId: number, projectName: string, assignees: number[], health: ProjectHealth) {
  return makeTasks(projectName, health, assignees, projectId);
}

export function seedAllProjectTasks() {
  const db = getDb();
  const projects = db.prepare("SELECT id, name FROM projects WHERE status != 'archived'").all() as { id: number; name: string }[];
  let total = 0;

  for (const p of projects) {
    const allocRows = db.prepare('SELECT resource_id FROM allocations WHERE project_id = ? LIMIT 4').all(p.id) as { resource_id: number }[];
    let assignees = allocRows.map((r) => r.resource_id);
    if (assignees.length === 0) {
      const any = db.prepare('SELECT id FROM resources LIMIT 3').all() as { id: number }[];
      assignees = any.map((r) => r.id);
    }
    const health: ProjectHealth =
      p.name.includes('Legacy') || p.name.includes('Modernization') ? 'at_risk' : 'healthy';
    total += makeTasks(p.name, health, assignees);
  }

  console.log(`Seeded ${total} tasks across ${projects.length} projects (${KANBAN_BUCKETS.length} buckets).`);
  return total;
}
