# Smart PM — Demo Video Script (PM Role)

**Target length:** 4–5 minutes  
**Audience:** Project managers, delivery leads, directors  
**Login:** `pm@smartpm.local` / `Pm@12345`  
**Best project to demo:** *Browser Plugin Creation for PM* (healthy margin, rich task data)

---

## Before you record

### 1. Start the app (local — recommended for recording)

```powershell
# Terminal 1
cd C:\Users\Admin\resource-capacity-planner\backend
npm.cmd run dev

# Terminal 2
cd C:\Users\Admin\resource-capacity-planner\frontend
npm.cmd run dev
```

Open **http://localhost:5173** (not Vercel — avoids cold-start delays on camera).

### 2. Reset demo data (optional, one time)

```powershell
cd backend
npm.cmd run migrate
npm.cmd run seed:demo
npm.cmd run seed-workflow
npm.cmd run seed-tasks
npm.cmd run seed-auth
```

Restart backend after seeding.

### 3. Recording setup

| Tool | Tip |
|------|-----|
| **Loom** | Free, easy share link — good for stakeholders |
| **OBS** | Higher quality, export MP4 |
| **Resolution** | 1920×1080, browser zoom 100% |
| **Mic** | Quiet room; speak slightly slower than normal |

**Hide:** bookmarks bar, unrelated tabs, Windows notifications (Focus Assist).

---

## Demo story arc

> *"I'm a PM managing multiple client projects. Smart PM gives me one place to see health, people, money, and delivery — without jumping between spreadsheets and Jira."*

---

## Scene 1 — Login & first impression (0:00 – 0:30)

**Screen:** Login page → Dashboard

**Actions:**
1. Show login screen briefly
2. Sign in as PM (`pm@smartpm.local`)
3. Land on **Master Dashboard**

**Narration:**
> "Smart PM is built for project managers. I sign in and immediately see portfolio health — which projects are on track, how utilized my team is, and where budget stands."

**Highlight:** KPI tiles (resources, projects, utilization, capacity).

---

## Scene 2 — Master Dashboard (0:30 – 1:15)

**Screen:** Dashboard (scroll slowly)

**Actions:**
1. Point to **Project Health** table — green vs amber/red
2. Show **Resource Utilization** chart
3. Open **Task Pipeline** dropdown → select *Browser Plugin* project
4. Briefly show **Monthly Capacity** trend

**Narration:**
> "The master dashboard answers: where do I focus today? I can filter the task pipeline by project instead of seeing a noisy org-wide view. Utilization and capacity help me know if I'm about to over-commit people."

**Highlight:** Project dropdown on Task Pipeline (per-project view).

---

## Scene 3 — Projects list (1:15 – 1:45)

**Screen:** Projects → click *Browser Plugin Creation for PM*

**Actions:**
1. Show project cards/table with **margin badges**
2. Click into the healthy project (green margin ~52%)
3. Pause on project header — client, dates, status

**Narration:**
> "Each project shows margin at a glance. Green means healthy delivery economics; red means I need to act. Let me open our browser plugin project."

---

## Scene 4 — Project Dashboard tab (1:45 – 2:30)

**Screen:** Project → **Overview** tab

**Actions:**
1. **Margin gauge** — point to green zone
2. **Timeline adherence** and **Task progress** (bucket-weighted)
3. **Budget control** — planned vs actual
4. Scroll to **Tasks by Bucket** chart
5. If delayed tasks banner appears — mention it
6. Glance at **Smart Suggestions** panel

**Narration:**
> "This is my one-pager command center. Timeline, budget, and completion come from real task movement — not a manually typed percent. Tasks in Production count as done. Smart suggestions flag where I can improve efficiency or protect margin."

---

## Scene 5 — Kanban Board (2:30 – 3:15)

**Screen:** **Board** tab

**Actions:**
1. Pan across columns: Product Backlog → … → Pushed to Production
2. Click a task card → show task modal (title, hours, due date, tags)
3. Click **Add Task** → fill quickly:
   - Title: `Stakeholder demo dry-run`
   - Bucket: Sprint Backlog
   - Planned hours: 8
   - Due date: +7 days
4. Save → task appears on board
5. Move one task to next column via dropdown (show progress update)

**Narration:**
> "The board follows our real delivery flow — backlog through production, plus icebox. Tasks track hours, not story points, because that's how we plan. I can add tasks, assign people, and see overdue warnings before standup."

---

## Scene 6 — Teams tab (3:15 – 3:45)

**Screen:** **Teams** tab

**Actions:**
1. Show allocated resources and skills
2. Mention weekly/monthly hours view (if visible)
3. Filter by one resource name

**Narration:**
> "Teams shows who's on the project and how hours are tracking — weekly or monthly. I can filter to one person when a stakeholder asks for a status on their workstream."

---

## Scene 7 — Allocations & capacity (3:45 – 4:15)

**Screen:** Sidebar → **Allocations**

**Actions:**
1. Show project-wise allocation grid
2. Open **New Allocation** — show that >100% is **blocked** (optional: try 120% on an already-busy resource)
3. Cancel without saving

**Narration:**
> "Allocations protect the team. The tool won't let me book someone past 100% — no more fantasy capacity plans. That keeps forecasts honest."

---

## Scene 8 — Forecast & close (4:15 – 4:45)

**Screen:** **Forecast** → back to Dashboard

**Actions:**
1. Show who becomes free and when
2. Return to Dashboard for closing shot

**Narration:**
> "When another PM asks for a developer, Forecast tells me who frees up, from which project, and when. Smart PM connects delivery, people, and money in one place — built for PMs who own outcomes, not just tickets."

**End card (optional):**  
*Smart PM v3.1.0 — Thoughtfully designed by Shubham Sagare*  
*Feedback: Shubhamsagare30@gmail.com*

---

## What NOT to show in PM demo

| Skip | Why |
|------|-----|
| Admin panel | That's your role, not PM |
| Member login | Different story (hours only, no financials) |
| Empty database | Always seed before recording |
| Vercel cold start | Render wake-up causes awkward pauses |

---

## 60-second teaser cut (LinkedIn)

1. Login (5s)
2. Dashboard health matrix (10s)
3. Project margin gauge (10s)
4. Kanban pan (15s)
5. Add task (10s)
6. Allocation block at 100% (10s)

---

## Troubleshooting while recording

| Problem | Fix |
|---------|-----|
| Login fails | `npm run seed-auth` + restart backend |
| No projects | `npm run seed-workflow` |
| No tasks | `npm run seed-tasks` |
| Blank charts | Refresh; confirm backend on port 3001 |
| PM sees no financials | You're on member account — switch to `pm@smartpm.local` |

---

## Suggested video title & description

**Title:** Smart PM — Project Manager Walkthrough | Portfolio, Margin & Kanban in One Tool

**Description:**
Demo of Smart PM v3.1.0 from a Project Manager view: portfolio dashboard, project health & margin, agile kanban with hours-based planning, team timesheets, resource allocation with 100% capacity guard, and smart forecast. Local-first PM command center for software delivery teams.

**Tags:** project management, resource planning, kanban, margin tracking, capacity planning
