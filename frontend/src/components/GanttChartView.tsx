import { useMemo } from 'react';
import type { ProjectTask, SprintProgressItem } from '../types';
import { normalizeColumn } from '../utils/board';

interface GanttChartViewProps {
  tasks: ProjectTask[];
  activeSprint: SprintProgressItem | null;
  onTaskClick?: (task: ProjectTask) => void;
}

function parseDate(s: string) {
  return new Date(s + 'T00:00:00').getTime();
}

function formatShort(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function GanttChartView({ tasks, activeSprint, onTaskClick }: GanttChartViewProps) {
  const { rangeStart, rangeEnd, rows } = useMemo(() => {
    const sprintTasks = activeSprint
      ? tasks.filter((t) => t.sprint_id === activeSprint.id)
      : tasks.filter((t) => {
          const c = normalizeColumn(t.kanban_column);
          return !['product_backlog', 'ready_for_dev'].includes(c);
        });

    if (sprintTasks.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      return { rangeStart: today, rangeEnd: today, rows: [] as Array<{ task: ProjectTask; start: string; end: string }> };
    }

    const rows = sprintTasks.map((task) => {
      const start =
        task.planned_start ||
        (activeSprint && task.sprint_id === activeSprint.id ? activeSprint.start_date : null) ||
        task.due_date ||
        new Date().toISOString().split('T')[0];
      const end = task.planned_end || task.due_date || start;
      return { task, start: start <= end ? start : end, end: start <= end ? end : start };
    });

    const allDates = rows.flatMap((r) => [r.start, r.end]);
    if (activeSprint) allDates.push(activeSprint.start_date, activeSprint.end_date);
    const sorted = allDates.sort();
    return { rangeStart: sorted[0], rangeEnd: sorted[sorted.length - 1], rows };
  }, [tasks, activeSprint]);

  const totalMs = Math.max(parseDate(rangeEnd) - parseDate(rangeStart), 86400000);

  const weeks: string[] = [];
  let d = new Date(rangeStart + 'T00:00:00');
  const endD = new Date(rangeEnd + 'T00:00:00');
  while (d <= endD) {
    weeks.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 7);
  }

  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        {activeSprint ? 'Add tasks to the active sprint to see the Gantt chart.' : 'Start a sprint to view the timeline.'}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mb-2 flex border-b border-gray-200 pb-2 text-[10px] text-gray-400 dark:border-gray-700">
          <div className="w-44 shrink-0" />
          <div className="relative flex-1">
            {weeks.map((w) => {
              const left = ((parseDate(w) - parseDate(rangeStart)) / totalMs) * 100;
              return (
                <span key={w} className="absolute" style={{ left: `${Math.min(left, 95)}%` }}>
                  {formatShort(w)}
                </span>
              );
            })}
          </div>
        </div>

        {activeSprint && (
          <div className="mb-3 flex items-center text-xs text-brand-700 dark:text-brand-300">
            <div className="w-44 shrink-0 font-medium">{activeSprint.name}</div>
            <div className="relative h-2 flex-1 rounded bg-brand-100 dark:bg-brand-900/30">
              <div className="absolute inset-y-0 left-0 right-0 rounded bg-brand-400/40" />
            </div>
            <span className="ml-2 shrink-0 text-gray-500">{formatShort(activeSprint.start_date)} – {formatShort(activeSprint.end_date)}</span>
          </div>
        )}

        {rows.map(({ task, start, end }) => {
          const left = ((parseDate(start) - parseDate(rangeStart)) / totalMs) * 100;
          const width = Math.max(((parseDate(end) - parseDate(start)) / totalMs) * 100, 2);
          const done = normalizeColumn(task.kanban_column) === 'pushed_to_production';
          return (
            <div key={task.id} className="mb-2 flex items-center gap-2">
              <button
                type="button"
                className="w-44 shrink-0 truncate text-left text-xs font-medium hover:text-brand-600"
                onClick={() => onTaskClick?.(task)}
              >
                {task.title}
              </button>
              <div className="relative h-6 flex-1 rounded bg-gray-100 dark:bg-gray-800">
                <div
                  className={`absolute top-1 h-4 rounded ${done ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${start} → ${end}`}
                />
              </div>
              <span className="w-20 shrink-0 text-[10px] text-gray-400">{task.assignee_name || '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
