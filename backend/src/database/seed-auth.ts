import { getDb } from './connection';
import { UserRepository } from '../repositories/userRepository';
import { hashPassword } from '../utils/auth';

/** Seed default users for testing roles. Idempotent by email. */
export function seedAuthUsers() {
  const userRepo = new UserRepository();
  const db = getDb();

  const users = [
    { email: 'admin@smartpm.local', password: 'Admin@123', name: 'Shubham Sagare', role: 'admin' as const },
    { email: 'pm@smartpm.local', password: 'Pm@12345', name: 'Test PM', role: 'pm' as const },
    { email: 'member@smartpm.local', password: 'Member@123', name: 'Test Member', role: 'member' as const },
  ];

  for (const u of users) {
    if (userRepo.findByEmail(u.email)) continue;
    userRepo.create({
      email: u.email,
      password_hash: hashPassword(u.password),
      name: u.name,
      role: u.role,
      must_change_password: false,
    });
  }

  const admin = userRepo.findByEmail('admin@smartpm.local');
  const pm = userRepo.findByEmail('pm@smartpm.local');
  const member = userRepo.findByEmail('member@smartpm.local');

  if (admin && pm) {
    db.prepare('UPDATE projects SET owner_user_id = ? WHERE owner_user_id IS NULL').run(pm.id);
  }

  if (member) {
    const projects = db.prepare("SELECT id FROM projects WHERE status != 'archived' LIMIT 2").all() as { id: number }[];
    for (const p of projects) {
      userRepo.assignToProject(p.id, member.id, 'member');
    }
  }

  console.log('Auth users seeded (admin@smartpm.local, pm@smartpm.local, member@smartpm.local)');
}
