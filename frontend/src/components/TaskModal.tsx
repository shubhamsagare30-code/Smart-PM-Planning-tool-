import { useEffect, useState } from 'react';
import { AlertTriangle, MessageSquare, Paperclip, Plus } from 'lucide-react';
import { Modal } from './Modal';
import type { KanbanColumn, ProjectTask, Resource, TaskComment } from '../types';

const BUCKETS: { key: KanbanColumn; label: string }[] = [
  { key: 'product_backlog', label: 'Product Backlog' },
  { key: 'ready_for_dev', label: 'Ready for Dev' },
  { key: 'sprint_backlog', label: 'Sprint Backlog' },
  { key: 'work_in_progress', label: 'Work in Progress' },
  { key: 'testing', label: 'Testing' },
  { key: 'ready_staging_review', label: 'Ready in Staging/Review' },
  { key: 'pushed_to_production', label: 'Pushed to Production' },
  { key: 'icebox', label: 'Icebox' },
];

const STATUSES = ['planned', 'in_progress', 'delivered', 'blocked'] as const;

function parseJsonArray(json?: string | null): string[] {
  try {
    const arr = JSON.parse(json || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseComments(json?: string | null): TaskComment[] {
  try {
    return JSON.parse(json || '[]');
  } catch {
    return [];
  }
}

function isDelayed(task: ProjectTask): boolean {
  if (!task.due_date) return false;
  if (task.kanban_column === 'pushed_to_production' || task.kanban_column === 'done') return false;
  return task.due_date < new Date().toISOString().split('T')[0];
}

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: ProjectTask | null;
  resources: Resource[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onAddComment?: (text: string, author: string) => Promise<void>;
}

export function TaskModal({ open, onClose, task, resources, onSave, onAddComment }: TaskModalProps) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'planned' as string,
    kanban_column: 'product_backlog' as KanbanColumn,
    assignee_id: 0,
    planned_hours: 8,
    due_date: '',
    reminder_date: '',
    tags: '',
    links: '',
    attachment: '',
  });
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('PM');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        kanban_column: task.kanban_column,
        assignee_id: task.assignee_id || 0,
        planned_hours: task.planned_hours,
        due_date: task.due_date || '',
        reminder_date: task.reminder_date || '',
        tags: parseJsonArray(task.tags).join(', '),
        links: parseJsonArray(task.links).join('\n'),
        attachment: '',
      });
    } else {
      setForm({
        title: '',
        description: '',
        status: 'planned',
        kanban_column: 'product_backlog',
        assignee_id: resources[0]?.id || 0,
        planned_hours: 8,
        due_date: '',
        reminder_date: '',
        tags: '',
        links: '',
        attachment: '',
      });
    }
    setError('');
    setCommentText('');
  }, [task, open, resources]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const existingAttachments = task ? parseJsonArray(task.attachments) : [];
      const attachments = form.attachment.trim()
        ? [...existingAttachments, form.attachment.trim()]
        : existingAttachments;

      await onSave({
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        kanban_column: form.kanban_column,
        assignee_id: form.assignee_id || null,
        planned_hours: form.planned_hours,
        due_date: form.due_date || null,
        reminder_date: form.reminder_date || null,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        links: form.links.split('\n').map((l) => l.trim()).filter(Boolean),
        attachments,
      });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !onAddComment) return;
    await onAddComment(commentText.trim(), commentAuthor.trim() || 'PM');
    setCommentText('');
  };

  const comments = task ? parseComments(task.comments) : [];

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Task ${task?.task_uid || ''}` : 'Add Task'}>
      {task && isDelayed(task) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          This task is past due ({task.due_date})
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {task?.task_uid && (
          <div>
            <label className="label">Task ID</label>
            <input className="input bg-gray-50 dark:bg-gray-800" value={task.task_uid} readOnly />
          </div>
        )}

        <div>
          <label className="label">Title *</label>
          <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[72px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Bucket</label>
            <select className="input" value={form.kanban_column} onChange={(e) => setForm({ ...form, kanban_column: e.target.value as KanbanColumn })}>
              {BUCKETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Assignee</label>
            <select className="input" value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: +e.target.value })}>
              <option value={0}>Unassigned</option>
              {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Planned Hours</label>
            <input className="input" type="number" min={0} value={form.planned_hours} onChange={(e) => setForm({ ...form, planned_hours: +e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Due Date</label>
            <input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Reminder Date</label>
            <input className="input" type="date" value={form.reminder_date} onChange={(e) => setForm({ ...form, reminder_date: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="label">Tags (comma-separated)</label>
          <input className="input" placeholder="frontend, api, urgent" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>

        <div>
          <label className="label">Links (one per line)</label>
          <textarea className="input min-h-[60px]" placeholder="https://..." value={form.links} onChange={(e) => setForm({ ...form, links: e.target.value })} />
        </div>

        <div>
          <label className="label flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Attachment (file name or URL)</label>
          <input className="input" placeholder="spec.pdf or https://..." value={form.attachment} onChange={(e) => setForm({ ...form, attachment: e.target.value })} />
          {task && parseJsonArray(task.attachments).length > 0 && (
            <ul className="mt-1 space-y-1 text-xs text-gray-500">
              {parseJsonArray(task.attachments).map((a, i) => <li key={i}>• {a}</li>)}
            </ul>
          )}
        </div>

        {isEdit && onAddComment && (
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <label className="label flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Comments</label>
            <div className="mb-2 max-h-32 space-y-2 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-400">No comments yet</p>
              ) : comments.map((c) => (
                <div key={c.id} className="rounded bg-gray-50 px-2 py-1.5 text-xs dark:bg-gray-800">
                  <span className="font-medium">{c.author}</span>
                  <span className="text-gray-400"> · {new Date(c.created_at).toLocaleString()}</span>
                  <p className="mt-0.5">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input w-24 text-xs" placeholder="Author" value={commentAuthor} onChange={(e) => setCommentAuthor(e.target.value)} />
              <input className="input flex-1 text-xs" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
              <button type="button" onClick={handleAddComment} className="btn-secondary px-2 py-1 text-xs"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t pt-3 dark:border-gray-700">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}</button>
        </div>
      </form>
    </Modal>
  );
}

export { isDelayed, parseJsonArray, parseComments, BUCKETS };
