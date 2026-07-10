import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Flag, GanttChart, Kanban, Play, Plus, Square, Timer } from 'lucide-react';
import { projectsApi, sprintsApi } from '../api';
import { GanttChartView } from './GanttChartView';
import { SprintKanbanBoard } from './SprintKanbanBoard';
import { TaskLane } from './TaskLane';
import type { KanbanColumn, ProjectTask, SprintProgressItem } from '../types';
import {
  PRODUCT_BACKLOG, READY_FOR_DEV, countWeekdays, endDateFromWeekdays, inferSprintLabel, normalizeColumn,
} from '../utils/board';

type BoardView = 'kanban' | 'gantt';

interface ProjectBoardProps {
  projectId: number;
  tasks: ProjectTask[];
  onRefresh: () => void;
  onTaskClick: (task: ProjectTask) => void;
  onAddTask: () => void;
}

export function ProjectBoard({ projectId, tasks, onRefresh, onTaskClick, onAddTask }: ProjectBoardProps) {
  const [view, setView] = useState<BoardView>('kanban');
  const [sprints, setSprints] = useState<SprintProgressItem[]>([]);
  const [activeSprint, setActiveSprint] = useState<SprintProgressItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [sprintName, setSprintName] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSprints = useCallback(() => {
    setLoading(true);
    sprintsApi.list(projectId).then((data) => {
      setSprints(data.sprints as SprintProgressItem[]);
      setActiveSprint(data.activeSprint as SprintProgressItem | null);
    }).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { loadSprints(); }, [loadSprints]);

  const workingDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    return countWeekdays(startDate, endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    if (!endDate && startDate) {
      setEndDate(endDateFromWeekdays(startDate, 5));
    }
  }, [startDate, endDate]);

  const productBacklog = tasks.filter((t) => normalizeColumn(t.kanban_column) === PRODUCT_BACKLOG);
  const readyForDev = tasks.filter(
    (t) => normalizeColumn(t.kanban_column) === READY_FOR_DEV && !t.sprint_id
  );
  const sprintTasks = activeSprint
    ? tasks.filter((t) => t.sprint_id === activeSprint.id)
    : [];

  const moveTask = async (taskId: number, column: KanbanColumn) => {
    await projectsApi.updateTask(projectId, taskId, { kanban_column: column });
    onRefresh();
  };

  const promoteToReady = async (taskId: number) => {
    await moveTask(taskId, READY_FOR_DEV);
  };

  const addToSprint = async (taskId: number) => {
    if (!activeSprint) return;
    await sprintsApi.assignTask(projectId, activeSprint.id, taskId);
    onRefresh();
    loadSprints();
  };

  const createSprint = async (activate: boolean) => {
    await sprintsApi.create(projectId, {
      start_date: startDate,
      end_date: endDate,
      name: sprintName.trim() || undefined,
      activate,
    });
    setShowCreate(false);
    setSprintName('');
    loadSprints();
    onRefresh();
  };

  const handleActivate = async (sprintId: number) => {
    await sprintsApi.activate(projectId, sprintId);
    loadSprints();
    onRefresh();
  };

  const handleClose = async () => {
    if (!activeSprint) return;
    await sprintsApi.close(projectId, activeSprint.id);
    loadSprints();
    onRefresh();
  };

  if (loading) return <div className="text-sm text-gray-500">Loading board...</div>;

  return (
    <div className="space-y-5">
      {/* View toggle + sprint header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === 'kanban' ? 'bg-brand-600 text-white' : 'text-gray-500'}`}
          >
            <Kanban className="h-3.5 w-3.5" /> Kanban View
          </button>
          <button
            type="button"
            onClick={() => setView('gantt')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${view === 'gantt' ? 'bg-brand-600 text-white' : 'text-gray-500'}`}
          >
            <GanttChart className="h-3.5 w-3.5" /> Gantt Chart View
          </button>
        </div>
        <button type="button" onClick={onAddTask} className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {/* Sprint bar */}
      <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-900/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-brand-800 dark:text-brand-300">
              <Flag className="h-4 w-4" /> Active Sprint
            </h4>
            {activeSprint ? (
              <>
                <p className="mt-1 text-sm">
                  <span className="font-medium">{activeSprint.name}</span>
                  {' · '}
                  <Calendar className="inline h-3.5 w-3.5" /> {activeSprint.start_date} → {activeSprint.end_date}
                  {' · '}{activeSprint.working_days} working days
                </p>
                {activeSprint.remainingWorkingDays !== null && (
                  <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${activeSprint.remainingWorkingDays <= 2 ? 'text-red-600' : 'text-brand-700 dark:text-brand-300'}`}>
                    <Timer className="h-4 w-4" />
                    {activeSprint.remainingWorkingDays === 0
                      ? 'Sprint ends today'
                      : `${activeSprint.remainingWorkingDays} working day${activeSprint.remainingWorkingDays === 1 ? '' : 's'} remaining`}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Sprint progress: {activeSprint.completedTasks}/{activeSprint.totalTasks} tasks ({activeSprint.progressPercent}%)
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-gray-500">No active sprint — plan Ready for Dev tasks, then start a sprint.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSprint && (
              <button type="button" onClick={handleClose} className="btn-secondary text-xs">
                <Square className="h-3.5 w-3.5" /> Close sprint
              </button>
            )}
            <button type="button" onClick={() => setShowCreate(!showCreate)} className="btn-primary text-xs">
              <Plus className="h-3.5 w-3.5" /> New sprint
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Sprint name (optional)</label>
              <input className="input" placeholder="Sprint 1" value={sprintName} onChange={(e) => setSprintName(e.target.value)} />
            </div>
            <div>
              <label className="label">Start date</label>
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">End date</label>
              <input className="input" type="date" value={endDate} min={startDate}
                onChange={(e) => setEndDate(e.target.value)} />
              {workingDays > 0 && (
                <p className="mt-1 text-xs text-brand-600">{inferSprintLabel(workingDays)}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
              <button type="button" disabled={workingDays < 1} onClick={() => createSprint(true)} className="btn-primary text-sm">
                <Play className="h-4 w-4" /> Start sprint
              </button>
              <button type="button" disabled={workingDays < 1} onClick={() => createSprint(false)} className="btn-secondary text-sm">
                Save as planned
              </button>
            </div>
          </div>
        )}

        {!activeSprint && sprints.filter((s) => s.status !== 'closed').length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {sprints.filter((s) => s.status !== 'closed').map((s) => (
              <button key={s.id} type="button" onClick={() => handleActivate(s.id)}
                className="rounded-full border px-3 py-1 text-xs hover:border-brand-400">
                <Play className="mr-1 inline h-3 w-3" />{s.name} ({s.start_date} → {s.end_date})
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'gantt' ? (
        <div className="card">
          <GanttChartView
            tasks={tasks}
            activeSprint={activeSprint}
            onTaskClick={onTaskClick}
          />
        </div>
      ) : (
        <>
          {/* Step 1: Product Backlog */}
          <TaskLane
            title="Product Backlog"
            subtitle="All planned work for this project — groom and prioritize here"
            tasks={productBacklog}
            empty="No items in product backlog — add a task to get started"
            onTaskClick={onTaskClick}
            accent="border-t-gray-500"
            renderActions={(task) => (
              <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => promoteToReady(task.id)}>
                → Ready for Dev
              </button>
            )}
          />

          {/* Step 2: Ready for Dev */}
          <TaskLane
            title="Ready for Dev"
            subtitle="Refined tasks ready for the team — only pull what fits sprint capacity"
            tasks={readyForDev}
            empty="Move tasks from Product Backlog when they are ready for development"
            onTaskClick={onTaskClick}
            accent="border-t-slate-500"
            renderActions={(task) => (
              activeSprint ? (
                <button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={() => addToSprint(task.id)}>
                  + Add to sprint ({activeSprint.name})
                </button>
              ) : (
                <span className="text-[10px] text-gray-400">Start a sprint to pull tasks</span>
              )
            )}
          />

          {/* Step 3: Sprint execution kanban */}
          <section>
            <h4 className="mb-2 text-sm font-semibold">
              Sprint Board
              {activeSprint ? ` — ${activeSprint.name}` : ''}
            </h4>
            {!activeSprint ? (
              <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600">
                Start a sprint to run: Sprint Backlog → WIP → Staging → Production → Icebox
              </p>
            ) : sprintTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No tasks in this sprint yet — add from Ready for Dev above (e.g. 6 of 10 if bandwidth allows).
              </p>
            ) : (
              <SprintKanbanBoard
                tasks={sprintTasks}
                onMoveTask={moveTask}
                onTaskClick={onTaskClick}
              />
            )}
            {activeSprint && sprintTasks.length > 0 && (
              <p className="mt-2 text-xs text-gray-400">
                Tip: Tasks in Ready for Dev stay out of the sprint until you explicitly add them.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
