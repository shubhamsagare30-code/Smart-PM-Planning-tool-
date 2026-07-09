import { ProjectTaskRepository } from '../repositories/projectTaskRepository';
import { ProjectRepository } from '../repositories/projectRepository';
import { StandupRepository } from '../repositories/standupRepository';
import { ProjectTask, StandupAgenda, StandupDecision, StandupSession } from '../types';
import { formatDate } from '../utils/dates';
import { isTaskDelayed, normalizeBucket } from '../utils/tasks';

const WIP_BUCKETS = ['work_in_progress', 'testing', 'ready_staging_review'];

export class StandupService {
  private standupRepo = new StandupRepository();
  private taskRepo = new ProjectTaskRepository();
  private projectRepo = new ProjectRepository();

  getOrCreateSession(projectId: number, sessionDate: string, userId?: number) {
    let session = this.standupRepo.findSession(projectId, sessionDate);
    if (!session) {
      session = this.standupRepo.createSession({
        project_id: projectId,
        session_date: sessionDate,
        created_by_user_id: userId ?? null,
      });
    }
    const agenda = this.buildAgenda(projectId, sessionDate, session);
    const decisions = this.standupRepo.listDecisions(session.id);
    const parking = this.standupRepo.listParking(session.id);
    const history = this.standupRepo.listSessions(projectId, 14);
    const project = this.projectRepo.findById(projectId);

    return {
      session,
      agenda,
      decisions,
      parking,
      history,
      projectName: project?.name ?? `Project ${projectId}`,
    };
  }

  buildAgenda(projectId: number, sessionDate: string, session: StandupSession): StandupAgenda {
    const tasks = this.taskRepo.findByProject(projectId);
    const lastSession = this.standupRepo.getLastSessionBefore(projectId, sessionDate);
    const sinceDate = lastSession?.session_date ?? this.daysAgo(sessionDate, 1);

    const doneSinceLastStandup = tasks.filter((t) => {
      const col = normalizeBucket(t.kanban_column);
      if (col !== 'pushed_to_production') return false;
      const updated = (t.updated_at || '').split('T')[0];
      return updated >= sinceDate && updated <= sessionDate;
    });

    const dueToday = tasks.filter(
      (t) => t.due_date === sessionDate && normalizeBucket(t.kanban_column) !== 'pushed_to_production'
    );

    const overdue = tasks.filter(isTaskDelayed);

    const inProgress = tasks.filter((t) => WIP_BUCKETS.includes(normalizeBucket(t.kanban_column)));

    const blocked = tasks.filter((t) => t.status === 'blocked');

    const peopleRound = this.buildPeopleRound(tasks, sessionDate);

    return {
      sessionDate,
      sinceDate,
      doneSinceLastStandup: doneSinceLastStandup.map(this.taskBrief),
      dueToday: dueToday.map(this.taskBrief),
      overdue: overdue.map(this.taskBrief),
      inProgress: inProgress.map(this.taskBrief),
      blocked: blocked.map(this.taskBrief),
      peopleRound,
    };
  }

  private buildPeopleRound(tasks: ProjectTask[], sessionDate: string) {
    const byAssignee = new Map<string, { name: string; today: ProjectTask[]; wip: ProjectTask[] }>();

    for (const t of tasks) {
      const name = t.assignee_name || 'Unassigned';
      if (!byAssignee.has(name)) byAssignee.set(name, { name, today: [], wip: [] });
      const entry = byAssignee.get(name)!;
      const col = normalizeBucket(t.kanban_column);
      if (t.due_date === sessionDate && col !== 'pushed_to_production') entry.today.push(t);
      if (WIP_BUCKETS.includes(col)) entry.wip.push(t);
    }

    return Array.from(byAssignee.values())
      .filter((e) => e.today.length > 0 || e.wip.length > 0)
      .map((e) => ({
        name: e.name,
        today: e.today.map(this.taskBrief),
        inProgress: e.wip.map(this.taskBrief),
      }));
  }

  private taskBrief(t: ProjectTask) {
    return {
      id: t.id,
      task_uid: t.task_uid,
      title: t.title,
      assignee_name: t.assignee_name,
      due_date: t.due_date,
      kanban_column: t.kanban_column,
      planned_hours: t.planned_hours,
      status: t.status,
    };
  }

