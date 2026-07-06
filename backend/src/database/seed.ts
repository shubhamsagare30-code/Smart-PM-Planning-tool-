import { getDb } from './connection';
import { LookupRepository } from '../repositories/lookupRepository';
import { ResourceRepository } from '../repositories/resourceRepository';
import { ProjectRepository } from '../repositories/projectRepository';
import { AllocationRepository } from '../repositories/allocationRepository';
import { LeaveRepository } from '../repositories/leaveRepository';

const departments = ['Engineering', 'Design', 'QA', 'DevOps', 'Product', 'Data Science'];
const skills = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Java', 'AWS', 'Docker',
  'Kubernetes', 'SQL', 'Figma', 'UI/UX', 'Agile', 'Machine Learning', 'GraphQL', 'Terraform',
];
const employmentTypes = ['Full-time', 'Contract', 'Part-time'];

const firstNames = [
  'Alice', 'Bob', 'Carol', 'David', 'Eva', 'Frank', 'Grace', 'Henry',
  'Iris', 'James', 'Karen', 'Leo', 'Maria', 'Nathan', 'Olivia', 'Paul',
  'Quinn', 'Rachel', 'Sam', 'Tina',
];
const lastNames = [
  'Anderson', 'Brown', 'Chen', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris',
  'Ivanov', 'Johnson', 'Kim', 'Lee', 'Miller', 'Nguyen', 'O\'Brien', 'Patel',
  'Quinn', 'Roberts', 'Smith', 'Taylor',
];
const designations = [
  'Senior Developer', 'Developer', 'Tech Lead', 'QA Engineer', 'DevOps Engineer',
  'UI Designer', 'Product Manager', 'Data Scientist', 'Architect', 'Scrum Master',
];

const projects = [
  {
    name: 'Enterprise CRM Platform',
    client_name: 'Acme Corp',
    start_date: '2025-01-15',
    end_date: '2026-06-30',
    status: 'active',
    budget: 850000,
    description: 'Full-stack CRM rebuild with microservices architecture',
  },
  {
    name: 'Mobile Banking App',
    client_name: 'FinTech Solutions',
    start_date: '2025-03-01',
    end_date: '2026-03-31',
    status: 'active',
    budget: 620000,
    description: 'Cross-platform mobile banking application',
  },
  {
    name: 'Data Analytics Dashboard',
    client_name: 'RetailMax',
    start_date: '2025-06-01',
    end_date: '2025-12-31',
    status: 'active',
    budget: 340000,
    description: 'Real-time analytics and reporting platform',
  },
  {
    name: 'Cloud Migration',
    client_name: 'HealthCare Plus',
    start_date: '2025-02-01',
    end_date: '2026-01-31',
    status: 'active',
    budget: 480000,
    description: 'Legacy system migration to AWS cloud infrastructure',
  },
  {
    name: 'E-Commerce Platform',
    client_name: 'ShopGlobal',
    start_date: '2025-04-15',
    end_date: '2026-04-14',
    status: 'active',
    budget: 720000,
    description: 'Next-gen e-commerce platform with AI recommendations',
  },
];

