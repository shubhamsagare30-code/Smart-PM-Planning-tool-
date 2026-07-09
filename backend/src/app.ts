import cors from 'cors';
import express from 'express';
import path from 'path';
import { config } from './config';
import { runMigrations } from './database/migrate';
import routes from './routes';

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (origin === config.corsOrigin) return true;
  if (origin.startsWith('http://localhost:')) return true;
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true;
  const extra = process.env.CORS_ORIGIN_EXTRA?.split(',').map((s) => s.trim()) || [];
  return extra.includes(origin);
}

export function createApp() {
  runMigrations();

  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
  }));
  app.use(express.json());

  app.use('/api', routes);

  const publicDir = path.join(__dirname, '..', 'public');
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(publicDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  } else {
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  return app;
}
