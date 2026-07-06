import { getDb } from '../database/connection';
import { TimeLog } from '../types';

export class TimeLogRepository {
  private baseQuery = `
    SELECT tl.*, r.name as resource_name
    FROM time_logs tl
    JOIN resources r ON tl.resource_id = r.id
  `;

  findByProject(projectId: number): TimeLog[] {
    return getDb()
      .prepare(`${this.baseQuery} WHERE tl.project_id = ? ORDER BY tl.log_date DESC`)
      .all(projectId) as unknown as TimeLog[];
  }

  create(data: {
    project_id: number;
    resource_id: number;
    log_date: string;
    hours: number;
    description?: string | null;
  }): TimeLog {
    const result = getDb()
      .prepare(
        `INSERT INTO time_logs (project_id, resource_id, log_date, hours, description)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(data.project_id, data.resource_id, data.log_date, data.hours, data.description ?? null);

    return getDb()
      .prepare(`${this.baseQuery} WHERE tl.id = ?`)
      .get(result.lastInsertRowid) as unknown as TimeLog;
  }

  getTotalHoursByProject(projectId: number): number {
    const row = getDb()
      .prepare('SELECT COALESCE(SUM(hours), 0) as total FROM time_logs WHERE project_id = ?')
      .get(projectId) as { total: number };
    return row.total;
  }
}
