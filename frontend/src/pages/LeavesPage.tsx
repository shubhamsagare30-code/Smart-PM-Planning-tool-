import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { leavesApi, resourcesApi } from '../api';
import { Badge, statusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import type { Leave, LeaveType, Resource } from '../types';

const leaveTypes: { value: LeaveType; label: string }[] = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'training', label: 'Training' },
];

const emptyForm = { resource_id: 0, leave_type: 'vacation' as LeaveType, start_date: '', end_date: '', notes: '' };

export function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Leave | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => leavesApi.list().then(setLeaves);

  useEffect(() => {
    load();
    resourcesApi.list({ status: 'active' }).then(setResources);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, resource_id: resources[0]?.id || 0, start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };

  const openEdit = (l: Leave) => {
    setEditing(l);
    setForm({ resource_id: l.resource_id, leave_type: l.leave_type, start_date: l.start_date, end_date: l.end_date, notes: l.notes || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) await leavesApi.update(editing.id, form);
    else await leavesApi.create(form);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this leave record?')) {
      await leavesApi.delete(id);
      load();
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Track time off — capacity adjusts automatically</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Add Leave</button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Resource</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Period</th>
              <th className="px-4 py-3 text-left font-medium">Notes</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {leaves.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium">{l.resource_name}</td>
                <td className="px-4 py-3"><Badge variant={statusBadge(l.leave_type)}>{l.leave_type.replace('_', ' ')}</Badge></td>
                <td className="px-4 py-3">{l.start_date} → {l.end_date}</td>
                <td className="px-4 py-3 text-gray-500">{l.notes || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(l)} className="mr-2 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(l.id)} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"><Trash2 className="h-4 w-4 text-red-500" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Leave' : 'Add Leave'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Resource</label>
            <select className="input" required value={form.resource_id} onChange={(e) => setForm({ ...form, resource_id: +e.target.value })}>
              {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div><label className="label">Leave Type</label>
            <select className="input" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value as LeaveType })}>
              {leaveTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Start Date</label><input className="input" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><label className="label">End Date</label><input className="input" type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
