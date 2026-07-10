import { AlertTriangle } from 'lucide-react';
import type { ProjectTask } from '../types';
import { isDelayed } from '../utils/board';

interface TaskLaneProps {
  title: string;
  subtitle?: string;
  tasks: ProjectTask[];
  empty: string;
  onTaskClick?: (task: ProjectTask) => void;
  renderActions?: (task: ProjectTask) => React.ReactNode;
  accent?: string;
}

export function TaskLane({ title, subtitle, tasks, empty, onTaskClick, renderActions, accent = 'border-t-gray-400' }: TaskLaneProps) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40 ${accent} border-t-4`}>
      <div className="flex items-center justify-between px-3 py-2">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">{tasks.length}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 pb-3">
        {tasks.length === 0 ? (
          <p className="py-4 text-sm text-gray-400">{empty}</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              role={onTaskClick ? 'button' : undefined}
              tabIndex={onTaskClick ? 0 : undefined}
              onClick={() => onTaskClick?.(task)}
              onKeyDown={(e) => e.key === 'Enter' && onTaskClick?.(task)}
              className={`min-w-[200px] max-w-[220px] shrink-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-600 dark:bg-gray-900 ${onTaskClick ? 'cursor-pointer hover:border-brand-300' : ''}`}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-medium leading-snug">{task.title}</p>
                {isDelayed(task) && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
              </div>
              {task.task_uid && <p className="mt-0.5 text-[10px] text-gray-400">{task.task_uid}</p>}
              {task.assignee_name && <p className="mt-1 text-xs text-gray-500">{task.assignee_name}</p>}
              {task.planned_hours > 0 && <p className="mt-1 text-[10px] text-gray-400">{task.planned_hours}h planned</p>}
              {renderActions && <div className="mt-2" onClick={(e) => e.stopPropagation()}>{renderActions(task)}</div>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
