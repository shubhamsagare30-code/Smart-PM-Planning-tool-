# Resource Capacity Planner — Architecture

## Overview

Local-first enterprise application for software project managers to allocate resources across projects and monitor capacity utilization. Runs entirely on localhost with no external services.

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (localhost:5173)                 │
│  React + TypeScript + TailwindCSS + Recharts                │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (JSON)
┌──────────────────────────▼──────────────────────────────────┐
│                  Express API (localhost:3001)                  │
│  Routes → Controllers → Services → Repositories               │
└──────────────────────────┬──────────────────────────────────┘
                           │ sql.js (SQLite WASM)
┌──────────────────────────▼──────────────────────────────────┐
│              SQLite (backend/data/capacity.db)                 │
└─────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
resource-capacity-planner/
├── docker-compose.yml
├── README.md
├── docs/
│   └── ARCHITECTURE.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/                    # SQLite database (gitignored)
│   └── src/
│       ├── index.ts
│       ├── app.ts
│       ├── config/
│       ├── database/
│       │   ├── connection.ts
│       │   ├── migrate.ts
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── types/
│       ├── repositories/
│       ├── services/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       └── utils/
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/
        ├── components/
        ├── pages/
        ├── hooks/
        ├── types/
        └── context/
```

## Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Routes** | HTTP method + path mapping, request parsing |
| **Controllers** | Request/response handling, status codes |
| **Services** | Business logic, validation, capacity rules |
| **Repositories** | SQL queries, data access only |
| **Types** | Shared TypeScript interfaces |

## Core Business Rules

### Capacity Calculation

1. **Base capacity** = resource `capacity_percentage` (default 100%)
2. **Effective capacity** during a date range = base minus leave impact
3. **Utilization** = sum of overlapping allocation percentages for a resource in a period
4. **Warning** when utilization > 100% for any overlapping period
5. Leaves reduce available capacity proportionally by working days affected

### Allocation Validation

- Cannot allocate to archived resources or projects
- Overlapping allocations are summed per resource per day
- Service returns warnings array when total exceeds capacity

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| Resources | `GET/POST /api/resources`, `GET/PUT/PATCH /api/resources/:id` |
| Projects | `GET/POST /api/projects`, `GET/PUT/PATCH /api/projects/:id` |
| Allocations | `GET/POST /api/allocations`, `GET/PUT/DELETE /api/allocations/:id` |
| Leaves | `GET/POST /api/leaves`, `GET/PUT/DELETE /api/leaves/:id` |
| Dashboard | `GET /api/dashboard` |
| Heatmap | `GET /api/heatmap` |
| Forecast | `GET /api/forecast?days=30\|60\|90` |
| Skill Matrix | `GET /api/skill-matrix` |
| Reports | `GET /api/reports/:type?format=json\|csv\|xlsx` |
| Lookups | `GET /api/lookups/skills`, `/departments`, `/employment-types` |

## Frontend Routes

| Path | Screen |
|------|--------|
| `/` | Dashboard |
| `/resources` | Resource Management |
| `/projects` | Project Management |
| `/allocations` | Allocation Engine |
| `/leaves` | Leave Management |
| `/heatmap` | Capacity Heatmap |
| `/forecast` | Forecast Module |
| `/skill-matrix` | Skill Matrix |
| `/reports` | Reporting |

## Future Expansion

- Authentication middleware slot in `middleware/auth.ts`
- Webhook hooks in service layer events
- Multi-tenant via `organization_id` column additions
- PostgreSQL via repository interface swap
