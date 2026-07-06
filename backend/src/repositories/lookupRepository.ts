import { getDb } from '../database/connection';
import { Department, EmploymentType, Skill } from '../types';

export class LookupRepository {
  findAllDepartments(): Department[] {
    return getDb().prepare('SELECT * FROM departments ORDER BY name').all() as unknown as Department[];
  }

  findAllSkills(): Skill[] {
    return getDb().prepare('SELECT * FROM skills ORDER BY name').all() as unknown as Skill[];
  }

  findAllEmploymentTypes(): EmploymentType[] {
    return getDb().prepare('SELECT * FROM employment_types ORDER BY name').all() as unknown as EmploymentType[];
  }

  findOrCreateDepartment(name: string): number {
    const existing = getDb().prepare('SELECT id FROM departments WHERE name = ?').get(name) as { id: number } | undefined;
    if (existing) return existing.id;
    const result = getDb().prepare('INSERT INTO departments (name) VALUES (?)').run(name);
    return result.lastInsertRowid as number;
  }

  findOrCreateSkill(name: string): number {
    const existing = getDb().prepare('SELECT id FROM skills WHERE name = ?').get(name) as { id: number } | undefined;
    if (existing) return existing.id;
    const result = getDb().prepare('INSERT INTO skills (name) VALUES (?)').run(name);
    return result.lastInsertRowid as number;
  }

  findOrCreateEmploymentType(name: string): number {
    const existing = getDb().prepare('SELECT id FROM employment_types WHERE name = ?').get(name) as { id: number } | undefined;
    if (existing) return existing.id;
    const result = getDb().prepare('INSERT INTO employment_types (name) VALUES (?)').run(name);
    return result.lastInsertRowid as number;
  }
}
