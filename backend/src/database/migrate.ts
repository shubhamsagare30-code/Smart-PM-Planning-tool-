import fs from 'fs';
import path from 'path';
import { getDb } from './connection';

/** Prefer dist/database/migrations (after build copy); fall back to src for local/dev. */
function resolveMigrationsDir(): string {
  const besideJs = path.join(__dirname, 'migrations');
  if (fs.existsSync(besideJs)) return besideJs;

  const fromSrc = path.join(__dirname, '..', '..', 'src', 'database', 'migrations');
  if (fs.existsSync(fromSrc)) return fromSrc;

  throw new Error(
    `Migrations folder not found. Tried:\n  ${besideJs}\n  ${fromSrc}`
  );
}

export function runMigrations(): void {
  const db = getDb();
  const migrationsDir = resolveMigrationsDir();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version as string)
  );

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const version = file.replace('.sql', '');
    if (applied.has(version)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
    console.log(`Applied migration: ${version}`);
  }
}
