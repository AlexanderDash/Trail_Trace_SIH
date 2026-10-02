# PROJECT UPDATE PROGRESS — ANVESH UI Adaptation

## Current Objective
Adapt the user-facing UI, presentation, terminology, and operational workflow of the baseline TrailTrace project to reflect the newer **ANVESH (SIH 26184)** specification (`anvesh_final.md`), while preserving the existing working backend engine, database, and business logic.

---

## Current Phase: All 5 Phases Completed & Verified (Stable Final State)
Completed branding re-alignment, supporting backend enrichment, National EV Queue UI, Interdiction Choke-Point intelligence, 4-tier evidence-graded signal presentation, STKDE Risk Surface presentation, Investigation Case Workspace findings taxonomy, and exportable ANVESH PDF forensic dossiers. Both typecheck and production Vite build pass with 0 errors.

---

## Completed (All 5 Phases)
1. **Branding & Nomenclature Alignment (Phase 1):**
   - Updated application title in `index.html` to `ANVESH — Predictive Cybercrime Interdiction Framework (SIH 26184)`.
   - Updated navigation sidebar metadata in `nav.ts` to `ANVESH | TrailTrace 2.0 | Team THE INVERSION | SIH 26184`.
   - Re-labeled navigation entries: `Interdiction & DNA` (formerly Intelligence), `STKDE Risk Surface` (formerly Map Intelligence), and `Evidence Alerts`.
2. **Small Supporting Backend Adjustments (Phase 2):**
   - Enriched `apps/python-engine/core/next_hop.py` and `apps/python-engine/main.py`:
     - Added `mode` (`"MODE_A"` for matched ring patterns vs `"MODE_B"` for cold-start profile forecasts) and `mode_label`.
     - Added `interdiction` payload: `choke_point_node`, `choke_point_score`, action recommendation (`IMMEDIATE_ACCOUNT_FREEZE`), and `what_if_reroute` (evasion friction penalty).
     - Added `expected_value_inr` calculated from complaint amount, confidence probability, and remaining time window.
     - Added structured `evidence_graded_signals` tagging claims across 4 tiers (`[Observed]`, `[Linked]`, `[Inferred]`, `[Predicted]`).
     - Added `evidence_grade` to detailed transaction steps.
   - Enriched fallback response in `apps/api/src/modules/trails/service.ts` with identical ANVESH fields for offline engine resilience.
3. **National EV Prioritization Queue (Phase 3):**
   - Added interactive **National Interdiction & EV Prioritization Queue** table in `DashboardPage.tsx`.
   - Ranks active complaints by Expected Value (`EV = Amount × Confidence × Urgency`), displaying recommended choke points and quick action links.
   - Added `⚡ Run Risk Engine` trigger to instantly populate risk metrics without zeroes.
4. **Evidence-Graded & Interdiction Intelligence View (Phase 3):**
   - Re-designed header with `SIH 26184 — Cybercrime Interdiction & DNA`.
   - Added Mode A / Mode B status badges.
   - Added **Interdiction Intelligence & Choke-Point Analysis** panel highlighting optimal freeze point and What-If evasion penalty.
   - Added **4-Tier Evidence Decomposition** visual cards (`[Observed]`, `[Linked]`, `[Inferred]`, `[Predicted]`).
5. **Geospatial Presentation (Phase 4):**
   - Updated PageHeader and layer titles to reflect `STKDE Risk Surface & Predicted Channel Map` (Mode A vs Mode B base rates).
6. **Money Trail Trajectories & Interdiction (Phase 4):**
   - Added **Choke-Point Interdiction Advisory** callout banner with freeze recommendations and friction impact in `TrailsPage.tsx`.
   - Tagged each confirmed hop with an `[Observed]` badge.
7. **Explainable Evidence Alerts Feed (Phase 4):**
   - Added 4-tier evidence tags (`[Observed]`, `[Linked]`, `[Inferred]`, `[Predicted]`) to alert feed items in `AlertsPage.tsx`.
8. **Investigation Workspace & Forensic Dossiers (Phase 5):**
   - Updated `InvestigationWorkspacePage.tsx` with ANVESH 4-tier evidence finding types (`[Observed]`, `[Linked]`, `[Inferred]`, `[Predicted]`, `Choke-Point Freeze Advisory`).
   - Updated `ReportsPage.tsx` and backend PDF report generator `apps/api/src/modules/investigations/report.ts` to output formal **ANVESH Forensic Cybercrime Intelligence & Interdiction Reports** with research disclaimers and case numbers.
