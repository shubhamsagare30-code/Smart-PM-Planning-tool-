import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Archive } from 'lucide-react';
import { lookupsApi, resourcesApi } from '../api';
import { Badge, statusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { SearchInput } from '../components/SearchInput';
import { SortableTh, compareValues, type SortDirection } from '../components/SortableTh';
import type { Department, EmploymentType, Resource, Skill } from '../types';

const emptyForm = {
  name: '', email: '', designation: '', department_id: 0, cost_per_day: 500,
  employment_type_id: 0, capacity_percentage: 100, joining_date: '', skill_ids: [] as number[],
};

function capacityColor(pct: number, mode: 'booked' | 'available' = 'booked') {
  if (mode === 'available') {
    if (pct < 15) return 'text-red-600 dark:text-red-400';
    if (pct < 35) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  }
  if (pct > 100) return 'text-red-600 dark:text-red-400';
  if (pct >= 80) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [empTypes, setEmpTypes] = useState<EmploymentType[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<number | undefined>();
  const [skillFilter, setSkillFilter] = useState<number | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const load = () => {
    resourcesApi.list({ search, department_id: deptFilter, skill_id: skillFilter }).then(setResources);
  };

  useEffect(() => {
    lookupsApi.departments().then(setDepartments);
    lookupsApi.skills().then(setSkills);
    lookupsApi.employmentTypes().then(setEmpTypes);
  }, []);

  useEffect(() => { load(); }, [search, deptFilter, skillFilter]);

  const handleSort = (column: string) => {
    if (sortKey === column) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(column); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    const rows = [...resources];
    rows.sort((a, b) => {
      const get = (r: Resource): unknown => {
        switch (sortKey) {
          case 'name': return r.name;
          case 'designation': return r.designation;
          case 'department': return r.department_name;
          case 'max_capacity': return r.capacity_percentage;
          case 'booked': return r.booked_percent ?? 0;
          case 'available': return r.available_percent ?? 0;
          case 'status': return r.status;
          default: return r.name;
        }
      };
      return compareValues(get(a), get(b), sortDir);
    });
    return rows;
  }, [resources, sortKey, sortDir]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, department_id: departments[0]?.id || 0, employment_type_id: empTypes[0]?.id || 0, joining_date: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };

  const openEdit = (r: Resource) => {
    setEditing(r);
    setForm({
      name: r.name, email: r.email, designation: r.designation,
      department_id: r.department_id, cost_per_day: r.cost_per_day,
      employment_type_id: r.employment_type_id, capacity_percentage: r.capacity_percentage,
      joining_date: r.joining_date, skill_ids: r.skills?.map((s) => s.id) || [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) await resourcesApi.update(editing.id, form);
    else await resourcesApi.create(form);
    setModalOpen(false);
    load();
  };

  const handleArchive = async (id: number) => {
    if (confirm('Archive this resource?')) {
      await resourcesApi.archive(id);
      load();
    }
  };

  const toggleSkill = (id: number) => {
    setForm((f) => ({
      ...f,
      skill_ids: f.skill_ids.includes(id) ? f.skill_ids.filter((s) => s !== id) : [...f.skill_ids, id],
    }));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resources</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Team roster — <strong>Max capacity</strong> is the person&apos;s limit; <strong>Booked</strong> / <strong>Available</strong> reflect today&apos;s project assignments.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> Add Resource</button>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} placeholder="Search resources..." /></div>
        <select className="input w-48" value={deptFilter || ''} onChange={(e) => setDeptFilter(e.target.value ? +e.target.value : undefined)}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input w-48" value={skillFilter || ''} onChange={(e) => setSkillFilter(e.target.value ? +e.target.value : undefined)}>
          <option value="">All Skills</option>
          {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <SortableTh label="Name" column="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Designation" column="designation" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Department" column="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left font-medium">Skills</th>
                <SortableTh label="Max capacity" column="max_capacity" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Booked today" column="booked" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Available today" column="available" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sorted.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.email}</div>
                  </td>
                  <td className="px-4 py-3">{r.designation}</td>
                  <td className="px-4 py-3">{r.department_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.skills?.slice(0, 3).map((s) => <Badge key={s.id}>{s.name}</Badge>)}
                      {(r.skills?.length || 0) > 3 && <Badge>+{(r.skills?.length || 0) - 3}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600" title="Maximum % this person can be allocated">
                    {r.capacity_percentage}%
                  </td>
                  <td className={`px-4 py-3 font-semibold ${capacityColor(r.booked_percent ?? 0)}`} title="Total % booked across all projects today">
                    {r.booked_percent ?? 0}%
                  </td>
                  <td className={`px-4 py-3 font-semibold ${capacityColor(r.available_percent ?? 0, 'available')}`} title="Remaining % free today">
                    {r.available_percent ?? 0}%
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusBadge(r.status)}>{r.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(r)} className="mr-2 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"><Pencil className="h-4 w-4" /></button>
                    {r.status === 'active' && (
                      <button onClick={() => handleArchive(r.id)} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"><Archive className="h-4 w-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Resource' : 'Add Resource'} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Designation</label><input className="input" required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
            <div><label className="label">Department</label>
              <select className="input" required value={form.department_id} onChange={(e) => setForm({ ...form, department_id: +e.target.value })}>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="label">Cost per Day ($)</label><input className="input" type="number" required min={0} value={form.cost_per_day} onChange={(e) => setForm({ ...form, cost_per_day: +e.target.value })} /></div>
            <div><label className="label">Employment Type</label>
              <select className="input" required value={form.employment_type_id} onChange={(e) => setForm({ ...form, employment_type_id: +e.target.value })}>
                {empTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Max capacity %</label>
              <input className="input" type="number" required min={0} max={100} value={form.capacity_percentage} onChange={(e) => setForm({ ...form, capacity_percentage: +e.target.value })} />
              <p className="mt-1 text-xs text-gray-500">100% = full-time. Not the same as booked or available.</p>
            </div>
            <div><label className="label">Joining Date</label><input className="input" type="date" required value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} /></div>
          </div>
          <div>
            <label className="label">Skills</label>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <button key={s.id} type="button" onClick={() => toggleSkill(s.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${form.skill_ids.includes(s.id) ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