function randomSkills(skillIds: number[], count: number): number[] {
  const shuffled = [...skillIds].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function seed() {
  const db = getDb();

  const existing = db.prepare('SELECT COUNT(*) as count FROM resources').get() as { count: number };
  if (existing.count > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  const lookupRepo = new LookupRepository();
  const resourceRepo = new ResourceRepository();
  const projectRepo = new ProjectRepository();
  const allocationRepo = new AllocationRepository();
  const leaveRepo = new LeaveRepository();

  const deptIds = departments.map((d) => lookupRepo.findOrCreateDepartment(d));
  const skillIds = skills.map((s) => lookupRepo.findOrCreateSkill(s));
  const empTypeIds = employmentTypes.map((e) => lookupRepo.findOrCreateEmploymentType(e));

  const resourceIds: number[] = [];

  for (let i = 0; i < 20; i++) {
    const name = `${firstNames[i]} ${lastNames[i]}`;
    const deptIdx = i % departments.length;
    const resource = resourceRepo.create({
      name,
      email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase().replace("'", '')}@company.com`,
      designation: designations[i % designations.length],
      department_id: deptIds[deptIdx],
      cost_per_day: 400 + Math.floor(Math.random() * 600),
      employment_type_id: empTypeIds[i % 3 === 0 ? 1 : 0],
      capacity_percentage: i % 5 === 0 ? 80 : 100,
      joining_date: `202${2 + (i % 3)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
      skill_ids: randomSkills(skillIds, 3 + (i % 4)),
    });
    resourceIds.push(resource.id);
  }

  const projectIds: number[] = [];
  for (const p of projects) {
    const project = projectRepo.create(p);
    projectIds.push(project.id);
  }

  const allocationPlan = [
    { resourceIdx: 0, projectIdx: 0, pct: 60, start: '2025-01-15', end: '2026-06-30' },
    { resourceIdx: 0, projectIdx: 2, pct: 30, start: '2025-06-01', end: '2025-12-31' },
    { resourceIdx: 1, projectIdx: 0, pct: 80, start: '2025-01-15', end: '2026-06-30' },
    { resourceIdx: 2, projectIdx: 1, pct: 100, start: '2025-03-01', end: '2026-03-31' },
    { resourceIdx: 3, projectIdx: 1, pct: 50, start: '2025-03-01', end: '2026-03-31' },
    { resourceIdx: 3, projectIdx: 4, pct: 40, start: '2025-04-15', end: '2026-04-14' },
    { resourceIdx: 4, projectIdx: 2, pct: 70, start: '2025-06-01', end: '2025-12-31' },
    { resourceIdx: 5, projectIdx: 3, pct: 90, start: '2025-02-01', end: '2026-01-31' },
    { resourceIdx: 6, projectIdx: 3, pct: 60, start: '2025-02-01', end: '2026-01-31' },
    { resourceIdx: 6, projectIdx: 0, pct: 30, start: '2025-04-01', end: '2026-06-30' },
    { resourceIdx: 7, projectIdx: 4, pct: 100, start: '2025-04-15', end: '2026-04-14' },
    { resourceIdx: 8, projectIdx: 4, pct: 50, start: '2025-04-15', end: '2026-04-14' },
    { resourceIdx: 8, projectIdx: 2, pct: 40, start: '2025-06-01', end: '2025-12-31' },
    { resourceIdx: 9, projectIdx: 0, pct: 40, start: '2025-01-15', end: '2026-06-30' },
    { resourceIdx: 10, projectIdx: 1, pct: 70, start: '2025-03-01', end: '2026-03-31' },
    { resourceIdx: 11, projectIdx: 3, pct: 80, start: '2025-02-01', end: '2026-01-31' },
    { resourceIdx: 12, projectIdx: 4, pct: 60, start: '2025-04-15', end: '2026-04-14' },
    { resourceIdx: 13, projectIdx: 2, pct: 50, start: '2025-06-01', end: '2025-12-31' },
    { resourceIdx: 14, projectIdx: 0, pct: 55, start: '2025-01-15', end: '2026-06-30' },
    { resourceIdx: 15, projectIdx: 1, pct: 45, start: '2025-03-01', end: '2026-03-31' },
    { resourceIdx: 16, projectIdx: 4, pct: 35, start: '2025-04-15', end: '2026-04-14' },
    { resourceIdx: 17, projectIdx: 3, pct: 40, start: '2025-02-01', end: '2026-01-31' },
    { resourceIdx: 18, projectIdx: 2, pct: 60, start: '2025-06-01', end: '2025-12-31' },
    { resourceIdx: 19, projectIdx: 0, pct: 25, start: '2025-01-15', end: '2026-06-30' },
  ];

  for (const alloc of allocationPlan) {
    allocationRepo.create({
      resource_id: resourceIds[alloc.resourceIdx],
      project_id: projectIds[alloc.projectIdx],
      allocation_percentage: alloc.pct,
      start_date: alloc.start,
      end_date: alloc.end,
    });
  }

  const leaves = [
    { resourceIdx: 2, type: 'vacation', start: '2025-07-14', end: '2025-07-25', notes: 'Summer vacation' },
    { resourceIdx: 5, type: 'training', start: '2025-08-04', end: '2025-08-08', notes: 'AWS certification training' },
    { resourceIdx: 8, type: 'sick_leave', start: '2025-07-01', end: '2025-07-03', notes: null },
    { resourceIdx: 12, type: 'holiday', start: '2025-12-24', end: '2025-12-31', notes: 'Year-end holidays' },
    { resourceIdx: 15, type: 'vacation', start: '2025-09-15', end: '2025-09-26', notes: 'Family trip' },
  ];

  for (const leave of leaves) {
    leaveRepo.create({
      resource_id: resourceIds[leave.resourceIdx],
      leave_type: leave.type,
      start_date: leave.start,
      end_date: leave.end,
      notes: leave.notes,
    });
  }

  console.log('Seed complete: 20 resources, 5 projects, allocations, and leaves created.');
}

if (require.main === module) {
  seed();
}

export { seed };
