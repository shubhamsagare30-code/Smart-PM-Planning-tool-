import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Link2, Plus, Trash2, Users } from 'lucide-react';
import { projectsApi, resourcesApi } from '../api';
import { MarginGauge } from '../components/MarginGauge';
import type { ProjectFinancials, ProjectType, Resource } from '../types';

const STEPS = ['Project Info', 'Details & Cost', 'Documentation', 'Team Allocation', 'Review'];

interface DraftAlloc {
  resource_id: number;
  allocation_percentage: number;
  start_date: string;
  end_date: string;
  resource_name?: string;
}

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [margin, setMargin] = useState<ProjectFinancials | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', client_name: '', description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    budget: 100000, duration_days: 64, project_type: 'fixed_cost' as ProjectType,
    monthly_rate: 0, software_cost: 5000, hardware_cost: 3000, desk_cost: 4000, office_cost: 4500,
    board_type: 'internal' as const, external_board_url: '',
  });
  const [docLinks, setDocLinks] = useState<string[]>(['']);
  const [allocations, setAllocations] = useState<DraftAlloc[]>([]);

  useEffect(() => { resourcesApi.list({ status: 'active' }).then(setResources); }, []);

  const recalcMargin = useCallback(async () => {
    if (allocations.length === 0) { setMargin(null); return; }
    const result = await projectsApi.previewMargin(
      { ...form, budget: form.budget },
      allocations.map(({ resource_id, allocation_percentage, start_date, end_date }) =>
        ({ resource_id, allocation_percentage, start_date, end_date }))
    );
    setMargin(result);
  }, [form, allocations]);

  useEffect(() => { recalcMargin(); }, [recalcMargin]);

  const addAllocation = () => {
    const r = resources[0];
    if (!r) return;
    setAllocations([...allocations, {
      resource_id: r.id, resource_name: r.name,
      allocation_percentage: 50, start_date: form.start_date, end_date: form.end_date,
    }]);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const dash = await projectsApi.createFull({
        project: { ...form, documentation_links: JSON.stringify(docLinks.filter(Boolean)) },
        allocations: allocations.map(({ resource_id, allocation_percentage, start_date, end_date }) =>
          ({ resource_id, allocation_percentage, start_date, end_date })),
        documentationLinks: docLinks.filter(Boolean),
      });
      navigate(`/projects/${dash.project.id}`);
    } finally { setSaving(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/projects')} className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </button>

      <h1 className="mb-2 text-2xl font-bold">New Project</h1>
      <p className="mb-6 text-gray-500">Step-by-step project creation with live margin tracking</p>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              i < step ? 'bg-green-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
            }`}>{i < step ? <Check className="h-4 w-4" /> : i + 1}</div>
            <span className={`ml-2 hidden text-xs font-medium sm:inline ${i === step ? 'text-brand-600' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${i < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      <div className="card">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Project Information</h2>
            <div><label className="label">Project Name</label><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Browser Plugin Creation for PM" /></div>
            <div><label className="label">Client Name</label><input className="input" required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Start Date</label><input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><label className="label">End Date</label><input className="input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Project Details & Cost Structure</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Project Type</label>
                <select className="input" value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value as ProjectType })}>
                  <option value="fixed_cost">Fixed Cost</option>
                  <option value="monthly">Monthly Retainer</option>
                  <option value="time_and_materials">Time & Materials</option>
                </select>
              </div>
              <div><label className="label">Duration (working days)</label><input className="input" type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: +e.target.value })} /></div>
              <div><label className="label">{form.project_type === 'monthly' ? 'Monthly Rate ($)' : 'Revenue / Budget ($)'}</label>
                <input className="input" type="number" value={form.project_type === 'monthly' ? form.monthly_rate : form.budget}
                  onChange={(e) => setForm({ ...form, [form.project_type === 'monthly' ? 'monthly_rate' : 'budget']: +e.target.value })} />
              </div>
              <div><label className="label">Board Type</label>
                <select className="input" value={form.board_type} onChange={(e) => setForm({ ...form, board_type: e.target.value as typeof form.board_type })}>
                  <option value="internal">Managed Here (Kanban)</option>
                  <option value="trello">Trello (External Link)</option>
                  <option value="asana">Asana (External Link)</option>
                  <option value="zoho">Zoho (External Link)</option>
                </select>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="mb-3 text-sm font-semibold text-gray-500">OVERHEAD COSTS (Gross Margin Components)</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(['software_cost', 'hardware_cost', 'desk_cost', 'office_cost'] as const).map((key) => (
                  <div key={key}>
                    <label className="label capitalize">{key.replace('_cost', '').replace('_', ' ')} ($)</label>
                    <input className="input" type="number" min={0} value={form[key]} onChange={(e) => setForm({ ...form, [key]: +e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
            {form.board_type !== 'internal' && (
              <div><label className="label">External Board URL</label><input className="input" value={form.external_board_url} onChange={(e) => setForm({ ...form, external_board_url: e.target.value })} placeholder="https://trello.com/b/..." /></div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Project Documentation</h2>
            <p className="text-sm text-gray-500">Add links to Google Drive, Confluence, or other document repositories.</p>
            {docLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Link2 className="mt-2.5 h-4 w-4 shrink-0 text-gray-400" />
                <input className="input" value={link} onChange={(e) => { const u = [...docLinks]; u[i] = e.target.value; setDocLinks(u); }} placeholder="https://drive.google.com/..." />
                {docLinks.length > 1 && <button onClick={() => setDocLinks(docLinks.filter((_, j) => j !== i))} className="rounded p-2 hover:bg-gray-100"><Trash2 className="h-4 w-4 text-red-400" /></button>}
              </div>
            ))}
            <button onClick={() => setDocLinks([...docLinks, ''])} className="btn-secondary text-sm"><Plus className="h-4 w-4" /> Add Link</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Team Allocation</h2>
              <button onClick={addAllocation} className="btn-secondary text-sm"><Users className="h-4 w-4" /> Add Resource</button>
            </div>

            {allocations.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400 dark:border-gray-700">
                Add resources to see live gross margin calculation
              </div>
            )}

            {allocations.map((a, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <div className="col-span-4">
                  <label className="label">Resource</label>
                  <select className="input" value={a.resource_id} onChange={(e) => {
                    const u = [...allocations]; const r = resources.find((x) => x.id === +e.target.value);
                    u[i] = { ...u[i], resource_id: +e.target.value, resource_name: r?.name }; setAllocations(u);
                  }}>
                    {resources.map((r) => <option key={r.id} value={r.id}>{r.name} — ${r.cost_per_day}/day</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Allocation %</label>
                  <input className="input" type="number" min={1} max={100} value={a.allocation_percentage}
                    onChange={(e) => { const u = [...allocations]; u[i].allocation_percentage = +e.target.value; setAllocations(u); }} />
                </div>
                <div className="col-span-2"><label className="label">Start</label><input className="input" type="date" value={a.start_date} onChange={(e) => { const u = [...allocations]; u[i].start_date = e.target.value; setAllocations(u); }} /></div>
                <div className="col-span-2"><label className="label">End</label><input className="input" type="date" value={a.end_date} onChange={(e) => { const u = [...allocations]; u[i].end_date = e.target.value; setAllocations(u); }} /></div>
                <div className="col-span-2 flex justify-end">
                  <button onClick={() => setAllocations(allocations.filter((_, j) => j !== i))} className="rounded p-2 hover:bg-red-50"><Trash2 className="h-4 w-4 text-red-400" /></button>
                </div>
              </div>
            ))}

            {margin && (
              <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 dark:from-gray-800 dark:to-gray-900 md:grid-cols-3 dark:border-gray-700">
                <MarginGauge margin={margin.grossMargin} status={margin.marginStatus} />
                <div className="col-span-2 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Revenue</span><span className="font-semibold">{fmt(margin.revenue)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Employee Cost</span><span>{fmt(margin.employeeCost)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Overhead (SW + HW + Desk + Office)</span><span>{fmt(margin.overheadCost)}</span></div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700"><span className="font-medium">Total Cost</span><span className="font-semibold">{fmt(margin.totalCost)}</span></div>
                  <div className="flex justify-between"><span className="font-medium">Profit</span><span className={`font-bold ${margin.marginStatus === 'green' ? 'text-green-600' : margin.marginStatus === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>{fmt(margin.profit)}</span></div>
                  <p className="text-xs text-gray-400 mt-2">Margin updates dynamically as you add/remove resources or change allocation %</p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & Create</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Project</span><p className="font-semibold">{form.name}</p></div>
              <div><span className="text-gray-500">Client</span><p className="font-semibold">{form.client_name}</p></div>
              <div><span className="text-gray-500">Type</span><p>{form.project_type.replace('_', ' ')}</p></div>
              <div><span className="text-gray-500">Duration</span><p>{form.duration_days} days</p></div>
              <div><span className="text-gray-500">Team Size</span><p>{allocations.length} resources</p></div>
              <div><span className="text-gray-500">Documents</span><p>{docLinks.filter(Boolean).length} links</p></div>
            </div>
            {margin && <MarginGauge margin={margin.grossMargin} status={margin.marginStatus} size="sm" />}
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="btn-primary" disabled={step === 0 && !form.name}>
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving || !form.name} className="btn-primary">
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