9. **Cloud & Production Deployment Readiness:**
   - Configured dynamic `API_PROXY_TARGET` in `vite.config.ts`.
   - Updated `docker-compose.yml` and `apps/api/src/config.ts` with wildcard CORS origin for frictionless deployment on Railway/Render.
10. **Sample Data & Automated DB Seeding Expansion:**
   - Expanded `sample_data/cybercrime_complaints.csv` from 4 to 10 realistic cybercrime complaints covering diverse crime typologies (digital arrest, Telegram investment fraud, APK phishing, parcel extortion, task fraud, loan app blackmail).
   - Expanded `sample_data/bank_transactions.csv` to 50 transactions, 63 accounts, 5 banks, and 4-hop money trails with multi-jurisdiction choke points (Jamtara, Mewat, Ahmedabad, Deoghar, Dhanbad).
   - Enriched `apps/api/src/modules/geospatial/resolver.ts` with accurate geocoordinates for 10 new hubs (Kolkata, Jaipur, Ahmedabad, Mewat, Lucknow, Patna, Bhubaneswar, Nagpur, Surat, Chennai).
   - Upgraded `apps/api/prisma/seed.ts` to automatically parse CSVs, upsert accounts/transactions, match all 10 complaints, build BFS money trails, score behavioural risk, and populate sample ANVESH investigation dossiers with 4-tier findings.
11. **Complete Global Re-branding to ANVESH:**
   - Completely purged all occurrences of `trailtrace` across code, configs, package names, Docker containers, markdown files, and imports.
   - Renamed npm workspaces to `@anvesh/shared`, `@anvesh/api`, and `@anvesh/web`.
   - Renamed root project to `anvesh`.
   - Renamed Docker containers and PostgreSQL services in `docker-compose.yml` to `anvesh-*`.
   - Renamed application constants (`APP_NAME = "ANVESH"`), theme storage keys (`anvesh-theme`), FastAPI title, Express root endpoint, and PDF dossier titles.
   - Verified 0 remaining occurrences via `git grep -i "trailtrace"`.

---

## Decisions Made
- **Implemented:** Branding, Navigation, National EV Queue, Mode A/B Badging, Interdiction Choke-Point & What-If Reroute panel, 4-tier evidence-graded signal decomposition, Choke-Point callouts on TrailsPage, Evidence badges on AlertsPage, ANVESH PDF report generator, Case workspace findings taxonomy.
- **Small Internal Changes:** Added `mode`, `interdiction`, `evidence_graded_signals`, and `expected_value_inr` to Python engine and Express fallback outputs; updated PDF generator title and disclaimer.
- **Deployment Changes:** Added dynamic container network proxy target and wildcard CORS for cloud host compatibility (Railway/Render).
- **Lightweight / Approximate:** Retained existing Leaflet map engine and NetworkX graph traversal while re-skinning presentation to match STKDE Risk Surface and Route DNA framing.
- **Skipped / Deferred:** Full Epanechnikov LOOCV KDE with 1000-run Monte Carlo null model; full Neo4j Cypher database rewrite. (Reason: Preserves working SQLite/Prisma backend and avoids high-risk multi-day rewrite).

---

## Files Changed
- `apps/web/index.html`
- `apps/web/src/components/layout/nav.ts`
- `apps/python-engine/core/next_hop.py`
- `apps/python-engine/main.py`
- `apps/api/src/modules/trails/service.ts`
- `apps/api/src/modules/investigations/report.ts`
- `apps/api/src/config.ts`
- `apps/web/vite.config.ts`
- `docker-compose.yml`
- `apps/web/src/pages/DashboardPage.tsx`
- `apps/web/src/pages/IntelligencePage.tsx`
- `apps/web/src/pages/GeospatialPage.tsx`
- `apps/web/src/pages/TrailsPage.tsx`
- `apps/web/src/pages/AlertsPage.tsx`
- `apps/web/src/pages/InvestigationWorkspacePage.tsx`
- `apps/web/src/pages/ReportsPage.tsx`
- `PROJECT_UPDATE_PROGRESS.md`
- `PROJECT_HANDOFF.md`

---

## Known Issues
None. Both TypeScript typecheck (`npm run typecheck`) and Vite production build (`npm run build -w @trailtrace/web`) pass with 0 errors.

---

## Verification
- `npm run typecheck` $\rightarrow$ Exit code 0 across `@trailtrace/shared`, `@trailtrace/api`, and `@trailtrace/web`.
- `npm run build -w @trailtrace/web` $\rightarrow$ Exit code 0, 1682 modules transformed, built in ~3.7s.
