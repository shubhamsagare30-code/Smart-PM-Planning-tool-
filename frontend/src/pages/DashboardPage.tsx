import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FolderKanban, Gauge, Activity, CheckCircle2, Clock, AlertTriangle, UserX, Shuffle, Palmtree } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { dashboardApi } from '../api';
import { StatCard } from '../components/StatCard';
import { MarginBadge } from '../components/MarginGauge';
import type { DashboardData } from '../types';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');

  const load = (projectId?: number) => {
    setLoading(true);
    dashboardApi.get(projectId).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedProjectId === '') {
      load();
    } else {
      load(selectedProjectId);
    }
  }, [selectedProjectId]);

  if (loading && !data) return <div className="text-gray-500">Loading dashboard...</div>;
  if (!data) return <div className="text-red-500">Failed to load dashboard</div>;

  const taskPie = data.taskSummary && data.taskSummary.total > 0 ? [
    { name: 'In Production', value: data.taskSummary.delivered, color: '#10b981' },
    { name: 'In Progress', value: data.taskSummary.inProgress, color: '#3b82f6' },
    { name: 'Delayed', value: data.taskSummary.delayed, color: '#ef4444' },
    { name: 'Planned', value: data.taskSummary.planned, color: '#9ca3af' },
  ].filter((d) => d.value > 0) : [];

  const metrics = data.allocationMetrics;
  const selectedProjectName = selectedProjectId
    ? data.projects?.find((p) => p.id === selectedProjectId)?.name
    : null;

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">Smart Project Planner</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">Organization overview — capacity, projects, and task pipeline</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        <StatCard title="Total Resources" value={data.totalResources} icon={<Users className="h-6 w-6" />} />
        <StatCard title="Active Projects" value={data.activeProjects} icon={<FolderKanban className="h-6 w-6" />}
          color="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
        <StatCard title="Available Capacity" value={`${data.availableCapacity}%`} icon={<Gauge className="h-6 w-6" />}
          color="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
        <StatCard title="Utilization" value={`${data.utilizationPercent}%`} icon={<Activity className="h-6 w-6" />}
          color={data.utilizationPercent > 100 ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : data.utilizationPercent >= 80 ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'} />
      </div>

      {metrics && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat icon={<UserX className="h-4 w-4 text-red-500" />} label="Over-allocated" value={metrics.overAllocatedCount}
            hint={metrics.overAllocatedNames.slice(0, 2).join(', ')} />
          <MiniStat icon={<Gauge className="h-4 w-4 text-green-500" />} label="Bench available" value={metrics.benchAvailableCount} />
          <MiniStat icon={<Shuffle className="h-4 w-4 text-yellow-500" />} label="Context switching (3+ projects)" value={metrics.contextSwitching.length} />
          <MiniStat icon={<Palmtree className="h-4 w-4 text-orange-500" />} label="Leave impact (high util)" value={metrics.leaveImpact.length} />
        </div>
      )}

      {data.taskSummary && data.taskSummary.total > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} label="In Production" value={data.taskSummary.delivered} />
          <MiniStat icon={<Clock className="h-4 w-4 text-blue-500" />} label="In Progress" value={data.taskSummary.inProgress} />
          <MiniStat icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label="Delayed" value={data.taskSummary.delayed} />
          <MiniStat icon={<FolderKanban className="h-4 w-4 text-gray-400" />} label="Planned" value={data.taskSummary.planned} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold sm:text-lg">Task Pipeline</h3>
            {data.projects && data.projects.length > 0 && (
              <select
                className="input w-auto max-w-[220px] text-sm"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value ? +e.target.value : '')}
              >
                <option value="">All projects</option>
                {data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
          {taskPie.length > 0 ? (
            <>
              {selectedProjectName && (
                <p className="mb-2 text-xs text-gray-500">Showing tasks for: <span className="font-medium">{selectedProjectName}</span></p>
              )}
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={taskPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
                    {taskPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">No tasks for this selection. Add tasks from a project page.</p>
          )}
        </div>

        <div className="card">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">Resource Utilization</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.resourceUtilization.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 120]} />
              <Tooltip />
              <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">Project Allocation</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.projectAllocation.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="allocated" fill="#8b5cf6" name="Allocation %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {data.projectHealth && data.projectHealth.length > 0 && (
          <div className="card lg:col-span-2">
            <h3 className="mb-4 text-base font-semibold sm:text-lg">Project Health</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 dark:border-gray-700">
                    <th className="pb-2 pr-4">Project</th>
                    <th className="pb-2 pr-4">Margin</th>
                    <th className="pb-2 pr-4">Task Progress</th>
                    <th className="pb-2">Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projectHealth.map((p) => (
                    <tr key={p.id} className="border-b dark:border-gray-800">
                      <td className="py-3 pr-4">
                        <Link to={`/projects/${p.id}`} className="font-medium text-brand-600 hover:underline">{p.name}</Link>
                      </td>
                      <td className="py-3 pr-4">
                        <MarginBadge margin={p.margin} status={p.marginStatus as 'red' | 'yellow' | 'green'} />
                      </td>
                      <td className="py-3 pr-4">{p.completion}%</td>
                      <td className="py-3 capitalize">
                        <span className={p.timelineStatus === 'behind' ? 'text-red-600' : p.timelineStatus === 'at_risk' ? 'text-yellow-600' : 'text-green-600'}>
                          {p.timelineStatus.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold sm:text-lg">Monthly Capacity Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.monthlyCapacity}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="capacity" stroke="#3b82f6" name="Capacity" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="allocated" stroke="#f59e0b" name="Allocated" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="available" stroke="#10b981" name="Available" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2 text-xs text-gray-500">{icon}{label}</div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}
