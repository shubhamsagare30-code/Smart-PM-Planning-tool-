import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { OnboardingTour } from './OnboardingTour';

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden dark:border-gray-800 dark:bg-gray-900">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">Smart Project Planner</p>
          <p className="text-xs text-gray-500">Local PM Dashboard</p>
        </div>
        <div className="w-10" />
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw]">
            <button onClick={() => setMobileOpen(false)} className="absolute right-2 top-3 z-10 rounded-lg bg-white p-2 shadow dark:bg-gray-800" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} mobile />
          </div>
        </div>
      )}

      <Sidebar className="hidden lg:flex" />
      <main className="min-h-screen p-4 sm:p-6 lg:ml-64 lg:p-8">
        <Outlet />
      </main>
      <OnboardingTour />
    </div>
  );
}
