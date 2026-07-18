import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { allocationsApi, projectsApi, resourcesApi } from '../api';
import { Modal } from '../components/Modal';
import { SortableTh, compareValues, type SortDirection } from '../components/SortableTh';
import { WarningBanner } from '../components/WarningBanner';
import type { Allocation, Project, Resource } from '../types';

const emptyForm = { resource_id: 0, project_id: 0, allocation_percentage: 50, start_date: '', end_date: '' };

function bookedColor(pct: number) {
  if (pct > 100) return 'text-red-600 dark:text-red-400';
  if (pct >= 80) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

export function AllocationsPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState('resource');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const resourceMap = useMemo(() => new Map(resources.map((r) => [r.id, r])), [resources]);

  const load = () => allocationsApi.list().then(setAllocations);

  useEffect(() => {
    load();
    resourcesApi.list({ status: 'active' }).then(setResources);
    projectsApi.list('active').then(setProjects);
  }, []);

  const handleSort = (column: string) => {
    if (sortKey === column) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(column); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    const rows = allocations.map((a) => ({
      ...a,
      resource_total_booked: resourceMap.get(a.resource_id)?.booked_percent ?? 0,
    }));
    rows.sort((a, b) => {
      const get = (row: typeof rows[0]): unknown => {
        switch (sortKey) {
          case 'resource': return row.resource_name;
          case 'project': return row.project_name;
          case 'allocated': return row.allocation_percentage;
          case 'total_booked': return row.resource_total_booked;
          case 'period': return row.start_date;
          default: return row.resource_name;
        }
      };
      return compareValues(get(a), get(b), sortDir);
    });
    return rows;
  }, [allocations, resourceMap, sortKey, sortDir]);

  const openCreate = () => {
    setWarnings([]);
    setError('');
    const sortedResources = [...resources].sort((a, b) => a.name.localeCompare(b.name));
    setForm({
      ...emptyForm,
      resource_id: sortedResources[0]?.id || 0,
      project_id: projects[0]?.id || 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await allocationsApi.create(form);
      setWarnings(result.warnings);
      setModalOpen(false);
      load();
      resourcesApi.list({ status: 'active' }).then(setResources);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Cannot allocate — resource would exceed 100% capacity for this period.');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this allocation?')) {
      await allocationsApi.delete(id);
      load();
      resourcesApi.list({ status: 'active' }).then(setResources);
    }
  };

  const sortedResources = useMemo(
    () => [...resources].sort((a, b) => a.name.localeCompare(b.name)),
    [resources]
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Allocations</h1>
          <p className="text-gray-500 dark:text-gray-400">
            <strong>Allocated to project</strong> = % on that project only. <strong>Resource total booked</strong> = sum across all projects today.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> New Allocation</button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <SortableTh label="Resource" column="resource" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Project" column="project" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Allocated to project" column="allocated" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Resource total booked" column="total_booked" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Period" column="period" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sorted.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">{a.resource_name}</td>
                  <td className="px-4 py-3">{a.project_name}</td>
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300" title="% of time on this project">
                    {a.allocation_percentage}%
                  </td>
                  <td className={`px-4 py-3 font-semibold ${bookedColor(a.resource_total_booked)}`} title="Total % booked across all projects today">
                    {a.resource_total_booked}%
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.start_date} → {a.end_date}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(a.id)} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"><Trash2 className="h-4 w-4 text-red-500" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Allocation">
        <WarningBanner warnings={warnings} />
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Resource</label>
            <select className="input" required value={form.resource_id} onChange={(e) => setForm({ ...form, resource_id: +e.target.value })}>
              {sortedResources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — max {r.capacity_percentage}%, booked {r.booked_percent ?? 0}%, free {r.available_percent ?? 0}%
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Project</label>
            <select className="input" required value={form.project_id} onChange={(e) => setForm({ ...form, project_id: +e.target.value })}>
              {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Allocated to project %</label>
            <input className="input" type="number" required min={1} max={100} value={form.allocation_percentage} onChange={(e) => setForm({ ...form, allocation_percentage: +e.target.value })} />
            <p className="mt-1 text-xs text-gray-500">% of this person&apos;s time on this project for the selected dates.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Start Date</label><input className="input" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><label className="label">End Date</label><input className="input" type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Allocation</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
