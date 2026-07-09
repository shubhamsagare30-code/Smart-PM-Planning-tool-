import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Calendar, Clock, DollarSign, ExternalLink,
  Lightbulb, Link2, Plus, Target, TrendingUp, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { projectsApi, resourceRequestsApi, resourcesApi } from '../api';
import { Badge } from '../components/Badge';
import { DailyStandupTab } from '../components/DailyStandupTab';
import { KanbanBoard } from '../components/KanbanBoard';
import { MarginBadge, MarginGauge } from '../components/MarginGauge';
import { TaskModal } from '../components/TaskModal';
import { useAuth } from '../context/AuthContext';
import type { ProjectDashboard, ProjectTask, RequestImpact, Resource } from '../types';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isMember } = useAuth();
  const [dash, setDash] = useState<ProjectDashboard | null>(null);
  const [tab, setTab] = useState<'overview' | 'board' | 'team' | 'requests' | 'standup'>('overview');
  const [impact, setImpact] = useState<RequestImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  const load = () => {
    if (!id) return;
    projectsApi.getDashboard(+id).then(setDash).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { resourcesApi.list({ status: 'active' }).then(setResources); }, []);

  const handleMoveTask = async (taskId: number, column: string) => {
    if (!id) return;
    await projectsApi.updateTask(+id, taskId, { kanban_column: column as ProjectDashboard['tasks'][0]['kanban_column'] });
    load();
  };

  const analyzeRequest = async (req: ProjectDashboard['resourceRequests'][0]) => {
    const result = await resourceRequestsApi.analyze({
      requesting_project_id: req.requesting_project_id,
      resource_id: req.resource_id,
      requested_allocation_percent: req.requested_allocation_percent,
    });
    setImpact(result);
  };

  const openAddTask = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const openEditTask = (task: ProjectTask) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (data: Record<string, unknown>) => {
    if (!id) return;
    if (editingTask) {
      await projectsApi.updateTask(+id, editingTask.id, data as Partial<ProjectTask>);
    } else {
      await projectsApi.createTask(+id, data);
    }
    setTaskModalOpen(false);
    load();
  };

  const handleAddComment = async (text: string, author: string) => {
    if (!id || !editingTask) return;
    const updated = await projectsApi.addTaskComment(+id, editingTask.id, author, text);
    setEditingTask(updated);
    load();
  };

  if (loading) return <div className="text-gray-500">Loading project...</div>;
  if (!dash) return <div className="text-red-500">Project not found</div>;

  const { project, financials, timeline, cost, completion, suggestions } = dash;

  const costBreakdown = [
    { name: 'Employees', value: financials.employeeCost, color: '#3b82f6' },
    { name: 'Software', value: financials.softwareCost, color: '#8b5cf6' },
    { name: 'Hardware', value: financials.hardwareCost, color: '#f59e0b' },
    { name: 'Desk', value: financials.deskCost, color: '#10b981' },
    { name: 'Office', value: financials.officeCost, color: '#6366f1' },
  ];

  const timelineColor = { on_track: 'text-green-600', at_risk: 'text-yellow-600', behind: 'text-red-600' };
  const costColor = { under: 'text-green-600', on_track: 'text-blue-600', over: 'text-red-600' };

  const taskStatusData = dash.bucketBreakdown
    ? dash.bucketBreakdown.filter((b) => b.count > 0).map((b, i) => ({
        name: b.label.length > 18 ? b.label.slice(0, 16) + '…' : b.label,
        value: b.count,
        color: ['#9ca3af', '#64748b', '#3b82f6', '#eab308', '#f97316', '#a855f7', '#10b981', '#06b6d4'][i % 8],
      }))
    : [];

  const progressData = [
    { name: 'Planned', value: completion.planned, fill: '#93c5fd' },
    { name: 'Actual', value: completion.actual, fill: completion.actual >= completion.planned ? '#10b981' : '#ef4444' },
  ];

  const hoursData = dash.tasks.slice(0, 8).map((t) => ({
    name: t.title.length > 20 ? t.title.slice(0, 18) + '…' : t.title,
    planned: t.planned_hours,
    actual: t.actual_hours,
  }));

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="mb-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> All Projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{project.name}</h1>
            <p className="text-gray-500">{project.client_name} · {project.project_type.replace(/_/g, ' ')} · {project.duration_days} days</p>
          </div>
          <div className="flex items-center gap-3">
            <MarginBadge margin={financials.grossMargin} status={financials.marginStatus} />
            <Badge variant={project.status === 'active' ? 'success' : 'warning'}>{project.status}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
        {(['overview', 'board', 'team', 'requests', ...(!isMember ? ['standup' as const] : [])] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors sm:px-4 sm:text-sm ${
              tab === t ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>{t === 'requests' ? 'Resource Requests' : t === 'standup' ? 'Daily Standup' : t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {dash.delayedTasks && dash.delayedTasks.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="mb-2 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                {dash.delayedTasks.length} delayed task{dash.delayedTasks.length > 1 ? 's' : ''}
              </div>
              <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
                {dash.delayedTasks.map((t) => (
                  <li key={t.id}>• {t.task_uid} — {t.title} (due {t.due_date})</li>
                ))}
              </ul>
            </div>
          )}
          {/* One-Pager Management Dashboard */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <MarginGauge margin={financials.grossMargin} status={financials.marginStatus} />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:col-span-3">
              <HealthCard icon={<Calendar className="h-5 w-5" />} title="Timeline Adherence"
                value={`${timeline.adherencePercent}%`} subtitle={`${timeline.deliverablesActual}/${timeline.deliverablesPlanned} deliverables`}
                status={timeline.status} statusLabel={timeline.status.replace('_', ' ')} color={timelineColor[timeline.status]} />
              <HealthCard icon={<DollarSign className="h-5 w-5" />} title="Cost Status"
                value={fmt(cost.actual)} subtitle={`Planned: ${fmt(cost.planned)} · ${cost.variance >= 0 ? '+' : ''}${fmt(cost.variance)}`}
                status={cost.status} statusLabel={cost.status === 'over' ? 'Over Budget' : cost.status === 'under' ? 'Under Budget' : 'On Track'} color={costColor[cost.status]} />
              <HealthCard icon={<Target className="h-5 w-5" />} title="Task Progress"
                value={`${completion.actual}%`} subtitle={`Bucket-weighted · Planned timeline: ${completion.planned}%`}
                status={completion.variance >= 0 ? 'on_track' : 'behind'} statusLabel={completion.taskBased ? 'From kanban buckets' : (completion.variance >= 0 ? 'Ahead' : 'Behind')} color={completion.variance >= 0 ? 'text-green-600' : 'text-red-600'} />
              <HealthCard icon={<Clock className="h-5 w-5" />} title="Time Logged"
                value={`${dash.timeLogs.reduce((s, t) => s + t.hours, 0)}h`} subtitle={`${dash.allocations.length} resources allocated`}
                status="on_track" statusLabel={`${timeline.elapsedDays}/${timeline.plannedDays} days elapsed`} color="text-blue-600" />
            </div>
          </div>

          {/* Task & progress charts */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
            {taskStatusData.length > 0 && (
              <div className="card">
                <h3 className="mb-3 text-sm font-semibold">Tasks by Bucket ({dash.tasks.length})</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={taskStatusData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={55} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                      {taskStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="card">
              <h3 className="mb-3 text-sm font-semibold">Completion Progress</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={progressData} startAngle={180} endAngle={0}>
                  <RadialBar dataKey="value" cornerRadius={4} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <p className="text-center text-xs text-gray-500">Planned {completion.planned}% vs Actual {completion.actual}%</p>
            </div>
            {hoursData.length > 0 && (
              <div className="card md:col-span-1">
                <h3 className="mb-3 text-sm font-semibold">Hours: Planned vs Actual</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hoursData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="planned" fill="#93c5fd" name="Planned" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="actual" fill="#3b82f6" name="Actual" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Financial breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-4 font-semibold">Cost Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={costBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {costBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Revenue</span><span className="font-semibold text-green-600">{fmt(financials.revenue)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Cost</span><span className="font-semibold">{fmt(financials.totalCost)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Profit</span><span className={`font-bold ${financials.marginStatus === 'green' ? 'text-green-600' : financials.marginStatus === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>{fmt(financials.profit)}</span></div>
              </div>
            </div>

            {/* Smart Suggestions */}
            <div className="card">
              <div className="mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Smart Suggestions</h3>
                <Badge variant={suggestions.length > 0 ? 'warning' : 'success'}>{suggestions.length}</Badge>
              </div>
              {suggestions.length === 0 ? (
                <p className="text-sm text-gray-500">Project is healthy — no suggestions at this time.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${s.severity === 'high' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'}`}>
                      <div className="mb-1 flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${s.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                        <span className="font-semibold text-sm">{s.title}</span>
                      </div>
                      <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">{s.message}</p>
                      <ul className="list-inside list-disc text-xs text-gray-500 space-y-0.5">
                        {s.actions.map((a, j) => <li key={j}>{a}</li>)}
                      </ul>
                      {s.availableResources && s.availableResources.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.availableResources.map((r) => (
                            <span key={r.id} className="rounded-full bg-white px-2 py-0.5 text-xs dark:bg-gray-800">{r.name} ({r.available}% free)</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Documentation */}
          {dash.documentationLinks.length > 0 && (
            <div className="card">
              <h3 className="mb-3 font-semibold">Documentation</h3>
              <div className="space-y-2">
                {dash.documentationLinks.map((link, i) => (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                    <Link2 className="h-4 w-4" />{link}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'board' && (
        <div className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Project Board</h3>
            <div className="flex items-center gap-2">
              <button onClick={openAddTask} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Add Task</button>
              {project.board_type !== 'internal' && project.external_board_url && (
                <a href={project.external_board_url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
                  <ExternalLink className="h-4 w-4" /> Open in {project.board_type.charAt(0).toUpperCase() + project.board_type.slice(1)}
                </a>
              )}
            </div>
          </div>
          {project.board_type === 'internal' ? (
            <KanbanBoard tasks={dash.tasks} onMoveTask={handleMoveTask} onTaskClick={openEditTask} />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
              <ExternalLink className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              <p className="text-gray-500">Board managed externally via {project.board_type}</p>
              {project.external_board_url && (
                <a href={project.external_board_url} className="mt-2 inline-block text-brand-600 hover:underline">{project.external_board_url}</a>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="space-y-6">
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left">Resource</th>
                  <th className="px-4 py-3 text-left">Allocation</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-left">Hours Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {dash.allocations.map((a) => {
                  const hours = dash.timeLogs.filter((t) => t.resource_id === a.resource_id).reduce((s, t) => s + t.hours, 0);
                  return (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium">{a.resource_name}</td>
                      <td className="px-4 py-3"><span className="font-semibold text-brand-600">{a.allocation_percentage}%</span></td>
                      <td className="px-4 py-3 text-gray-500">{a.start_date} → {a.end_date}</td>
                      <td className="px-4 py-3">{hours}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {dash.timeLogs.length > 0 && (
            <div className="card">
              <h3 className="mb-3 font-semibold">Recent Time Logs</h3>
              <div className="space-y-2">
                {dash.timeLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex justify-between text-sm">
                    <span>{log.resource_name} — {log.log_date}</span>
                    <span className="font-medium">{log.hours}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          {dash.resourceRequests.length === 0 ? (
            <div className="card text-center text-gray-500">No resource requests for this project.</div>
          ) : dash.resourceRequests.map((req) => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{req.resource_name} — {req.requested_allocation_percent}% requested</p>
                  <p className="text-sm text-gray-500">From: {req.source_project_name || 'Unassigned'} → {req.requesting_project_name}</p>
                  {req.message && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{req.message}</p>}
                </div>
                <Badge variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'danger'}>{req.status}</Badge>
              </div>
              <button onClick={() => analyzeRequest(req)} className="btn-secondary mt-3 text-sm">
                <Users className="h-4 w-4" /> Analyze Impact on Both Projects
              </button>
            </div>
          ))}
          {impact && (
            <div className="card border-2 border-brand-200 dark:border-brand-800">
              <h3 className="mb-3 font-semibold">Cross-Project Impact Analysis</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Requesting: {impact.requestingProject.name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold">{impact.requestingProject.marginBefore}%</span>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-lg font-bold text-green-600">{impact.requestingProject.marginAfter}%</span>
                  </div>
                  <p className="text-xs text-gray-400">Margin change: {impact.requestingProject.marginChange > 0 ? '+' : ''}{impact.requestingProject.marginChange}%</p>
                </div>
                {impact.sourceProject && (
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-sm text-gray-500">Source: {impact.sourceProject.projectName}</p>
                    <p className="mt-2">Allocation: {impact.sourceProject.currentAllocation}% → {impact.sourceProject.afterAllocation}%</p>
                    {impact.sourceProject.warning && <p className="mt-1 text-sm text-red-500">{impact.sourceProject.warning}</p>}
                  </div>
                )}
              </div>
              <p className={`mt-3 text-sm font-medium ${impact.feasible ? 'text-green-600' : 'text-red-600'}`}>
                {impact.feasible ? `✓ Feasible — ${impact.resource.name} has ${impact.resource.availableCapacity}% available` : '✗ Not feasible — insufficient capacity'}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'standup' && id && (
        <DailyStandupTab
          projectId={+id}
          teamNames={[...new Set(dash.allocations.map((a) => a.resource_name).filter((n): n is string => !!n))]}
        />
      )}

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={editingTask}
        resources={resources}
        onSave={handleSaveTask}
        onAddComment={editingTask ? handleAddComment : undefined}
      />
    </div>
  );
}

function HealthCard({ icon, title, value, subtitle, statusLabel, color }: {
  icon: React.ReactNode; title: string; value: string; subtitle: string;
  status: string; statusLabel: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-2 flex items-center gap-2 text-gray-500">
        {icon}<span className="text-xs font-medium uppercase tracking-wide">{title}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
      <p className={`mt-2 text-xs font-semibold capitalize ${color}`}>{statusLabel}</p>
    </div>
  );
}
