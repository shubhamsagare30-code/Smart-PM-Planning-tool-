import { initDb, getDb } from './connection';
import { runMigrations } from './migrate';
import { LookupRepository } from '../repositories/lookupRepository';
import { ResourceRepository } from '../repositories/resourceRepository';
import { ProjectRepository } from '../repositories/projectRepository';
import { AllocationRepository } from '../repositories/allocationRepository';
import { LeaveRepository } from '../repositories/leaveRepository';
import { ProjectTaskRepository } from '../repositories/projectTaskRepository';
import { seedProjectTasks } from './task-seed';

/** Minimal demo data for public rollout — one sample per module. Only runs on empty database. */
export async function seedDemo() {
  await initDb();
  runMigrations();

  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as count FROM resources').get() as { count: number };
  if (existing.count > 0) {
    console.log('Database already has data — skipping demo seed (your data is preserved).');
    return;
  }

  const lookup = new LookupRepository();
  const resourceRepo = new ResourceRepository();
  const projectRepo = new ProjectRepository();
  const allocationRepo = new AllocationRepository();
  const leaveRepo = new LeaveRepository();
  const taskRepo = new ProjectTaskRepository();

  const deptId = lookup.findOrCreateDepartment('Engineering');
  const skillId = lookup.findOrCreateSkill('React');
  const empId = lookup.findOrCreateEmploymentType('Full-time');

  const resource = resourceRepo.create({
    name: 'Alex Morgan',
    email: 'alex.morgan@demo.com',
    designation: 'Senior Developer',
    department_id: deptId,
    cost_per_day: 500,
    employment_type_id: empId,
    capacity_percentage: 100,
    joining_date: '2024-01-15',
    skill_ids: [skillId],
  });

  resourceRepo.create({
    name: 'Jordan Lee',
    email: 'jordan.lee@demo.com',
    designation: 'QA Engineer',
    department_id: deptId,
    cost_per_day: 420,
    employment_type_id: empId,
    capacity_percentage: 100,
    joining_date: '2024-03-01',
    skill_ids: [skillId],
  });

  const project = projectRepo.create({
    name: 'Demo Project — Smart Planner',
    client_name: 'Sample Client Co.',
    start_date: '2025-06-01',
    end_date: '2025-12-31',
    status: 'active',
    budget: 120000,
    description: 'Reference project showing margin tracking, tasks, and team allocation. Edit or delete anytime.',
    duration_days: 140,
    project_type: 'fixed_cost',
    software_cost: 5000,
    hardware_cost: 2000,
    desk_cost: 3000,
    office_cost: 3500,
    planned_cost: 58000,
    actual_cost: 52000,
    documentation_links: JSON.stringify(['https://drive.google.com/sample-project-brief']),
    board_type: 'internal',
    planned_completion_percent: 40,
    actual_completion_percent: 35,
    deliverables_planned: 10,
    deliverables_actual: 4,
  });

  allocationRepo.create({
    resource_id: resource.id,
    project_id: project.id,
    allocation_percentage: 60,
    start_date: project.start_date,
    end_date: project.end_date,
  });

  leaveRepo.create({
    resource_id: resource.id,
    leave_type: 'vacation',
    start_date: '2025-08-01',
    end_date: '2025-08-07',
    notes: 'Sample leave record',
  });

  seedProjectTasks(project.id, project.name, [resource.id, 2], 'healthy');

  console.log('Demo seed complete: 2 resources, 1 project, 1 allocation, 1 leave, 16 tasks.');
  console.log('Data is stored in backend/data/capacity.db and persists across restarts.');
}

if (require.main === module) {
  seedDemo().catch(console.error);
}
