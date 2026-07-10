import { getDb } from '../database/connection';
import { ProjectSprint } from '../types';

export class SprintRepository {
  findByProject(projectId: number): ProjectSprint[] {
    return getDb()
      .prepare('SELECT * FROM project_sprints WHERE project_id = ? ORDER BY start_date DESC')
      .all(projectId)
      .map((r) => this.map(r as Record<string, unknown>));
  }

  findById(id: number): ProjectSprint | null {
    const row = getDb().prepare('SELECT * FROM project_sprints WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.map(row) : null;
  }

  findActive(projectId: number): ProjectSprint | null {
    const row = getDb()
      .prepare("SELECT * FROM project_sprints WHERE project_id = ? AND status = 'active' LIMIT 1")
      .get(projectId) as Record<string, unknown> | undefined;
    return row ? this.map(row) : null;
  }

  countByProject(projectId: number): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) as c FROM project_sprints WHERE project_id = ?')
      .get(projectId) as { c: number };
    return row.c;
  }

  create(data: {
    project_id: number;
    name: string;
    start_date: string;
    end_date: string;
    duration_weeks: 1 | 2;
    working_days?: number;
    status?: ProjectSprint['status'];
  }): ProjectSprint {
    const result = getDb()
      .prepare(
        `INSERT INTO project_sprints (project_id, name, start_date, end_date, duration_weeks, working_days, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.project_id,
        data.name,
        data.start_date,
        data.end_date,
        data.duration_weeks,
        data.working_days ?? null,
        data.status ?? 'planned'
      );
    return this.findById(result.lastInsertRowid as number)!;
  }

  updateOutcome(id: number, outcome: ProjectSprint['outcome']): ProjectSprint | null {
    getDb()
      .prepare("UPDATE project_sprints SET outcome = ?, updated_at = datetime('now') WHERE id = ?")
      .run(outcome, id);
    return this.findById(id);
  }

  updateStatus(id: number, status: ProjectSprint['status']): ProjectSprint | null {
    getDb()
      .prepare("UPDATE project_sprints SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(status, id);
    return this.findById(id);
  }

  deactivateOthers(projectId: number, exceptId: number) {
    getDb()
      .prepare(
        `UPDATE project_sprints SET status = 'closed', updated_at = datetime('now')
         WHERE project_id = ? AND id != ? AND status = 'active'`
      )
      .run(projectId, exceptId);
  }

  private map(row: Record<string, unknown>): ProjectSprint {
    return {
      id: row.id as number,
      project_id: row.project_id as number,
      name: row.name as string,
      start_date: row.start_date as string,
      end_date: row.end_date as string,
      duration_weeks: row.duration_weeks as 1 | 2,
      working_days: (row.working_days as number) ?? null,
      outcome: (row.outcome as ProjectSprint['outcome']) ?? null,
      status: row.status as ProjectSprint['status'],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }
}
