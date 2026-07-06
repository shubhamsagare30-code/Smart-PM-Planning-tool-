import { getDb } from '../database/connection';
import { Allocation } from '../types';

export class AllocationRepository {
  private baseQuery = `
    SELECT a.*, r.name as resource_name, p.name as project_name
    FROM allocations a
    JOIN resources r ON a.resource_id = r.id
    JOIN projects p ON a.project_id = p.id
  `;

  findAll(filters?: { resource_id?: number; project_id?: number }): Allocation[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.resource_id) {
      conditions.push('a.resource_id = ?');
      params.push(filters.resource_id);
    }
    if (filters?.project_id) {
      conditions.push('a.project_id = ?');
      params.push(filters.project_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return getDb()
      .prepare(`${this.baseQuery} ${where} ORDER BY a.start_date DESC`)
      .all(...params) as unknown as Allocation[];
  }

  findById(id: number): Allocation | null {
    return (
      (getDb().prepare(`${this.baseQuery} WHERE a.id = ?`).get(id) as unknown as Allocation) || null
    );
  }

  create(data: {
    resource_id: number;
    project_id: number;
    allocation_percentage: number;
    start_date: string;
    end_date: string;
  }): Allocation {
    const result = getDb()
      .prepare(
        `INSERT INTO allocations (resource_id, project_id, allocation_percentage, start_date, end_date)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        data.resource_id,
        data.project_id,
        data.allocation_percentage,
        data.start_date,
        data.end_date
      );
    return this.findById(result.lastInsertRowid as number)!;
  }

  update(
    id: number,
    data: Partial<{
      resource_id: number;
      project_id: number;
      allocation_percentage: number;
      start_date: string;
      end_date: string;
    }>
  ): Allocation | null {
    const fields: string[] = [];
    const params: unknown[] = [];
    const allowed = ['resource_id', 'project_id', 'allocation_percentage', 'start_date', 'end_date'];

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
        .prepare(`UPDATE allocations SET ${fields.join(', ')} WHERE id = ?`)
        .run(...params);
    }

    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = getDb().prepare('DELETE FROM allocations WHERE id = ?').run(id);
    return result.changes > 0;
  }

  findExpiringBefore(date: string): Allocation[] {
    return getDb()
      .prepare(`${this.baseQuery} WHERE a.end_date <= ? AND a.end_date >= date('now') ORDER BY a.end_date`)
      .all(date) as unknown as Allocation[];
  }
}
