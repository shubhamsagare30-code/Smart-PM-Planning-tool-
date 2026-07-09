import { getDb } from '../database/connection';
import { User, UserRole } from '../types';

const FINANCIAL_ROLES: UserRole[] = ['admin', 'director', 'pm'];

export function isFinancialRole(role: UserRole): boolean {
  return FINANCIAL_ROLES.includes(role);
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'admin';
}

export function isPortfolioRole(role: UserRole): boolean {
  return role === 'admin' || role === 'director' || role === 'pm';
}

export function canAccessProject(user: User, projectId: number): boolean {
  if (user.role === 'admin' || user.role === 'director') return true;

  const db = getDb();
  const project = db.prepare('SELECT owner_user_id FROM projects WHERE id = ?').get(projectId) as
    | { owner_user_id: number | null }
    | undefined;
  if (!project) return false;
  if (user.role === 'pm' && project.owner_user_id === user.id) return true;

  const member = db
    .prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(projectId, user.id);
  return !!member;
}

export function canViewProjectFinancials(user: User, projectId: number): boolean {
  if (!isFinancialRole(user.role)) return false;
  if (user.role === 'admin' || user.role === 'director') return true;
  if (user.role === 'pm') {
    const db = getDb();
    const project = db.prepare('SELECT owner_user_id FROM projects WHERE id = ?').get(projectId) as
      | { owner_user_id: number | null }
      | undefined;
    return project?.owner_user_id === user.id;
  }
  return false;
}

export function getAccessibleProjectIds(user: User): number[] | 'all' {
  if (user.role === 'admin' || user.role === 'director') return 'all';
  const db = getDb();
  if (user.role === 'pm') {
    const owned = db
      .prepare("SELECT id FROM projects WHERE owner_user_id = ? AND status != 'archived'")
      .all(user.id) as { id: number }[];
    return owned.map((r) => r.id);
  }
  const rows = db
    .prepare(
      `SELECT pm.project_id as id FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.user_id = ? AND p.status != 'archived'`
    )
    .all(user.id) as { id: number }[];
  return rows.map((r) => r.id);
}
