import { useEffect, useState } from 'react';
import { AlertTriangle, Users, Clock } from 'lucide-react';
import { forecastApi } from '../api';
import { Badge } from '../components/Badge';
import type { ForecastItem } from '../types';

const periods = [30, 60, 90] as const;

const typeIcons = {
  conflict: AlertTriangle,
  shortage: Users,
  expiring: Clock,
};

const severityVariant = {
  low: 'info' as const,
  medium: 'warning' as const,
  high: 'danger' as const,
};

export function ForecastPage() {
  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    forecastApi.get(days).then(setItems).finally(() => setLoading(false));
  }, [days]);

  const grouped = {
    conflict: items.filter((i) => i.type === 'conflict'),
    shortage: items.filter((i) => i.type === 'shortage'),
    expiring: items.filter((i) => i.type === 'expiring'),
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forecast</h1>
          <p className="text-gray-500 dark:text-gray-400">Upcoming capacity conflicts, shortages, and expiring allocations</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className={`px-4 py-2 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                days === p ? 'bg-brand-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {p} Days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading forecast...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {(['conflict', 'shortage', 'expiring'] as const).map((type) => {
            const Icon = typeIcons[type];
            const titles = { conflict: 'Capacity Conflicts', shortage: 'Resource Shortages', expiring: 'Expiring Allocations' };
            return (
              <div key={type} className="card">
                <div className="mb-4 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-brand-600" />
                  <h3 className="font-semibold">{titles[type]}</h3>
                  <Badge>{grouped[type].length}</Badge>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {grouped[type].length === 0 ? (
                    <p className="text-sm text-gray-500">No items found</p>
                  ) : (
                    grouped[type].map((item, i) => (
                      <div key={i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="mb-1 flex items-center justify-between">
                          <Badge variant={severityVariant[item.severity]}>{item.severity}</Badge>
                          <span className="text-xs text-gray-500">{item.date}</span>
                        </div>
                        <p className="text-sm">{item.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