  private daysAgo(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - days);
    return formatDate(d);
  }

  updateSession(sessionId: number, data: Parameters<StandupRepository['updateSession']>[1]) {
    return this.standupRepo.updateSession(sessionId, data);
  }

  addDecision(sessionId: number, data: Parameters<StandupRepository['addDecision']>[1]) {
    return this.standupRepo.addDecision(sessionId, data);
  }

  deleteDecision(id: number) {
    return this.standupRepo.deleteDecision(id);
  }

  addParking(sessionId: number, text: string) {
    return this.standupRepo.addParking(sessionId, text);
  }

  resolveParking(id: number, resolved: boolean) {
    return this.standupRepo.resolveParking(id, resolved);
  }

  buildEmailDraft(
    projectName: string,
    session: StandupSession,
    agenda: StandupAgenda,
    decisions: StandupDecision[]
  ) {
    const lines: string[] = [
      `Daily Standup Summary — ${projectName}`,
      `Date: ${session.session_date}`,
      '',
      '=== COMPLETED SINCE LAST STANDUP ===',
      ...(agenda.doneSinceLastStandup.length
        ? agenda.doneSinceLastStandup.map((t) => `• ${t.title} (${t.task_uid || t.id})`)
        : ['• (none recorded)']),
      '',
      "=== TODAY'S DELIVERABLES ===",
      ...(agenda.dueToday.length
        ? agenda.dueToday.map((t) => `• ${t.title} — ${t.assignee_name || 'Unassigned'}`)
        : ['• Nothing due today']),
      '',
      '=== OVERDUE ===',
      ...(agenda.overdue.length
        ? agenda.overdue.map((t) => `• ${t.title} (due ${t.due_date}) — ${t.assignee_name || 'Unassigned'}`)
        : ['• None']),
      '',
      '=== IN PROGRESS ===',
      ...(agenda.inProgress.length
        ? agenda.inProgress.map((t) => `• ${t.title} — ${t.assignee_name || 'Unassigned'}`)
        : ['• (none)']),
      '',
      '=== BLOCKERS ===',
      ...(agenda.blocked.length
        ? agenda.blocked.map((t) => `• ${t.title}`)
        : ['• None']),
      '',
      '=== DECISIONS & ACTIONS ===',
      ...(decisions.length
        ? decisions.map(
            (d) =>
              `• DECISION: ${d.decision}\n  ACTION: ${d.action || '—'} | Owner: ${d.owner_name || '—'} | Due: ${d.due_date || '—'}`
          )
        : ['• None recorded']),
      '',
      '=== NOTES ===',
      session.notes || '(none)',
      '',
      '— Generated by Smart PM',
    ];

    const subject = encodeURIComponent(`Daily Standup — ${projectName} — ${session.session_date}`);
    const body = encodeURIComponent(lines.join('\n'));
    return {
      subject: `Daily Standup — ${projectName} — ${session.session_date}`,
      body: lines.join('\n'),
      mailto: `mailto:?subject=${subject}&body=${body}`,
    };
  }

  getMorningBriefing(projectIds: number[]) {
    const today = formatDate(new Date());
    const projects = projectIds
      .map((id) => this.projectRepo.findById(id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.status !== 'archived');

    const items = projects.map((p) => {
      const tasks = this.taskRepo.findByProject(p.id);
      const dueToday = tasks.filter(
        (t) => t.due_date === today && normalizeBucket(t.kanban_column) !== 'pushed_to_production'
      );
      const overdue = tasks.filter(isTaskDelayed);
      const blocked = tasks.filter((t) => t.status === 'blocked');
      const session = this.standupRepo.findSession(p.id, today);
      return {
        projectId: p.id,
        projectName: p.name,
        status: p.status,
        dueTodayCount: dueToday.length,
        overdueCount: overdue.length,
        blockedCount: blocked.length,
        standupPrepared: !!session,
        topDueToday: dueToday.slice(0, 3).map((t) => t.title),
        topOverdue: overdue.slice(0, 2).map((t) => t.title),
      };
    });

    return {
      date: today,
      totalDueToday: items.reduce((s, i) => s + i.dueTodayCount, 0),
      totalOverdue: items.reduce((s, i) => s + i.overdueCount, 0),
      projectsNeedingAttention: items.filter((i) => i.overdueCount > 0 || i.blockedCount > 0).length,
      items,
    };
  }
}
