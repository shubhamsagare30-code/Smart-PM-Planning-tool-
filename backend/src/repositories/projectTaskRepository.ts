import { getDb } from '../database/connection';
import { ProjectTask } from '../types';
import { generateTaskUid } from '../utils/tasks';

export class ProjectTaskRepository {
  private baseQuery = `
    SELECT t.*, r.name as assignee_name
    FROM project_tasks t
    LEFT JOIN resources r ON t.assignee_id = r.id
  `;

  findByProject(projectId: number): ProjectTask[] {
    return getDb()
      .prepare(`${this.baseQuery} WHERE t.project_id = ? ORDER BY t.sort_order, t.id`)
      .all(projectId) as unknown as ProjectTask[];
  }

  findById(id: number): ProjectTask | null {
    return (getDb().prepare(`${this.baseQuery} WHERE t.id = ?`).get(id) as unknown as ProjectTask) || null;
  }

  private nextSeq(projectId: number): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) as c FROM project_tasks WHERE project_id = ?')
      .get(projectId) as { c: number };
    return row.c + 1;
  }

  create(data: {
    project_id: number;
    title: string;
    description?: string | null;
    status?: string;
    assignee_id?: number | null;
    planned_start?: string | null;
    planned_end?: string | null;
    planned_hours?: number;
    kanban_column?: string;
    sort_order?: number;
    due_date?: string | null;
    reminder_date?: string | null;
    tags?: string;
    links?: string;
    attachments?: string;
    comments?: string;
    task_uid?: string;
  }): ProjectTask {
    const uid = data.task_uid || generateTaskUid(data.project_id, this.nextSeq(data.project_id));
    const result = getDb()
      .prepare(
        `INSERT INTO project_tasks (project_id, task_uid, title, description, status, assignee_id,
         planned_start, planned_end, planned_hours, kanban_column, sort_order,
         due_date, reminder_date, tags, links, attachments, comments)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.project_id,
        uid,
        data.title,
        data.description ?? null,
        data.status || 'planned',
        data.assignee_id ?? null,
        data.planned_start ?? null,
        data.planned_end ?? null,
        data.planned_hours ?? 0,
        data.kanban_column || 'product_backlog',
        data.sort_order ?? 0,
        data.due_date ?? null,
        data.reminder_date ?? null,
        data.tags ?? '[]',
        data.links ?? '[]',
        data.attachments ?? '[]',
        data.comments ?? '[]'
      );
    return this.findById(result.lastInsertRowid as number)!;
  }

  update(
    id: number,
    data: Partial<{
      title: string;
      description: string | null;
      status: string;
      assignee_id: number | null;
      planned_start: string | null;
      planned_end: string | null;
      actual_start: string | null;
      actual_end: string | null;
      planned_hours: number;
      actual_hours: number;
      kanban_column: string;
      sort_order: number;
      due_date: string | null;
      reminder_date: string | null;
      tags: string;
      links: string;
      attachments: string;
      comments: string;
    }>
  ): ProjectTask | null {
    const fields: string[] = [];
    const params: unknown[] = [];
    const allowed = [
      'title', 'description', 'status', 'assignee_id', 'planned_start', 'planned_end',
      'actual_start', 'actual_end', 'planned_hours', 'actual_hours', 'kanban_column', 'sort_order',
      'due_date', 'reminder_date', 'tags', 'links', 'attachments', 'comments',
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
      getDb().prepare(`UPDATE project_tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }

    return this.findById(id);
  }

  addComment(taskId: number, author: string, text: string): ProjectTask | null {
    const task = this.findById(taskId);
    if (!task) return null;
    const comments = JSON.parse((task as { comments?: string }).comments || '[]');
    comments.push({
      id: `c-${Date.now()}`,
      author,
      text,
      created_at: new Date().toISOString(),
    });
    return this.update(taskId, { comments: JSON.stringify(comments) });
  }

  delete(id: number): boolean {
    return getDb().prepare('DELETE FROM project_tasks WHERE id = ?').run(id).changes > 0;
  }
}
