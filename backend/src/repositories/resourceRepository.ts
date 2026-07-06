import { getDb } from '../database/connection';
import { Resource, Skill } from '../types';

export interface ResourceFilters {
  search?: string;
  skill_id?: number;
  department_id?: number;
  status?: string;
}

export class ResourceRepository {
  private baseQuery = `
    SELECT r.*, d.name as department_name, e.name as employment_type_name
    FROM resources r
    JOIN departments d ON r.department_id = d.id
    JOIN employment_types e ON r.employment_type_id = e.id
  `;

  findAll(filters: ResourceFilters = {}): Resource[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      conditions.push('r.status = ?');
      params.push(filters.status);
    } else {
      conditions.push("r.status != 'archived'");
    }

    if (filters.search) {
      conditions.push('(r.name LIKE ? OR r.email LIKE ? OR r.designation LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    if (filters.department_id) {
      conditions.push('r.department_id = ?');
      params.push(filters.department_id);
    }

    if (filters.skill_id) {
      conditions.push('EXISTS (SELECT 1 FROM resource_skills rs WHERE rs.resource_id = r.id AND rs.skill_id = ?)');
      params.push(filters.skill_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const resources = getDb()
      .prepare(`${this.baseQuery} ${where} ORDER BY r.name`)
      .all(...params) as unknown as Resource[];

    return resources.map((r) => this.attachSkills(r));
  }

  findById(id: number): Resource | null {
    const resource = getDb()
      .prepare(`${this.baseQuery} WHERE r.id = ?`)
      .get(id) as unknown as Resource | undefined;
    return resource ? this.attachSkills(resource) : null;
  }

  create(data: {
    name: string;
    email: string;
    designation: string;
    department_id: number;
    cost_per_day: number;
    employment_type_id: number;
    capacity_percentage: number;
    joining_date: string;
    status?: string;
    skill_ids?: number[];
  }): Resource {
    const result = getDb()
      .prepare(
        `INSERT INTO resources (name, email, designation, department_id, cost_per_day,
         employment_type_id, capacity_percentage, joining_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name,
        data.email,
        data.designation,
        data.department_id,
        data.cost_per_day,
        data.employment_type_id,
        data.capacity_percentage,
        data.joining_date,
        data.status || 'active'
      );

    const id = result.lastInsertRowid as number;
    if (data.skill_ids?.length) {
      this.setSkills(id, data.skill_ids);
    }
    return this.findById(id)!;
  }

  update(
    id: number,
    data: Partial<{
      name: string;
      email: string;
      designation: string;
      department_id: number;
      cost_per_day: number;
      employment_type_id: number;
      capacity_percentage: number;
      joining_date: string;
      status: string;
      skill_ids: number[];
    }>
  ): Resource | null {
    const fields: string[] = [];
    const params: unknown[] = [];

    const allowed = [
      'name', 'email', 'designation', 'department_id', 'cost_per_day',
      'employment_type_id', 'capacity_percentage', 'joining_date', 'status',
    ];

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
        .prepare(`UPDATE resources SET ${fields.join(', ')} WHERE id = ?`)
        .run(...params);
    }

    if (data.skill_ids !== undefined) {
      this.setSkills(id, data.skill_ids);
    }

    return this.findById(id);
  }

  archive(id: number): Resource | null {
    return this.update(id, { status: 'archived' });
  }

  private setSkills(resourceId: number, skillIds: number[]): void {
    const db = getDb();
    db.prepare('DELETE FROM resource_skills WHERE resource_id = ?').run(resourceId);
    const uniqueIds = [...new Set(skillIds)];
    const insert = db.prepare('INSERT INTO resource_skills (resource_id, skill_id) VALUES (?, ?)');
    for (const skillId of uniqueIds) {
      insert.run(resourceId, skillId);
    }
  }

  private attachSkills(resource: Resource): Resource {
    const skills = getDb()
      .prepare(
        `SELECT s.* FROM skills s
         JOIN resource_skills rs ON s.id = rs.skill_id
         WHERE rs.resource_id = ? ORDER BY s.name`
      )
      .all(resource.id) as unknown as Skill[];
    return { ...resource, skills };
  }

  countActive(): number {
    const result = getDb()
      .prepare("SELECT COUNT(*) as count FROM resources WHERE status = 'active'")
      .get() as { count: number };
    return result.count;
  }
}
