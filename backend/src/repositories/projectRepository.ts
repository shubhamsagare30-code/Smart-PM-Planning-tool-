import { getDb } from '../database/connection';
import { Project } from '../types';

const PROJECT_FIELDS = [
  'name', 'client_name', 'start_date', 'end_date', 'status', 'budget', 'description',
  'duration_days', 'project_type', 'monthly_rate', 'hourly_rate', 'software_cost', 'hardware_cost',
  'desk_cost', 'office_cost', 'planned_cost', 'actual_cost', 'documentation_links',
  'documentation_files', 'external_board_url', 'board_type', 'planned_completion_percent',
  'actual_completion_percent', 'deliverables_planned', 'deliverables_actual', 'owner_user_id',
];

export class ProjectRepository {
  findAll(status?: string): Project[] {
    if (status) {
      return getDb()
        .prepare('SELECT * FROM projects WHERE status = ? ORDER BY name')
        .all(status) as unknown as Project[];
    }
    return getDb()
      .prepare("SELECT * FROM projects WHERE status != 'archived' ORDER BY name")
      .all() as unknown as Project[];
  }

  findAllForUser(userId: number, role: string, status?: string): Project[] {
    if (role === 'admin' || role === 'director') return this.findAll(status);
    if (role === 'pm') {
      const db = getDb();
      const sql = status
        ? 'SELECT * FROM projects WHERE status = ? AND owner_user_id = ? ORDER BY name'
        : "SELECT * FROM projects WHERE status != 'archived' AND owner_user_id = ? ORDER BY name";
      return db.prepare(sql).all(...(status ? [status, userId] : [userId])) as unknown as Project[];
    }
    const db = getDb();
    const sql = status
      ? `SELECT p.* FROM projects p
         JOIN project_members pm ON pm.project_id = p.id
         WHERE p.status = ? AND pm.user_id = ? ORDER BY p.name`
      : `SELECT p.* FROM projects p
         JOIN project_members pm ON pm.project_id = p.id
         WHERE p.status != 'archived' AND pm.user_id = ? ORDER BY p.name`;
    return db.prepare(sql).all(...(status ? [status, userId] : [userId])) as unknown as Project[];
  }

  findById(id: number): Project | null {
    return (getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as Project) || null;
  }

  findByName(name: string): Project | null {
    return (getDb().prepare('SELECT * FROM projects WHERE name = ?').get(name) as unknown as Project) || null;
  }

  create(data: Record<string, unknown>): Project {
    const fields = PROJECT_FIELDS.filter((f) => f in data);
    const values = fields.map((f) => data[f] ?? null);
    const placeholders = fields.map(() => '?').join(', ');

    const result = getDb()
      .prepare(`INSERT INTO projects (${fields.join(', ')}) VALUES (${placeholders})`)
      .run(...values);

    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, data: Record<string, unknown>): Project | null {
    const fields: string[] = [];
    const params: unknown[] = [];

    for (const key of PROJECT_FIELDS) {
      if (key in data && data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      params.push(id);
      getDb()
        .prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`)
        .run(...params);
    }

    return this.findById(id);
  }

  archive(id: number): Project | null {
    return this.update(id, { status: 'archived' });
  }

  countActive(): number {
    const result = getDb()
      .prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'active'")
      .get() as { count: number };
    return result.count;
  }
}
