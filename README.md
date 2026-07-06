# Smart Project Planner

Local-first project management for software teams — resources, projects, margins, capacity, and kanban boards. **All data stays on your machine.**

> **New user?** See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for install and rollout instructions.

## Highlights

- **Smart Project Workflow** — 5-step wizard with live gross margin tracking
- **Project One-Pager** — timeline, cost, completion, kanban, smart suggestions
- **Resource & Capacity** — allocations, heatmap, forecast, skill matrix
- **15+ tasks per project** — delivered, in progress, delayed, planned
- **Mobile responsive** — use the same URL on phone/tablet, no install
- **Product tour** — one-time overlay explaining each tab
- **Data persistence** — SQLite file never auto-erased

## Quick Start

```bash
cd backend && npm install && npm run migrate && npm run seed:demo
npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173**

### Windows PowerShell

```powershell
npm.cmd run dev
```

## Data Storage

Your data lives in:

```
backend/data/capacity.db
```

- Persists across restarts
- Never deleted automatically
- Back up by copying this file

## Seed Commands

| Command | Purpose |
|---------|---------|
| `npm run seed:demo` | **Recommended for new users** — minimal sample (1 per tab) |
| `npm run seed` | Full dev dataset (20 resources, 5 projects) |
| `npm run seed-workflow` | Sample projects with margin scenarios |
| `npm run seed-tasks` | Refresh 15+ tasks on all projects |

All seeds **preserve existing data** — they skip or update without wiping.

## Docker

```bash
docker compose up --build
# → http://localhost:3001
```

## Tech Stack

React · TypeScript · TailwindCSS · Recharts · Node.js · Express · SQLite (sql.js)

## License

MIT
