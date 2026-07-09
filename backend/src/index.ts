import { createApp } from './app';
import { config } from './config';
import { initDb } from './database/connection';
import { runMigrations } from './database/migrate';
import { seedAuthUsers } from './database/seed-auth';

async function start() {
  await initDb();
  runMigrations();
  seedAuthUsers();

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`Smart Project Planner API running on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
