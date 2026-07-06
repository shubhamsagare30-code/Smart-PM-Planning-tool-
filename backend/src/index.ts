import { createApp } from './app';
import { config } from './config';
import { initDb } from './database/connection';

async function start() {
  await initDb();
  const app = createApp();

  app.listen(config.port, () => {
    console.log(`Smart Project Planner API running on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
