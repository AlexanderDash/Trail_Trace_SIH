# PROJECT HANDOFF — Durable Context & Architecture Guide

## 1. Project Purpose & Current State
- **Project:** `ANVESH` (SIH 26184) — predictive cybercrime financial intelligence and interdiction platform.
- **Current Runtime Status:** Fully working locally and production-build verified (`npm run typecheck` passes with 0 errors; `npm run build` succeeds).
- **Architecture Stack:**
  - **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React-Leaflet, Lucide Icons (`@anvesh/web` on port 5173).
  - **Backend API:** Node.js, Express, TypeScript, Prisma ORM with SQLite database `apps/api/prisma/dev.db` (`@anvesh/api` on port 3001).
  - **Predictive Engine:** Python FastAPI microservice using NetworkX and Laplace Add-1 smoothing (`apps/python-engine` on port 8000).
  - **Deployment Ready:** Multi-container `docker-compose.yml` with dynamic container network proxy (`API_PROXY_TARGET`) and wildcard CORS for zero-config Railway/Render cloud deployment.

---

## 2. What `anvesh_final.md` Represents
- `anvesh_final.md` is the authoritative specification for **ANVESH (SIH 26184)**.
- It specifies advanced mathematical mechanisms: Three-Signal Route DNA (motifs, log-binned timing $\delta$, Benford's Law $\chi^2$), Rails Physics pre-filtering, Spatio-Temporal Kernel Density Estimation (STKDE with Epanechnikov kernel, LOOCV, and 1,000-run Monte Carlo null model), Dual-Mode Forecasting (Mode A Ring-Matched vs. Mode B Cold-Start Profile), Interdiction Choke-Point Optimization, National Expected Value (EV) Queue, and a 4-Tier Graded Evidence taxonomy (`[Observed]`, `[Linked]`, `[Inferred]`, `[Predicted]`).

---

## 3. Core Task Objective & Strict Constraints
- **Primary Objective:** Adapt the **UI / frontend / presentation layer** of the baseline project to reflect the newer `anvesh_final.md` experience (terminology, layout, evidence badges, Mode A/B indicators, National EV Queue, Choke-Point advisories, and STKDE risk surface framing).
- **Rule 1 — Do NOT Fully Migrate or Rewrite Core Internals:** Do NOT rewrite the database to Neo4j, do NOT discard Prisma/SQLite, and do NOT attempt a full scratch rebuild of the heavy statistical algorithms (Epanechnikov LOOCV KDE with 1,000-run Monte Carlo). The working system must remain intact and stable.
- **Rule 2 — Small Internal Supporting Changes ARE Allowed:** If a UI feature needs an extra field or minor data transformation (e.g. `mode`, `interdiction`, `evidence_graded_signals`, `expected_value_inr`), small modifications to `apps/python-engine/` and `apps/api/` are permitted and encouraged to avoid faking data.
- **Rule 3 — No Fabricated Backend Logic:** Present existing data and signals through the new research lenses rather than inventing fake results.
- **Rule 4 — Future Compatibility:** Decouple components cleanly where cheap; do not over-engineer or add heavy abstractions solely for future migration.

---

## 4. Key Architectural Learnings & Data Flow
1. **Transaction Ingestion & Matching:**
   - Bank CSVs uploaded via `/api/v1/ingestion/upload` $\rightarrow$ normalized into `Transaction` and `Account` records in SQLite.
   - Complaints uploaded via `/api/v1/complaints/upload` $\rightarrow$ auto-matched to transactions by account/amount/timestamp. If `suspected_transaction_id` matches, confidence reaches $\ge 90\%$, and a `Trail` is created automatically.
2. **Trail BFS Traversal & Python Forecaster:**
   - `apps/api/src/modules/trails/service.ts`: `createTrail()` runs BFS hop-by-hop traversal.
   - `predictMoneyTrail()` posts to `http://localhost:8000/api/predict` (or fallback heuristic if offline) to determine the active in-transit path and probability of candidate next hops.
3. **Database Pre-populated for Demos:**
   - SQLite `dev.db` contains 50 transactions, 63 accounts, 10 complaints, 10 trails, 2 active investigation dossiers, and scored risky accounts.
   - Sample upload files exist in `sample_data/` (`bank_transactions.csv` and `cybercrime_complaints.csv`).
   - `npm run db:seed` automatically re-seeds and parses both CSVs, matches trails, and runs risk scoring.

---

## 5. Completed UI & Backend Adaptations
- **Branding:** Rebranded to `ANVESH (SIH 26184 | TrailTrace 2.0)` across `index.html`, `nav.ts`, and headers.
- **Backend Response Enrichment:** `next_hop.py`, `main.py`, and `trails/service.ts` now return:
  - `mode: "MODE_A" | "MODE_B"` and `mode_label`.
  - `interdiction`: contains `choke_point_node`, `choke_point_score`, action recommendation, and `what_if_reroute` (evasion friction penalty).
  - `expected_value_inr`: calculated as $\text{Amount} \times \text{Confidence} \times \text{Urgency Factor}$.
  - `evidence_graded_signals`: structured list of 4-tier claims (`[Observed]`, `[Linked]`, `[Inferred]`, `[Predicted]`).
- **Dashboard (`DashboardPage.tsx`):**
  - Added interactive **National Interdiction & EV Prioritization Queue** ranking cases by Expected Recovery Value.
  - Added header action button `⚡ Run Risk Engine` which triggers batch risk analysis across all active accounts so no zero counts appear.
- **Intelligence & Trajectory (`IntelligencePage.tsx`):**
  - Mode A / Mode B status badges.
  - Dedicated **Interdiction Intelligence & Choke-Point Analysis** card with What-If reroute friction consequences.
  - **4-Tier Evidence Decomposition** visual cards.
- **Trails Detail (`TrailsPage.tsx`):**
  - Added **Choke-Point Interdiction Advisory** banner and `[Observed]` badge per ledger node.
- **Evidence Alerts Feed (`AlertsPage.tsx`):**
  - Tagged all alerts with 4-tier evidence classifications.
- **Geospatial (`GeospatialPage.tsx`):**
  - Re-skinned to **STKDE Risk Surface & Predicted Channel Map** with Mode A/B base-rate indicators.
- **Investigation Workspace & Reports (`InvestigationWorkspacePage.tsx`, `ReportsPage.tsx`, `report.ts`):**
  - Upgraded findings taxonomy to 4 tiers (`[Observed]`, `[Linked]`, `[Inferred]`, `[Predicted]`, `Choke-Point Freeze Advisory`).
  - Updated PDF generation service (`apps/api/src/modules/investigations/report.ts`) to issue official **ANVESH Forensic Dossiers** (`ANVESH | TrailTrace 2.0 (SIH 26184)`) with research disclaimers.

---

## 6. What Should Happen Next (Optional Enhancements)
1. **Live Cloud Deployment (When Ready):**
   - Push repository to GitHub and connect to Railway.app or Render.com using the provided multi-container `docker-compose.yml`.
   - Dynamic port proxying and wildcard CORS are already baked in.
2. **Interactive Visual Topology:**
   - Cytoscape.js or D3 visual topology integration if deeper node drag-and-drop interaction is desired.

---

## 7. Instructions for Any Resuming AI
- **Do not restart analysis from scratch.** The current system is fully functional, builds cleanly, and the UI adaptations in `DashboardPage`, `IntelligencePage`, `TrailsPage`, `AlertsPage`, and `GeospatialPage` are complete.
- **Read both `PROJECT_UPDATE_PROGRESS.md` and `PROJECT_HANDOFF.md` first.**
- Verify the build with `npm run typecheck` before and after any future changes.
- Remember: **Preserve working backend code above all else.**
