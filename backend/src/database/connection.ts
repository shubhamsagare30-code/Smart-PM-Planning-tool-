import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

class Statement {
  constructor(
    private db: SqlJsDatabase,
    private sql: string
  ) {}

  all(...params: unknown[]): Record<string, unknown>[] {
    const stmt = this.db.prepare(this.sql);
    if (params.length) stmt.bind(params as (string | number | null | Uint8Array)[]);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Record<string, unknown>);
    }
    stmt.free();
    return rows;
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    const rows = this.all(...params);
    return rows[0];
  }

  run(...params: unknown[]): RunResult {
    this.db.run(this.sql, params as (string | number | null)[]);
    const idResult = this.db.exec('SELECT last_insert_rowid() as id');
    const changes = this.db.getRowsModified();
    saveToDisk();
    return {
      lastInsertRowid: (idResult[0]?.values[0]?.[0] as number) ?? 0,
      changes,
    };
  }
}

class Database {
  constructor(private db: SqlJsDatabase) {}

  prepare(sql: string): Statement {
    return new Statement(this.db, sql);
  }

  exec(sql: string): void {
    this.db.run(sql);
    saveToDisk();
  }

  pragma(key: string): void {
    if (key.includes('=')) {
      this.db.run(`PRAGMA ${key}`);
    }
  }
}

let db: Database | null = null;
let sqlDb: SqlJsDatabase | null = null;
let dbFilePath = '';

function saveToDisk(): void {
  if (!sqlDb || !dbFilePath) return;
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data = sqlDb.export();
  fs.writeFileSync(dbFilePath, Buffer.from(data));
}

export async function initDb(): Promise<Database> {
  if (db) return db;

  dbFilePath = path.resolve(config.dbPath);
  const wasmPath = path.dirname(require.resolve('sql.js/dist/sql-wasm.js'));
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmPath, file),
  });

  if (fs.existsSync(dbFilePath)) {
    const buffer = fs.readFileSync(dbFilePath);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  sqlDb.run('PRAGMA foreign_keys = ON');
  db = new Database(sqlDb);
  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function closeDb(): void {
  if (sqlDb) {
    saveToDisk();
    sqlDb.close();
    sqlDb = null;
    db = null;
  }
}
