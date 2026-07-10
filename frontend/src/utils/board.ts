import type { KanbanColumn, ProjectTask } from '../types';

export const PRODUCT_BACKLOG = 'product_backlog' as const;
export const READY_FOR_DEV = 'ready_for_dev' as const;

export const SPRINT_KANBAN_BUCKETS: { key: KanbanColumn; label: string }[] = [
  { key: 'sprint_backlog', label: 'Sprint Backlog' },
  { key: 'work_in_progress', label: 'Work in Progress' },
  { key: 'ready_staging_review', label: 'Ready in Staging' },
  { key: 'pushed_to_production', label: 'Pushed to Production' },
  { key: 'icebox', label: 'Icebox' },
];

const LEGACY_MAP: Record<string, KanbanColumn> = {
  backlog: 'product_backlog',
  todo: 'ready_for_dev',
  in_progress: 'work_in_progress',
  review: 'ready_staging_review',
  done: 'pushed_to_production',
};

export function normalizeColumn(col: string): KanbanColumn {
  return (LEGACY_MAP[col] || col) as KanbanColumn;
}

export function isDelayed(task: ProjectTask): boolean {
  if (!task.due_date) return false;
  if (normalizeColumn(task.kanban_column) === 'pushed_to_production') return false;
  return task.due_date < new Date().toISOString().split('T')[0];
}

export function countWeekdays(start: string, end: string): number {
  const days: string[] = [];
  let d = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (d <= endD) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return days.length;
}

export function endDateFromWeekdays(start: string, weekdays: number): string {
  let d = new Date(start + 'T00:00:00');
  let counted = 0;
  while (counted < weekdays) {
    if (d.getDay() !== 0 && d.getDay() !== 6) counted++;
    if (counted < weekdays) d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

export function inferSprintLabel(workingDays: number): string {
  if (workingDays >= 8) return `2-week sprint (${workingDays} working days)`;
  return `1-week sprint (${workingDays} working days)`;
}
