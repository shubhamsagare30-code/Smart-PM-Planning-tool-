import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderKanban, GitBranch, CalendarOff,
  Grid3x3, TrendingUp, Brain, FileBarChart, Moon, Sun, BarChart3, HelpCircle,
  Shield, LogOut,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

const navItems: { to: string; icon: typeof LayoutDashboard; label: string; roles: UserRole[] }[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'director', 'pm'] },
  { to: '/projects', icon: FolderKanban, label: 'Projects', roles: ['admin', 'director', 'pm', 'member'] },
  { to: '/resources', icon: Users, label: 'Resources', roles: ['admin', 'director', 'pm'] },
  { to: '/allocations', icon: GitBranch, label: 'Allocations', roles: ['admin', 'director', 'pm'] },
  { to: '/leaves', icon: CalendarOff, label: 'Leave Management', roles: ['admin', 'director', 'pm'] },
  { to: '/heatmap', icon: Grid3x3, label: 'Heatmap', roles: ['admin', 'director', 'pm'] },
  { to: '/forecast', icon: TrendingUp, label: 'Forecast', roles: ['admin', 'director', 'pm'] },
  { to: '/skill-matrix', icon: Brain, label: 'Skill Matrix', roles: ['admin', 'director', 'pm'] },
  { to: '/reports', icon: FileBarChart, label: 'Reports', roles: ['admin', 'director', 'pm'] },
  { to: '/admin', icon: Shield, label: 'Admin', roles: ['admin'] },
];

interface SidebarProps {
  className?: string;
  mobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ className = '', mobile, onNavigate }: SidebarProps) {
  const { dark, toggle } = useTheme();
  const { startTour } = useOnboarding();
  const { user, logout } = useAuth();

  const visibleNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className={`${mobile ? 'flex' : 'fixed left-0 top-0 z-40 hidden lg:flex'} h-screen w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}>
      <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold leading-tight">Smart PM</h1>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.name} · {user?.role}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-gray-200 p-4 dark:border-gray-800">
        <button
          onClick={() => { startTour(); onNavigate?.(); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <HelpCircle className="h-5 w-5" />
          Product Tour
        </button>
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={() => { logout(); onNavigate?.(); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
        <div className="px-3 pt-3 text-center text-[11px] leading-relaxed text-gray-400">
          <p className="mb-1">v3.1.0</p>
          <p>
            Thoughtfully Designed by{' '}
            <a
              href="mailto:Shubhamsagare30@gmail.com?subject=Smart%20PM%20Tool%20Feedback"
              className="text-brand-600 hover:underline dark:text-brand-400"
            >
              Shubham Sagare
            </a>
            {' '}(Your PM friend)
          </p>
        </div>
      </div>
    </aside>
  );
}
