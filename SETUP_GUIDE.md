# Smart Project Planner — Setup & Rollout Guide

A simple guide for installing and sharing **Smart Project Planner** with your team or the public.

---

## What This Tool Is

**Smart Project Planner** is a local-first project management dashboard. It runs in your browser — no cloud account, no subscription. All data is stored in a single file on your computer.

Works on **desktop, tablet, and mobile** — open the same link in any browser. No app install required.

---

## For End Users (Quick Start)

### Requirements

- [Node.js 20+](https://nodejs.org/) installed
- A modern browser (Chrome, Firefox, Safari, Edge)

### Install (5 minutes)

```bash
# 1. Get the project folder (zip or git clone)
cd smart-project-planner

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. First-time setup (creates database with sample reference data)
cd ../backend
npm run migrate
npm run seed:demo

# 4. Start the app
npm run dev
```

In a **second terminal**:

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** on any device on your network (use your PC's IP for phone/tablet on same Wi-Fi).

A **one-time product tour** will guide you through each tab when you first open the app.

---

## Your Data Is Safe

| Question | Answer |
|----------|--------|
| Where is data stored? | `backend/data/capacity.db` |
| Is data ever erased automatically? | **No.** Data persists across restarts. |
| When does sample data appear? | Only on **first run** when the database is empty. |
| Will re-running setup delete my data? | **No.** Seed scripts skip if data already exists. |
| How to back up? | Copy `backend/data/capacity.db` to a safe location. |
| How to restore? | Replace `capacity.db` with your backup file. |

---

## Sharing With Others (Public Rollout)

### Option A — Give them the folder

1. Zip the project (exclude `node_modules` — they will run `npm install`)
2. Include this `SETUP_GUIDE.md`
3. Tell them to run `npm run seed:demo` (not `npm run seed`) for a **minimal demo** with one sample per tab

### Option B — Docker (single command)

```bash
docker compose up --build
```

Open **http://localhost:3001**

### Demo vs Full Sample Data

| Command | What it creates | Use when |
|---------|-----------------|----------|
| `npm run seed:demo` | 2 resources, 1 project, 16 tasks, 1 leave | **Public / new users** |
| `npm run seed` | 20 resources, 5 projects, full data | Development / testing |
| `npm run seed-workflow` | Browser Plugin + Legacy projects | Your testing environment |

**Important:** None of these commands erase existing data. They only run when the database is empty (demo/full seed) or add/update workflow projects (seed-workflow).

---

## Mobile & Tablet Access

1. Start backend and frontend on your PC
2. Find your PC's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. On phone/tablet browser, open: `http://YOUR_IP:5173`
4. Ensure phone and PC are on the same Wi-Fi network

No app store install needed. Add to home screen for an app-like experience (Safari → Share → Add to Home Screen).

---

## Daily Usage

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

**Windows tip:** If `npm` fails in PowerShell, use `npm.cmd` instead.

---

## Product Tour

- Appears automatically on first visit
- Replay anytime: sidebar → **Product Tour**
- Or clear browser storage key `spp-tour-completed` in DevTools → Application → Local Storage

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm` blocked in PowerShell | Use `npm.cmd run dev` or run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Port 3001 in use | `netstat -ano \| findstr :3001` then `taskkill /PID <id> /F` |
| Blank dashboard | Ensure backend is running on port 3001 |
| Data missing after update | Check `backend/data/capacity.db` exists; restore from backup |

---

## Support

All processing happens locally. No data leaves your machine unless you export reports (CSV/Excel).
