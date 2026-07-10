import { AlertTriangle } from 'lucide-react';
import type { ProjectTask, KanbanColumn } from '../types';
import { isDelayed, BUCKETS } from './TaskModal';

const COLUMN_COLORS: Record<string, string> = {
  product_backlog: 'border-t-gray-400',
  ready_for_dev: 'border-t-slate-400',
  sprint_backlog: 'border-t-blue-400',
  work_in_progress: 'border-t-yellow-400',
  testing: 'border-t-orange-400',
  ready_staging_review: 'border-t-purple-400',
  pushed_to_production: 'border-t-green-500',
  icebox: 'border-t-cyan-400',
};

function normalizeColumn(col: string): string {
  const map: Record<string, string> = {
    backlog: 'product_backlog',
    todo: 'ready_for_dev',
    in_progress: 'work_in_progress',
    review: 'ready_staging_review',
    done: 'pushed_to_production',
    blocked: 'work_in_progress',
  };
  return map[col] || col;
}

interface KanbanBoardProps {
  tasks: ProjectTask[];
  onMoveTask?: (taskId: number, column: KanbanColumn) => void;
  onTaskClick?: (task: ProjectTask) => void;
  readOnly?: boolean;
  activeSprintId?: number | null;
  onAssignToSprint?: (taskId: number) => void;
  onRemoveFromSprint?: (taskId: number) => void;
}

export function KanbanBoard({ tasks, onMoveTask, onTaskClick, readOnly, activeSprintId, onAssignToSprint, onRemoveFromSprint }: KanbanBoardProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {BUCKETS.map((col) => {
        const colTasks = tasks.filter((t) => normalizeColumn(t.kanban_column) === col.key);
        return (
          <div
            key={col.key}
            className={`min-w-[180px] flex-shrink-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 ${COLUMN_COLORS[col.key] || 'border-t-gray-400'} border-t-4`}
          >
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-xs font-semibold leading-tight sm:text-sm">{col.label}</span>
              <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">{colTasks.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  role={onTaskClick ? 'button' : undefined}
                  tabIndex={onTaskClick ? 0 : undefined}
                  onClick={() => onTaskClick?.(task)}
                  onKeyDown={(e) => e.key === 'Enter' && onTaskClick?.(task)}
                  className={`rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm dark:border-gray-600 dark:bg-gray-900 ${onTaskClick ? 'cursor-pointer hover:border-brand-300' : ''}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-medium leading-snug sm:text-sm">{task.title}</p>
                    {isDelayed(task) && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" aria-label="Past due" />}
                  </div>
                  {task.task_uid && <p className="mt-0.5 text-[10px] text-gray-400">{task.task_uid}</p>}
                  {task.sprint_id && activeSprintId && task.sprint_id === activeSprintId && (
                    <span className="mt-1 inline-block rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">Sprint</span>
                  )}
                  {task.assignee_name && <p className="mt-1 text-xs text-gray-500">{task.assignee_name}</p>}
                  {task.due_date && (
                    <p className={`mt-1 text-[10px] ${isDelayed(task) ? 'font-medium text-red-500' : 'text-gray-400'}`}>
                      Due {task.due_date}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-gray-400">
                    <span>{task.actual_hours}/{task.planned_hours}h</span>
                    <div className="flex items-center gap-1">
                      {activeSprintId && !readOnly && onAssignToSprint && onRemoveFromSprint && (
                        task.sprint_id === activeSprintId ? (
                          <button type="button" className="text-[10px] text-gray-500 hover:text-red-500"
                            onClick={(e) => { e.stopPropagation(); onRemoveFromSprint(task.id); }}>
                            Remove
                          </button>
                        ) : (
                          <button type="button" className="text-[10px] text-brand-600 hover:underline"
                            onClick={(e) => { e.stopPropagation(); onAssignToSprint(task.id); }}>
                            + Sprint
                          </button>
                        )
                      )}
                      {!readOnly && onMoveTask && col.key !== 'pushed_to_production' && (
                        <select
                          className="max-w-[90px] rounded border border-gray-200 bg-transparent text-[10px] dark:border-gray-600"
                          value={normalizeColumn(task.kanban_column)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onMoveTask(task.id, e.target.value as KanbanColumn)}
                        >
                          {BUCKETS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
