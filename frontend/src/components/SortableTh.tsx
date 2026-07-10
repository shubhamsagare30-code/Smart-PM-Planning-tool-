import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

export function compareValues(a: unknown, b: unknown, dir: SortDirection): number {
  const mul = dir === 'asc' ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * mul;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }) * mul;
}

export function SortableTh({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  className = '',
}: {
  label: string;
  column: string;
  sortKey: string;
  sortDir: SortDirection;
  onSort: (column: string) => void;
  className?: string;
}) {
  const active = sortKey === column;
  return (
    <th className={`px-4 py-3 text-left font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 hover:text-brand-600"
        title={`Sort by ${label}`}
      >
        {label}
        {active ? (
          sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}

export function useSortState(defaultKey: string, defaultDir: SortDirection = 'asc') {
  return { defaultKey, defaultDir };
}
