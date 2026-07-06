import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import { projectsApi } from '../api';
import { Badge, statusBadge } from '../components/Badge';
import { MarginBadge } from '../components/MarginGauge';
import type { Project, ProjectFinancials } from '../types';

interface ProjectWithMargin extends Project {
  margin?: ProjectFinancials;
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithMargin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.list().then(async (list) => {
      const enriched = await Promise.all(
        list.map(async (p) => {
          try {
            const dash = await projectsApi.getDashboard(p.id);
            return { ...p, margin: dash.financials };
          } catch {
            return { ...p };
          }
        })
      );
      setProjects(enriched);
    }).finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  if (loading) return <div className="text-gray-500">Loading projects...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage projects with live margin tracking and health dashboards</p>
        </div>
        <Link to="/projects/new" className="btn-primary"><Plus className="h-4 w-4" /> New Project</Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="card group transition-shadow hover:shadow-md">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-semibold group-hover:text-brand-600">{p.name}</h3>
                <p className="text-sm text-gray-500">{p.client_name}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={statusBadge(p.status)}>{p.status.replace('_', ' ')}</Badge>
                {p.margin && <MarginBadge margin={p.margin.grossMargin} status={p.margin.marginStatus} />}
              </div>
            </div>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{p.description}</p>
            <div className="mb-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Revenue</span><span className="font-medium">{fmt(p.budget)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize">{p.project_type?.replace(/_/g, ' ') || 'Fixed cost'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Timeline</span><span>{p.start_date} → {p.end_date}</span></div>
              {p.actual_completion_percent > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Progress</span><span>{p.actual_completion_percent}%</span></div>
              )}
            </div>
            <div className="flex items-center text-sm font-medium text-brand-600">
              View Dashboard <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
