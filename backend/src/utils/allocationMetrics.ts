import { getDb } from '../database/connection';
import { AllocationRepository } from '../repositories/allocationRepository';
import { ResourceRepository } from '../repositories/resourceRepository';
import { getCurrentUtilizationForResource } from './capacity';
import { addDays, formatDate } from './dates';

/** Simple, practical allocation health metrics (common PM pain points). */
export function getAllocationMetrics() {
  const resourceRepo = new ResourceRepository();
  const allocationRepo = new AllocationRepository();
  const resources = resourceRepo.findAll({ status: 'active' });
  const allocations = allocationRepo.findAll();
  const today = formatDate(new Date());
  const nextWeek = formatDate(addDays(new Date(), 7));

  const overAllocated = resources.filter((r) => getCurrentUtilizationForResource(r) > 100);
  const benchAvailable = resources.filter((r) => getCurrentUtilizationForResource(r) < 50);

  const projectCountByResource = new Map<number, Set<number>>();
  for (const a of allocations) {
    if (!projectCountByResource.has(a.resource_id)) {
      projectCountByResource.set(a.resource_id, new Set());
    }
    projectCountByResource.get(a.resource_id)!.add(a.project_id);
  }

  const contextSwitching = resources
    .filter((r) => (projectCountByResource.get(r.id)?.size || 0) >= 3)
    .map((r) => ({
      name: r.name,
      projectCount: projectCountByResource.get(r.id)!.size,
      utilization: getCurrentUtilizationForResource(r),
    }));

  const db = getDb();
  const leaveSoon = db
    .prepare(
      `SELECT DISTINCT r.name, r.id FROM leaves l
       JOIN resources r ON l.resource_id = r.id
       WHERE l.start_date <= ? AND l.end_date >= ?`
    )
    .all(nextWeek, today) as { id: number; name: string }[];

  const leaveImpact = leaveSoon
    .filter((r) => {
      const res = resources.find((x) => x.id === r.id);
      return res ? getCurrentUtilizationForResource(res) >= 70 : false;
    })
    .map((r) => {
      const res = resources.find((x) => x.id === r.id)!;
      return { name: r.name, utilization: getCurrentUtilizationForResource(res) };
    });

  return {
    overAllocatedCount: overAllocated.length,
    overAllocatedNames: overAllocated.slice(0, 5).map((r) => r.name),
    benchAvailableCount: benchAvailable.length,
    avgUtilization: resources.length > 0
      ? Math.round(resources.reduce((s, r) => s + getCurrentUtilizationForResource(r), 0) / resources.length)
      : 0,
    contextSwitching,
    leaveImpact,
  };
}
