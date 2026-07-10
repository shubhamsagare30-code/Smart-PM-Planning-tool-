import { initDb } from './connection';
import { runMigrations } from './migrate';
import { seed } from './seed';
import { seedWorkflow } from './seed-workflow';

const cmd = process.argv[2];

async function main() {
  await initDb();

  if (cmd === 'migrate') {
    runMigrations();
    console.log('Migrations complete.');
  } else if (cmd === 'seed') {
    seed();
    seedWorkflow();
  } else if (cmd === 'seed-workflow') {
    seedWorkflow();
  } else if (cmd === 'seed-demo') {
    const { seedDemo } = await import('./seed-demo');
    await seedDemo();
  } else if (cmd === 'seed-tasks') {
    const { seedAllProjectTasks } = await import('./task-seed');
    seedAllProjectTasks();
  } else if (cmd === 'seed-auth') {
    runMigrations();
    const { seedAuthUsers } = await import('./seed-auth');
    seedAuthUsers();
  } else if (cmd === 'seed-capacity') {
    const { seedCapacityDemo } = await import('./seed-capacity');
    seedCapacityDemo();
  } else {
    console.error('Usage: tsx src/database/cli.ts <migrate|seed|seed-workflow|seed-demo|seed-tasks|seed-auth|seed-capacity>');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
