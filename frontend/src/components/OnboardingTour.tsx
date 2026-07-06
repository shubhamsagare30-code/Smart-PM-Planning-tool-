import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { useOnboarding } from '../context/OnboardingContext';

const STORAGE_KEY = 'spp-tour-completed';

const TOUR_STEPS = [
  {
    route: '/',
    title: 'Welcome to Smart Project Planner',
    body: 'Your local-first PM command center. Track resources, projects, margins, and capacity — all data stays on your machine.',
  },
  {
    route: '/',
    title: 'Main Dashboard',
    body: 'See organization-wide KPIs: resource utilization, project health, capacity trends, and task pipeline at a glance.',
  },
  {
    route: '/resources',
    title: 'Resources',
    body: 'Manage your team — skills, departments, daily cost rates, and capacity %. Search and filter to find the right people.',
  },
  {
    route: '/projects',
    title: 'Projects',
    body: 'Create projects with the step-by-step wizard. Each project shows gross margin (green/yellow/red), tasks, and a management one-pager.',
  },
  {
    route: '/allocations',
    title: 'Allocations',
    body: 'Assign resources to projects with percentage and dates. Warnings appear when allocation exceeds 100% capacity.',
  },
  {
    route: '/leaves',
    title: 'Leave Management',
    body: 'Track vacation, sick leave, holidays, and training. Available capacity adjusts automatically on leave days.',
  },
  {
    route: '/heatmap',
    title: 'Capacity Heatmap',
    body: 'Visual matrix of resource utilization by week. Green = under 80%, Yellow = 80–100%, Red = over-allocated.',
  },
  {
    route: '/forecast',
    title: 'Forecast',
    body: 'Look ahead 30, 60, or 90 days for capacity conflicts, resource shortages, and expiring allocations.',
  },
  {
    route: '/skill-matrix',
    title: 'Skill Matrix',
    body: 'Find available resources by skill and role. See who has free capacity for new assignments.',
  },
  {
    route: '/reports',
    title: 'Reports',
    body: 'Export utilization, allocation, and capacity reports as CSV or Excel for stakeholder reviews.',
  },
  {
    route: '/',
    title: 'You\'re all set!',
    body: 'All your data saves locally in backend/data/capacity.db and is never erased automatically. Click the help button anytime to replay this tour.',
  },
];

export function OnboardingTour() {
  const { isActive } = useOnboarding();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setVisible(true);
      setStep(0);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
      setStep(0);
    }
  }, [isActive]);

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const next = () => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-600">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Quick Tour · {step + 1}/{TOUR_STEPS.length}</span>
          </div>
          <button onClick={finish} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close tour">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-2 flex gap-1">
          {TOUR_STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>

        <h2 className="mb-2 text-xl font-bold">{current.title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{current.body}</p>

        {current.route !== location.pathname && step > 0 && step < TOUR_STEPS.length - 1 && (
          <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            Tip: Navigate to <strong>{current.route === '/' ? 'Dashboard' : current.route.slice(1)}</strong> in the sidebar to explore this section.
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <button onClick={prev} disabled={step === 0} className="btn-secondary flex-1 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <button onClick={next} className="btn-primary flex-1">
            {isLast ? 'Get Started' : 'Next'} {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        <button onClick={finish} className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600">
          Skip tour
        </button>
      </div>
    </div>
  );
}

export function TourTrigger() {
  const { startTour } = useOnboarding();
  return (
    <button onClick={startTour} className="text-xs text-brand-600 hover:underline dark:text-brand-400">
      Replay tour
    </button>
  );
}
