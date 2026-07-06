import { getDb } from '../database/connection';
import { Allocation, Leave, Resource } from '../types';
import { eachDayInRange, isWeekday, rangesOverlap } from './dates';

interface DayUtilization {
  allocated: number;
  leaveImpact: number;
  capacity: number;
}

export function getResourceUtilizationForDate(
  resourceId: number,
  date: string,
  excludeAllocationId?: number
): DayUtilization {
  const db = getDb();

  const resource = db
    .prepare('SELECT capacity_percentage FROM resources WHERE id = ? AND status = ?')
    .get(resourceId, 'active') as { capacity_percentage: number } | undefined;

  if (!resource) {
    return { allocated: 0, leaveImpact: 0, capacity: 0 };
  }

  const capacity = resource.capacity_percentage;

  let allocated = 0;
  const allocations = db
    .prepare(
      `SELECT id, allocation_percentage, start_date, end_date FROM allocations
       WHERE resource_id = ? AND start_date <= ? AND end_date >= ?`
    )
    .all(resourceId, date, date) as unknown as Allocation[];

  for (const alloc of allocations) {
    if (excludeAllocationId && alloc.id === excludeAllocationId) continue;
    allocated += alloc.allocation_percentage;
  }

  let leaveImpact = 0;
  if (isWeekday(date)) {
    const leaves = db
      .prepare(
        `SELECT id FROM leaves WHERE resource_id = ? AND start_date <= ? AND end_date >= ?`
      )
      .all(resourceId, date, date);
    if (leaves.length > 0) {
      leaveImpact = capacity;
    }
  }

  return { allocated, leaveImpact, capacity };
}

export function getResourceUtilizationInRange(
  resourceId: number,
  startDate: string,
  endDate: string,
  excludeAllocationId?: number
): { maxUtilization: number; avgUtilization: number; overAllocatedDays: number } {
  const days = eachDayInRange(startDate, endDate).filter(isWeekday);
  if (days.length === 0) {
    return { maxUtilization: 0, avgUtilization: 0, overAllocatedDays: 0 };
  }

  let total = 0;
  let max = 0;
  let overDays = 0;

  for (const day of days) {
    const { allocated, leaveImpact, capacity } = getResourceUtilizationForDate(
      resourceId,
      day,
      excludeAllocationId
    );
    const effectiveCapacity = Math.max(0, capacity - leaveImpact);
    const utilization = effectiveCapacity > 0 ? (allocated / effectiveCapacity) * 100 : allocated > 0 ? 100 : 0;
    total += utilization;
    max = Math.max(max, utilization);
    if (utilization > 100) overDays++;
  }

  return {
    maxUtilization: Math.round(max * 10) / 10,
    avgUtilization: Math.round((total / days.length) * 10) / 10,
    overAllocatedDays: overDays,
  };
}

export function validateAllocationCapacity(
  resourceId: number,
  allocationPercent: number,
  startDate: string,
  endDate: string,
  excludeAllocationId?: number
): { valid: boolean; warnings: string[]; maxUtilization: number } {
  const warnings: string[] = [];
  const days = eachDayInRange(startDate, endDate).filter(isWeekday);

  let maxUtil = 0;

  for (const day of days) {
    const current = getResourceUtilizationForDate(resourceId, day, excludeAllocationId);
    const effectiveCapacity = Math.max(0, current.capacity - current.leaveImpact);
    const newTotal = current.allocated + allocationPercent;
    const utilization = effectiveCapacity > 0 ? (newTotal / effectiveCapacity) * 100 : newTotal > 0 ? 100 : 0;
    maxUtil = Math.max(maxUtil, utilization);

    if (current.leaveImpact > 0 && allocationPercent > 0) {
      warnings.push(`Resource is on leave on ${day}`);
    }
  }

  if (maxUtil > 100) {
    warnings.push(`Allocation would exceed 100% capacity (peak: ${Math.round(maxUtil)}%)`);
  }

  return {
    valid: maxUtil <= 100,
    warnings: [...new Set(warnings)],
    maxUtilization: Math.round(maxUtil * 10) / 10,
  };
}

export function getCurrentUtilizationForResource(resource: Resource): number {
  const today = new Date().toISOString().split('T')[0];
  const { allocated, leaveImpact, capacity } = getResourceUtilizationForDate(resource.id, today);
  const effectiveCapacity = Math.max(0, capacity - leaveImpact);
  if (effectiveCapacity === 0) return allocated > 0 ? 100 : 0;
  return Math.round((allocated / effectiveCapacity) * 1000) / 10;
}

export function getOverallUtilization(): number {
  const db = getDb();
  const resources = db
    .prepare('SELECT * FROM resources WHERE status = ?')
    .all('active') as unknown as Resource[];

  if (resources.length === 0) return 0;

  const today = new Date().toISOString().split('T')[0];
  let totalUtil = 0;
  let count = 0;

  for (const resource of resources) {
    const { allocated, leaveImpact, capacity } = getResourceUtilizationForDate(resource.id, today);
    const effectiveCapacity = Math.max(0, capacity - leaveImpact);
    if (effectiveCapacity > 0) {
      totalUtil += (allocated / effectiveCapacity) * 100;
      count++;
    }
  }

  return count > 0 ? Math.round((totalUtil / count) * 10) / 10 : 0;
}

export function getAvailableCapacityPercent(): number {
  const utilization = getOverallUtilization();
  return Math.round((100 - Math.min(utilization, 100)) * 10) / 10;
}

export function getLeaveImpactInRange(
  resourceId: number,
  startDate: string,
  endDate: string
): number {
  const db = getDb();
  const leaves = db
    .prepare(
      `SELECT start_date, end_date FROM leaves WHERE resource_id = ?
       AND start_date <= ? AND end_date >= ?`
    )
    .all(resourceId, endDate, startDate) as unknown as Leave[];

  const days = eachDayInRange(startDate, endDate).filter(isWeekday);
  let leaveDays = 0;

  for (const day of days) {
    for (const leave of leaves) {
      if (rangesOverlap(day, day, leave.start_date, leave.end_date)) {
        leaveDays++;
        break;
      }
    }
  }

  return leaveDays;
}
