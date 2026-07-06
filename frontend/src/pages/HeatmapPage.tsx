import { useEffect, useState, useMemo } from 'react';
import { heatmapApi } from '../api';
import type { HeatmapCell } from '../types';

function getColor(status: HeatmapCell['status'], utilization: number) {
  if (status === 'over' || utilization > 100) return 'bg-red-500 text-white';
  if (status === 'warning' || utilization >= 80) return 'bg-yellow-400 text-gray-900';
  return 'bg-green-500 text-white';
}

export function HeatmapPage() {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    heatmapApi.get(8).then(setCells).finally(() => setLoading(false));
  }, []);

  const { resources, weeks, matrix } = useMemo(() => {
    const resourceNames = [...new Set(cells.map((c) => c.resourceName))];
    const weekKeys = [...new Set(cells.map((c) => c.week))].sort();
    const map = new Map<string, HeatmapCell>();
    cells.forEach((c) => map.set(`${c.resourceName}-${c.week}`, c));
    return { resources: resourceNames, weeks: weekKeys, matrix: map };
  }, [cells]);

  if (loading) return <div className="text-gray-500">Loading heatmap...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Capacity Heatmap</h1>
        <p className="text-gray-500 dark:text-gray-400">Resource utilization matrix — weekly view</p>
      </div>

      <div className="mb-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-green-500" /> Under 80%</div>
        <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-yellow-400" /> 80%–100%</div>
        <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-red-500" /> Above 100%</div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="sticky left-0 bg-white px-4 py-3 text-left font-medium dark:bg-gray-900">Resource</th>
              {weeks.map((w) => (
                <th key={w} className="px-2 py-3 text-center font-medium text-xs whitespace-nowrap">{w}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((name) => (
              <tr key={name} className="border-b border-gray-100 dark:border-gray-800">
                <td className="sticky left-0 bg-white px-4 py-2 font-medium whitespace-nowrap dark:bg-gray-900">{name}</td>
                {weeks.map((week) => {
                  const cell = matrix.get(`${name}-${week}`);
                  const util = cell?.utilization ?? 0;
                  const status = cell?.status ?? 'under';
                  return (
                    <td key={week} className="px-1 py-1">
                      <div
                        className={`flex h-10 w-16 items-center justify-center rounded text-xs font-semibold ${getColor(status, util)}`}
                        title={`${name}: ${util}%`}
                      >
                        {util}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
