import { ProjectTaskRepository } from '../repositories/projectTaskRepository';
import { SprintRepository } from '../repositories/sprintRepository';
import { ProjectSprint, SprintProgressItem, SprintSummary } from '../types';
import { AppError } from '../utils/errors';
import {
  endDateFromWorkingDays,
  formatDate,
  inferSprintWeeks,
  remainingWorkingDays,
  workingDaysInRange,
} from '../utils/dates';
import { normalizeBucket } from '../utils/tasks';

export class SprintService {
  private sprintRepo = new SprintRepository();
  private taskRepo = new ProjectTaskRepository();

  list(projectId: number) {
    const sprints = this.sprintRepo.findByProject(projectId);
    const active = this.sprintRepo.findActive(projectId);
    const today = formatDate(new Date());
    return {
      sprints: sprints.map((s) => this.enrichSprint(s, projectId, today)),
      activeSprint: active ? this.enrichSprint(active, projectId, today) : null,
    };
  }

  getSummary(projectId: number): SprintSummary {
    const { sprints, activeSprint } = this.list(projectId);
    const closed = sprints.filter((s) => s.status === 'closed');
    return {
      total: closed.length,
      successful: closed.filter((s) => s.outcome === 'success').length,
      partial: closed.filter((s) => s.outcome === 'partial').length,
      failed: closed.filter((s) => s.outcome === 'failed').length,
      active: activeSprint,
      sprints,
    };
  }

  create(
    projectId: number,
    data: { start_date: string; end_date?: string; working_days?: number; name?: string; activate?: boolean }
  ) {
    let endDate = data.end_date;
    let workingDays = data.working_days;

    if (endDate) {
      workingDays = workingDaysInRange(data.start_date, endDate);
    } else if (workingDays) {
      endDate = endDateFromWorkingDays(data.start_date, workingDays);
    } else {
      workingDays = 5;
      endDate = endDateFromWorkingDays(data.start_date, 5);
    }

    const durationWeeks = inferSprintWeeks(workingDays);
    const count = this.sprintRepo.countByProject(projectId);
    const name = data.name?.trim() || `Sprint ${count + 1}`;
    const status = data.activate ? 'active' : 'planned';

    const sprint = this.sprintRepo.create({
      project_id: projectId,
      name,
      start_date: data.start_date,
      end_date: endDate,
      duration_weeks: durationWeeks,
      working_days: workingDays,
      status,
    });

    if (data.activate) {
      this.sprintRepo.deactivateOthers(projectId, sprint.id);
    }
    return sprint;
  }

  activate(projectId: number, sprintId: number) {
    const sprint = this.sprintRepo.findById(sprintId);
    if (!sprint || sprint.project_id !== projectId) throw new AppError(404, 'Sprint not found');
    this.sprintRepo.deactivateOthers(projectId, sprintId);
    return this.sprintRepo.updateStatus(sprintId, 'active');
  }

  close(projectId: number, sprintId: number) {
    const sprint = this.sprintRepo.findById(sprintId);
    if (!sprint || sprint.project_id !== projectId) throw new AppError(404, 'Sprint not found');

    const tasks = this.taskRepo.findByProject(projectId).filter((t) => t.sprint_id === sprintId);
    const completed = tasks.filter((t) => normalizeBucket(t.kanban_column) === 'pushed_to_production').length;
    let outcome: ProjectSprint['outcome'] = 'failed';
    if (tasks.length === 0) outcome = 'partial';
    else if (completed === tasks.length) outcome = 'success';
    else if (completed > 0) outcome = 'partial';

    this.sprintRepo.updateOutcome(sprintId, outcome);
    return this.sprintRepo.updateStatus(sprintId, 'closed');
  }

  assignTask(projectId: number, sprintId: number, taskId: number) {
    const sprint = this.sprintRepo.findById(sprintId);
    if (!sprint || sprint.project_id !== projectId) throw new AppError(404, 'Sprint not found');
    if (sprint.status !== 'active') throw new AppError(400, 'Sprint must be active to add tasks');

    const task = this.taskRepo.findById(taskId);
    if (!task || task.project_id !== projectId) throw new AppError(404, 'Task not found');
    const col = normalizeBucket(task.kanban_column);
    if (col !== 'ready_for_dev') {
      throw new AppError(400, 'Only Ready for Dev tasks can be added to a sprint');
    }

    return this.taskRepo.update(taskId, { sprint_id: sprintId, kanban_column: 'sprint_backlog' });
  }

  removeTask(projectId: number, taskId: number) {
    const task = this.taskRepo.findById(taskId);
    if (!task || task.project_id !== projectId) throw new AppError(404, 'Task not found');
    const col = normalizeBucket(task.kanban_column);
    const backColumn = col === 'pushed_to_production' ? 'pushed_to_production' : 'ready_for_dev';
    return this.taskRepo.update(taskId, {
      sprint_id: null,
      kanban_column: backColumn === 'pushed_to_production' ? col : 'ready_for_dev',
    });
  }

  getSprintTasks(projectId: number, sprintId: number) {
    const sprint = this.sprintRepo.findById(sprintId);
    if (!sprint || sprint.project_id !== projectId) throw new AppError(404, 'Sprint not found');
    return this.taskRepo.findByProject(projectId).filter((t) => t.sprint_id === sprintId);
  }

  private enrichSprint(sprint: ProjectSprint, projectId: number, today: string): SprintProgressItem {
    const tasks = this.taskRepo.findByProject(projectId).filter((t) => t.sprint_id === sprint.id);
    const completed = tasks.filter((t) => normalizeBucket(t.kanban_column) === 'pushed_to_production').length;
    const wd = sprint.working_days ?? workingDaysInRange(sprint.start_date, sprint.end_date);
    const remaining =
      sprint.status === 'active' ? remainingWorkingDays(today, sprint.end_date) : null;

    return {
      id: sprint.id,
      name: sprint.name,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      status: sprint.status,
      outcome: sprint.outcome,
      working_days: wd,
      totalTasks: tasks.length,
      completedTasks: completed,
      progressPercent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      remainingWorkingDays: remaining,
    };
  }
}
