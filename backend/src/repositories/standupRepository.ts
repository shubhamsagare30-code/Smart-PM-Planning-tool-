import { getDb } from '../database/connection';
import {
  StandupDecision,
  StandupParkingItem,
  StandupSession,
} from '../types';

export class StandupRepository {
  findSession(projectId: number, sessionDate: string): StandupSession | null {
    const row = getDb()
      .prepare('SELECT * FROM standup_sessions WHERE project_id = ? AND session_date = ?')
      .get(projectId, sessionDate) as Record<string, unknown> | undefined;
    return row ? this.mapSession(row) : null;
  }

  findSessionById(id: number): StandupSession | null {
    const row = getDb().prepare('SELECT * FROM standup_sessions WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.mapSession(row) : null;
  }

  listSessions(projectId: number, limit = 30): StandupSession[] {
    return getDb()
      .prepare(
        'SELECT * FROM standup_sessions WHERE project_id = ? ORDER BY session_date DESC LIMIT ?'
      )
      .all(projectId, limit)
      .map((r) => this.mapSession(r as Record<string, unknown>));
  }

  getLastSessionBefore(projectId: number, sessionDate: string): StandupSession | null {
    const row = getDb()
      .prepare(
        `SELECT * FROM standup_sessions WHERE project_id = ? AND session_date < ?
         ORDER BY session_date DESC LIMIT 1`
      )
      .get(projectId, sessionDate) as Record<string, unknown> | undefined;
    return row ? this.mapSession(row) : null;
  }

  createSession(data: {
    project_id: number;
    session_date: string;
    created_by_user_id?: number | null;
    notes?: string;
    attendees?: string;
  }): StandupSession {
    const result = getDb()
      .prepare(
        `INSERT INTO standup_sessions (project_id, session_date, notes, attendees, created_by_user_id)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        data.project_id,
        data.session_date,
        data.notes ?? '',
        data.attendees ?? '[]',
        data.created_by_user_id ?? null
      );
    return this.findSessionById(result.lastInsertRowid as number)!;
  }

  updateSession(
    id: number,
    data: Partial<{ notes: string; attendees: string; duration_min: number | null }>
  ): StandupSession | null {
    const fields: string[] = [];
    const params: unknown[] = [];
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      params.push(data.notes);
    }
    if (data.attendees !== undefined) {
      fields.push('attendees = ?');
      params.push(data.attendees);
    }
    if (data.duration_min !== undefined) {
      fields.push('duration_min = ?');
      params.push(data.duration_min);
    }
    if (fields.length === 0) return this.findSessionById(id);
    fields.push("updated_at = datetime('now')");
    params.push(id);
    getDb().prepare(`UPDATE standup_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findSessionById(id);
  }

  listDecisions(sessionId: number): StandupDecision[] {
    return getDb()
      .prepare('SELECT * FROM standup_decisions WHERE session_id = ? ORDER BY id')
      .all(sessionId) as unknown as StandupDecision[];
  }

  addDecision(
    sessionId: number,
    data: { decision: string; action?: string; owner_name?: string; due_date?: string; category?: string }
  ): StandupDecision {
    const result = getDb()
      .prepare(
        `INSERT INTO standup_decisions (session_id, decision, action, owner_name, due_date, category)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        sessionId,
        data.decision,
        data.action ?? null,
        data.owner_name ?? null,
        data.due_date ?? null,
        data.category ?? 'general'
      );
    return getDb()
      .prepare('SELECT * FROM standup_decisions WHERE id = ?')
      .get(result.lastInsertRowid) as unknown as StandupDecision;
  }

  deleteDecision(id: number): boolean {
    return getDb().prepare('DELETE FROM standup_decisions WHERE id = ?').run(id).changes > 0;
  }

  listParking(sessionId: number): StandupParkingItem[] {
    return getDb()
      .prepare('SELECT * FROM standup_parking_items WHERE session_id = ? ORDER BY id')
      .all(sessionId)
      .map((r) => this.mapParking(r as Record<string, unknown>));
  }

  addParking(sessionId: number, text: string, taskId?: number | null): StandupParkingItem {
    const result = getDb()
      .prepare('INSERT INTO standup_parking_items (session_id, text, task_id) VALUES (?, ?, ?)')
      .run(sessionId, text, taskId ?? null);
    const row = getDb()
      .prepare('SELECT * FROM standup_parking_items WHERE id = ?')
      .get(result.lastInsertRowid) as Record<string, unknown>;
    return this.mapParking(row);
  }

  resolveParking(id: number, resolved: boolean): StandupParkingItem | null {
    getDb()
      .prepare('UPDATE standup_parking_items SET resolved = ? WHERE id = ?')
      .run(resolved ? 1 : 0, id);
    const row = getDb()
      .prepare('SELECT * FROM standup_parking_items WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.mapParking(row) : null;
  }

  private mapSession(row: Record<string, unknown>): StandupSession {
    return {
      id: row.id as number,
      project_id: row.project_id as number,
      session_date: row.session_date as string,
      notes: (row.notes as string) || '',
      attendees: (row.attendees as string) || '[]',
      duration_min: (row.duration_min as number) ?? null,
      created_by_user_id: (row.created_by_user_id as number) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  private mapParking(row: Record<string, unknown>): StandupParkingItem {
    return {
      id: row.id as number,
      session_id: row.session_id as number,
      text: row.text as string,
      task_id: (row.task_id as number) ?? null,
      resolved: !!row.resolved,
      created_at: row.created_at as string,
    };
  }
}
