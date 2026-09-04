# TrailTrace

Synthetic prototype for **SIH Problem Statement 26184**: a cybercrime financial intelligence workbench that will eventually ingest multi-bank transactions, reconstruct cross-bank money trails from complaints, score mule-risk from behavioural evidence, watch high-risk accounts, and support geographic intelligence.

This is a **demo system**. All data is fictional. TrailTrace does **not** control ATMs, reject withdrawals, block bank transactions, or dispatch police.

## What exists in this stage (foundation only)

- Monorepo architecture: React/Vite frontend, Express/TypeScript API, Prisma schema, shared types
- Professional investigator shell, routing, and dashboard
- Database entities for banks, accounts, transactions, complaints, trails, watchlist, alerts, locations, merchants, investigations, and evidence
- REST module layout with live health/dashboard/bank registry and explicit placeholders elsewhere
- Bank adapter registry so SBI/BOB/ICICI parsing will not be hard-coded into the graph engine

## Architecture

```
apps/web          Investigator UI (React, TypeScript, Vite, Tailwind CSS)
apps/api          REST API (Node.js, TypeScript, Express, Prisma)
packages/shared   Shared contracts (dashboard, health, module catalog)
```

Logical backend modules (kept separate on purpose):

| Area | Responsibility |
| --- | --- |
| Ingestion | File upload, column mapping, bank adapters |
| Transactions | Normalized ledger; every row keeps source bank + raw payload |
| Investigation | Complaints, cases, evidence |
| Trails | Cross-bank graph walk from a matched origin transaction |
| Risk | Behavioural scoring — trail membership is not automatic mule labelling |
| Geographic intelligence | Location events, clusters, later hotspot research |
| Alerts / watchlist | Monitoring after a risk threshold is crossed |

Frontend talks to `/api/v1/*`. Vite proxies that path to the API in development.

## How to run

Requirements: Node.js 20+.

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:3001
- Health: http://localhost:3001/api/v1/health

`db:migrate` uses `prisma db push` against local SQLite so the prototype runs without Docker or PostgreSQL.

## Environment variables

Copy `apps/api/.env.example` to `apps/api/.env` (already present for local demo):

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `3001`) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | Prisma URL. Foundation default: `file:./dev.db` (SQLite file under `apps/api/prisma`) |
| `CORS_ORIGIN` | Browser origin allowed by the API (`http://localhost:5173`) |

Optional web variable:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Override API base. Default is `/api/v1` via the Vite proxy |

Root `.env.example` documents the same values.

## Database

Prisma schema: `apps/api/prisma/schema.prisma`.

**Foundation decision:** SQLite for zero-friction local runs. PostgreSQL is the intended production database (see `docker-compose.yml`). The model is kept portable (no Postgres-only types).

Seed data registers three **synthetic** source banks only (SBI, Bank of Baroda, ICICI). It does not invent transactions, complaints, or trails. Dashboard counts are real queries; they will be zero until those features exist.

```bash
npm run db:generate   # prisma generate
npm run db:migrate    # prisma db push
npm run db:seed
npm run db:reset      # migrate reset --force (destructive)
```

## Folder structure

```
TrailTrace/
  apps/api/prisma/          Schema and seed
  apps/api/src/modules/     health, dashboard, banks, ingestion, placeholders
  apps/api/src/modules/ingestion/adapters/  Bank-agnostic mapping registry
  apps/web/src/components/  Shell and reusable UI
  apps/web/src/pages/       Dashboard + placeholders
  packages/shared/src/      Shared TypeScript contracts
  docker-compose.yml        Optional Postgres for a later migration
```

## Future implementation plan

1. Multi-file upload (CSV/XLSX) with per-file column mapping
2. Normalize into `Transaction` / `Account` without bank-specific core logic
3. Complaint matching (account, amount, time window, mode)
4. Cross-bank trail construction with full node/edge records
5. Risk scoring from repeated involvement, velocity, forwarding, and associations
6. Watchlist + alerts
7. Map layer (including ATM **locations** only) and cluster analysis
8. Optional Python ML service for hotspot prediction — not in this stage

Out of scope permanently unless a later official requirement says otherwise: ATM command-and-control, withdrawal blocking, and automatic dispatch.

## Scripts

| Script | Action |
| --- | --- |
| `npm run dev` | API + web together |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run build` | Typecheck API and build web |
