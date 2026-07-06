import { getDb } from '../database/connection';
import { Leave } from '../types';

export class LeaveRepository {
  private baseQuery = `
    SELECT l.*, r.name as resource_name
    FROM leaves l
    JOIN resources r ON l.resource_id = r.id
  `;

  findAll(resourceId?: number): Leave[] {
    if (resourceId) {
      return getDb()
        .prepare(`${this.baseQuery} WHERE l.resource_id = ? ORDER BY l.start_date DESC`)
        .all(resourceId) as unknown as Leave[];
    }
    return getDb()
      .prepare(`${this.baseQuery} ORDER BY l.start_date DESC`)
      .all() as unknown as Leave[];
  }

  findById(id: number): Leave | null {
    return (getDb().prepare(`${this.baseQuery} WHERE l.id = ?`).get(id) as unknown as Leave) || null;
  }

  create(data: {
    resource_id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    notes?: string | null;
  }): Leave {
    const result = getDb()
      .prepare(
        `INSERT INTO leaves (resource_id, leave_type, start_date, end_date, notes)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(data.resource_id, data.leave_type, data.start_date, data.end_date, data.notes ?? null);
    return this.findById(result.lastInsertRowid as number)!;
  }

  update(
    id: number,
    data: Partial<{
      resource_id: number;
      leave_type: string;
      start_date: string;
      end_date: string;
      notes: string | null;
    }>
  ): Leave | null {
    const fields: string[] = [];
    const params: unknown[] = [];
    const allowed = ['resource_id', 'leave_type', 'start_date', 'end_date', 'notes'];

    for (const key of allowed) {
      if (key in data && data[key as keyof typeof data] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key as keyof typeof data]);
      }
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      params.push(id);
      getDb()
        .prepare(`UPDATE leaves SET ${fields.join(', ')} WHERE id = ?`)
        .run(...params);
    }

    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = getDb().prepare('DELETE FROM leaves WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
