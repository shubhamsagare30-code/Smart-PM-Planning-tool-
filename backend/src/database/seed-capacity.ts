/**
 * Idempotent capacity demo data: departments Dev/QA/Design/Other + varied allocations
 * so dashboard charts show realistic FTE and department breakdown.
 * Run: npm run seed-capacity (restart backend after)
 */
import { getDb } from './connection';
import { AllocationRepository } from '../repositories/allocationRepository';
import { LookupRepository } from '../repositories/lookupRepository';
import { ProjectRepository } from '../repositories/projectRepository';
import { ResourceRepository } from '../repositories/resourceRepository';

export function seedCapacityDemo() {
  const db = getDb();
  const lookup = new LookupRepository();
  const resourceRepo = new ResourceRepository();
  const projectRepo = new ProjectRepository();
  const allocationRepo = new AllocationRepository();

  const deptDev = lookup.findOrCreateDepartment('Development');
  const deptQa = lookup.findOrCreateDepartment('QA');
  const deptDesign = lookup.findOrCreateDepartment('Design');
  const deptOther = lookup.findOrCreateDepartment('Product');

  const bucketDepts = [deptDev, deptQa, deptDesign, deptOther];
  const resources = resourceRepo.findAll({ status: 'active' });
  if (resources.length === 0) {
    console.log('No resources found — run npm run seed first.');
    return;
  }

  resources.forEach((r, i) => {
    resourceRepo.update(r.id, { department_id: bucketDepts[i % 4] });
  });

  const projects = projectRepo.findAll('active');
  if (projects.length < 2) {
    console.log('Need at least 2 active projects for capacity demo.');
    return;
  }

  const p0 = projects[0].id;
  const p1 = projects[1].id;
  const p2 = projects[2]?.id ?? p0;

  db.prepare('DELETE FROM allocations').run();

  const byBucket: Record<number, typeof resources> = { 0: [], 1: [], 2: [], 3: [] };
  resources.forEach((r, i) => byBucket[i % 4].push(r));

  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, '0');
  const jul = `${y}-${m}-01`;
  const augEnd = `${y}-${m}-31`;
  const oct = `${y}-${String(Math.min(12, new Date().getMonth() + 4)).padStart(2, '0')}-01`;
  const decEnd = `${y}-12-31`;

  // Development — heavily loaded, eases after month 2
  byBucket[0].forEach((r, i) => {
    allocationRepo.create({
      resource_id: r.id,
      project_id: p0,
      allocation_percentage: i % 2 === 0 ? 85 : 90,
      start_date: jul,
      end_date: decEnd,
    });
    if (i === 0) {
      allocationRepo.create({
        resource_id: r.id,
        project_id: p1,
        allocation_percentage: 15,
        start_date: jul,
        end_date: augEnd,
      });
    }
  });

  // QA — ramps up mid-period
  byBucket[1].forEach((r, i) => {
    allocationRepo.create({
      resource_id: r.id,
      project_id: p1,
      allocation_percentage: 55 + (i % 3) * 10,
      start_date: jul,
      end_date: decEnd,
    });
    if (i < 2) {
      allocationRepo.create({
        resource_id: r.id,
        project_id: p2,
        allocation_percentage: 25,
        start_date: oct,
        end_date: decEnd,
      });
    }
  });

  // Design — lighter load (more bench)
  byBucket[2].forEach((r, i) => {
    allocationRepo.create({
      resource_id: r.id,
      project_id: p0,
      allocation_percentage: 35 + (i % 2) * 10,
      start_date: jul,
      end_date: decEnd,
    });
  });

  // Other / Product — mixed
  byBucket[3].forEach((r, i) => {
    allocationRepo.create({
      resource_id: r.id,
      project_id: i % 2 === 0 ? p0 : p1,
      allocation_percentage: 50 + (i % 4) * 12,
      start_date: jul,
      end_date: decEnd,
    });
  });

  console.log(`Capacity demo seeded: ${resources.length} resources across Development, QA, Design, Product.`);
  console.log('Restart the backend to refresh dashboard numbers.');
}

if (require.main === module) {
  const { initDb } = require('./connection');
  initDb().then(() => seedCapacityDemo());
}
