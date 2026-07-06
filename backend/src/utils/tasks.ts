import { ProjectTask } from '../types';
import { formatDate } from './dates';

export const KANBAN_BUCKETS = [
  { key: 'product_backlog', label: 'Product Backlog', short: 'Backlog' },
  { key: 'ready_for_dev', label: 'Ready for Dev', short: 'Ready' },
  { key: 'sprint_backlog', label: 'Sprint Backlog', short: 'Sprint' },
  { key: 'work_in_progress', label: 'Work in Progress', short: 'WIP' },
  { key: 'testing', label: 'Testing', short: 'Test' },
  { key: 'ready_staging_review', label: 'Ready in Staging/Review', short: 'Staging' },
  { key: 'pushed_to_production', label: 'Pushed to Production', short: 'Done' },
  { key: 'icebox', label: 'Icebox', short: 'Icebox' },
] as const;

export type KanbanBucketKey = (typeof KANBAN_BUCKETS)[number]['key'];

/** Completion weight per bucket — pushed_to_production = 100% */
const BUCKET_WEIGHT: Record<string, number> = {
  icebox: 0,
  product_backlog: 5,
  ready_for_dev: 15,
  sprint_backlog: 25,
  work_in_progress: 50,
  testing: 70,
  ready_staging_review: 85,
  pushed_to_production: 100,
  // legacy column mapping
  backlog: 5,
  todo: 15,
  in_progress: 50,
  review: 85,
  done: 100,
  blocked: 50,
};

export function normalizeBucket(column: string): string {
  const map: Record<string, string> = {
    backlog: 'product_backlog',
    todo: 'ready_for_dev',
    in_progress: 'work_in_progress',
    review: 'ready_staging_review',
    done: 'pushed_to_production',
    blocked: 'work_in_progress',
  };
  return map[column] || column;
}

export function calculateTaskProgress(tasks: ProjectTask[]): number {
  if (tasks.length === 0) return 0;
  const total = tasks.reduce((sum, t) => {
    const col = normalizeBucket(t.kanban_column);
    return sum + (BUCKET_WEIGHT[col] ?? 0);
  }, 0);
  return Math.round(total / tasks.length);
}

export function isTaskDelayed(task: ProjectTask): boolean {
  if (!task.due_date) return false;
  const col = normalizeBucket(task.kanban_column);
  if (col === 'pushed_to_production') return false;
  return task.due_date < formatDate(new Date());
}

export function getTaskSummaryForTasks(tasks: ProjectTask[]) {
  const normalized = tasks.map((t) => ({ ...t, kanban_column: normalizeBucket(t.kanban_column) }));
  return {
    delivered: normalized.filter((t) => t.kanban_column === 'pushed_to_production').length,
    inProgress: normalized.filter((t) =>
      ['work_in_progress', 'testing', 'ready_staging_review'].includes(t.kanban_column)
    ).length,
    delayed: tasks.filter(isTaskDelayed).length,
    planned: normalized.filter((t) =>
      ['product_backlog', 'ready_for_dev', 'sprint_backlog', 'icebox'].includes(t.kanban_column)
    ).length,
    total: tasks.length,
  };
}

export function getBucketBreakdown(tasks: ProjectTask[]) {
  return KANBAN_BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    count: tasks.filter((t) => normalizeBucket(t.kanban_column) === b.key).length,
  }));
}

export function generateTaskUid(projectId: number, seq: number): string {
  return `TASK-${projectId}-${String(seq).padStart(4, '0')}`;
}

export interface TaskComment {
  id: string;
  author: string;
  text: string;
  created_at: string;
}

export function parseComments(json: string | null | undefined): TaskComment[] {
  try {
    return JSON.parse(json || '[]');
  } catch {
    return [];
  }
}

export function parseJsonArray(json: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(json || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
