import { Resource } from '../types';
import { getResourceUtilizationForDate } from './capacity';
import { formatDate, getNextMonths, getWeekdaysInMonth, isWeekday } from './dates';

export const DEPARTMENT_BUCKETS = ['Development', 'QA', 'Design', 'Other'] as const;
export type DepartmentBucket = (typeof DEPARTMENT_BUCKETS)[number];

/** Map DB department names into PM-friendly buckets. */
export function getDepartmentBucket(departmentName: string | undefined | null): DepartmentBucket {
  const n = (departmentName || '').toLowerCase();
  if (n.includes('qa') || n.includes('quality') || n.includes('test')) return 'QA';
  if (n.includes('design') || n.includes('ux') || n.includes('ui')) return 'Design';
  if (
    n.includes('engineer') ||
    n.includes('develop') ||
    n === 'dev' ||
    n.includes('devops') ||
    n.includes('data sci') ||
    n.includes('software')
  ) {
    return 'Development';
  }
  return 'Other';
}

export interface DepartmentCapacitySnapshot {
  department: DepartmentBucket;
  headcount: number;
  utilizationPercent: number;
  availablePercent: number;
  totalCapacityFte: number;
  allocatedFte: number;
  availableFte: number;
}

export interface MonthlyCapacityPoint {
  month: string;
  monthKey: string;
  headcount: number;
  totalCapacityFte: number;
  allocatedFte: number;
  availableFte: number;
  utilizationPercent: number;
  availablePercent: number;
  byDepartment: DepartmentCapacitySnapshot[];
}

function utilizationFromFte(allocatedFte: number, capacityFte: number): number {
  if (capacityFte <= 0) return allocatedFte > 0 ? 100 : 0;
  return Math.round((allocatedFte / capacityFte) * 1000) / 10;
}

function dayFte(resourceId: number, date: string) {
  const { allocated, leaveImpact, capacity } = getResourceUtilizationForDate(resourceId, date);
  const effective = Math.max(0, capacity - leaveImpact);
  return {
    capacityFte: effective / 100,
    allocatedFte: allocated / 100,
  };
}

export function getDepartmentCapacityToday(resources: Resource[]): DepartmentCapacitySnapshot[] {
  const today = formatDate(new Date());
  const buckets = new Map<DepartmentBucket, { cap: number; alloc: number; count: number }>();
  for (const b of DEPARTMENT_BUCKETS) buckets.set(b, { cap: 0, alloc: 0, count: 0 });

  for (const r of resources) {
    if (!isWeekday(today)) continue;
    const bucket = getDepartmentBucket(r.department_name);
    const { capacityFte, allocatedFte } = dayFte(r.id, today);
    const entry = buckets.get(bucket)!;
    entry.cap += capacityFte;
    entry.alloc += allocatedFte;
    entry.count += 1;
  }

  return DEPARTMENT_BUCKETS.map((department) => {
    const { cap, alloc, count } = buckets.get(department)!;
    const util = utilizationFromFte(alloc, cap);
    return {
      department,
      headcount: count,
      totalCapacityFte: Math.round(cap * 10) / 10,
      allocatedFte: Math.round(alloc * 10) / 10,
      availableFte: Math.round(Math.max(0, cap - alloc) * 10) / 10,
      utilizationPercent: util,
      availablePercent: Math.round((100 - Math.min(util, 100)) * 10) / 10,
    };
  });
}

export function getMonthlyCapacityTrend(resources: Resource[], monthCount = 6): MonthlyCapacityPoint[] {
  const monthKeys = getNextMonths(monthCount);

  return monthKeys.map((monthKey) => {
    const weekdays = getWeekdaysInMonth(monthKey);
    const bucketTotals = new Map<DepartmentBucket, { cap: number; alloc: number }>();
    for (const b of DEPARTMENT_BUCKETS) bucketTotals.set(b, { cap: 0, alloc: 0 });

    let totalCap = 0;
    let totalAlloc = 0;

    for (const day of weekdays) {
      for (const r of resources) {
        const bucket = getDepartmentBucket(r.department_name);
        const { capacityFte, allocatedFte } = dayFte(r.id, day);
        totalCap += capacityFte;
        totalAlloc += allocatedFte;
        const entry = bucketTotals.get(bucket)!;
        entry.cap += capacityFte;
        entry.alloc += allocatedFte;
      }
    }

    const dayCount = weekdays.length || 1;
    const avgCap = totalCap / dayCount;
    const avgAlloc = totalAlloc / dayCount;
    const util = utilizationFromFte(avgAlloc, avgCap);

    const byDepartment = DEPARTMENT_BUCKETS.map((department) => {
      const { cap, alloc } = bucketTotals.get(department)!;
      const deptCap = cap / dayCount;
      const deptAlloc = alloc / dayCount;
      const headcount = resources.filter((r) => getDepartmentBucket(r.department_name) === department).length;
      const deptUtil = utilizationFromFte(deptAlloc, deptCap);
      return {
        department,
        headcount,
        totalCapacityFte: Math.round(deptCap * 10) / 10,
        allocatedFte: Math.round(deptAlloc * 10) / 10,
        availableFte: Math.round(Math.max(0, deptCap - deptAlloc) * 10) / 10,
        utilizationPercent: deptUtil,
        availablePercent: Math.round((100 - Math.min(deptUtil, 100)) * 10) / 10,
      };
    });

    const [y, m] = monthKey.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return {
      month: label,
      monthKey,
      headcount: resources.length,
      totalCapacityFte: Math.round(avgCap * 10) / 10,
      allocatedFte: Math.round(avgAlloc * 10) / 10,
      availableFte: Math.round(Math.max(0, avgCap - avgAlloc) * 10) / 10,
      utilizationPercent: util,
      availablePercent: Math.round((100 - Math.min(util, 100)) * 10) / 10,
      byDepartment,
    };
  });
}

export function getOrgAvailableCapacityPercent(resources: Resource[]): number {
  const today = formatDate(new Date());
  if (!isWeekday(today) || resources.length === 0) return 0;
  let cap = 0;
  let alloc = 0;
  for (const r of resources) {
    const fte = dayFte(r.id, today);
    cap += fte.capacityFte;
    alloc += fte.allocatedFte;
  }
  const util = utilizationFromFte(alloc, cap);
  return Math.round((100 - Math.min(util, 100)) * 10) / 10;
}

export function getOrgUtilizationPercent(resources: Resource[]): number {
  const today = formatDate(new Date());
  if (!isWeekday(today) || resources.length === 0) return 0;
  let cap = 0;
  let alloc = 0;
  for (const r of resources) {
    const fte = dayFte(r.id, today);
    cap += fte.capacityFte;
    alloc += fte.allocatedFte;
  }
  return utilizationFromFte(alloc, cap);
}
