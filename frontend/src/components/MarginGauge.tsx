import type { MarginStatus } from '../types';

interface MarginGaugeProps {
  margin: number;
  status: MarginStatus;
  size?: 'sm' | 'lg';
}

const statusConfig = {
  red: { ring: 'stroke-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', label: 'Critical' },
  yellow: { ring: 'stroke-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', label: 'At Risk' },
  green: { ring: 'stroke-green-500', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', label: 'Healthy' },
};

export function MarginGauge({ margin, status, size = 'lg' }: MarginGaugeProps) {
  const cfg = statusConfig[status];
  const radius = size === 'lg' ? 54 : 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(margin, 100) / 100) * circumference;
  const dim = size === 'lg' ? 140 : 96;

  return (
    <div className={`flex flex-col items-center rounded-2xl p-4 ${cfg.bg}`}>
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg className="-rotate-90 transform" width={dim} height={dim}>
          <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={size === 'lg' ? 10 : 7} className="text-gray-200 dark:text-gray-700" />
          <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" strokeWidth={size === 'lg' ? 10 : 7} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={cfg.ring} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${size === 'lg' ? 'text-3xl' : 'text-xl'} ${cfg.text}`}>{margin}%</span>
          <span className="text-xs text-gray-500">Gross Margin</span>
        </div>
      </div>
      <span className={`mt-2 text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}

export function MarginBadge({ margin, status }: { margin: number; status: MarginStatus }) {
  const colors = { red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${colors[status]}`}>{margin}% margin</span>;
}
