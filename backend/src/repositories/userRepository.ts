import { getDb } from '../database/connection';
import { User, UserRole } from '../types';

export class UserRepository {
  private mapUser(row: Record<string, unknown>): User {
    return {
      ...(row as unknown as User),
      is_active: !!row.is_active,
      must_change_password: !!row.must_change_password,
    };
  }

  findAll(): User[] {
    return getDb()
      .prepare(
        `SELECT id, email, name, role, resource_id, is_active, must_change_password, created_at, updated_at
         FROM users ORDER BY name`
      )
      .all()
      .map((r) => this.mapUser(r as Record<string, unknown>));
  }

  findById(id: number): User | null {
    const row = getDb()
      .prepare(
        `SELECT id, email, name, role, resource_id, is_active, must_change_password, created_at, updated_at
         FROM users WHERE id = ?`
      )
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapUser(row) : null;
  }

  findByEmail(email: string): (User & { password_hash: string }) | null {
    return (
      (getDb()
        .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
        .get(email) as (User & { password_hash: string }) | undefined) || null
    );
  }

  create(data: {
    email: string;
    password_hash: string;
    name: string;
    role: UserRole;
    resource_id?: number | null;
    must_change_password?: boolean;
  }): User {
    const result = getDb()
      .prepare(
        `INSERT INTO users (email, password_hash, name, role, resource_id, must_change_password)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.email.toLowerCase(),
        data.password_hash,
        data.name,
        data.role,
        data.resource_id ?? null,
        data.must_change_password ? 1 : 0
      );
    return this.findById(result.lastInsertRowid as number)!;
  }

  update(
    id: number,
    data: Partial<{
      name: string;
      role: UserRole;
      resource_id: number | null;
      is_active: boolean;
      must_change_password: boolean;
      password_hash: string;
    }>
  ): User | null {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    if (data.role !== undefined) {
      fields.push('role = ?');
      params.push(data.role);
    }
    if (data.resource_id !== undefined) {
      fields.push('resource_id = ?');
      params.push(data.resource_id);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }
    if (data.must_change_password !== undefined) {
      fields.push('must_change_password = ?');
      params.push(data.must_change_password ? 1 : 0);
    }
    if (data.password_hash !== undefined) {
      fields.push('password_hash = ?');
      params.push(data.password_hash);
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      params.push(id);
      getDb().prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }

    return this.findById(id);
  }

  assignToProject(projectId: number, userId: number, memberRole: 'pm' | 'member' = 'member') {
    getDb()
      .prepare(
        `INSERT OR REPLACE INTO project_members (project_id, user_id, member_role)
         VALUES (?, ?, ?)`
      )
      .run(projectId, userId, memberRole);
  }

  setProjectMembers(projectId: number, userIds: number[]) {
    const db = getDb();
    db.prepare('DELETE FROM project_members WHERE project_id = ? AND member_role = ?').run(projectId, 'member');
    for (const userId of userIds) {
      this.assignToProject(projectId, userId, 'member');
    }
  }
}
