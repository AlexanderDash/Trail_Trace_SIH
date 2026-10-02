# ANVESH — Predictive Cybercrime Interdiction Framework (SIH 26184)

ANVESH is an intelligent cybercrime financial intelligence and interdiction platform designed to ingest multi-bank transaction ledgers, reconstruct layered cross-bank fund movements, identify optimal interdiction choke points, evaluate behavioural risk across mule networks, and map withdrawal likelihood surfaces.

> **IMPORTANT**: The system provides investigative intelligence and decision support under SIH 26184 guidelines. It does not independently determine criminal guilt or execute enforcement actions. All predictive ML capabilities gracefully degrade to rule-based logic when historical data is insufficient.

## 1. Problem Statement

Financial cybercrime often involves rapid movement of funds across multiple bank accounts (layering) to obfuscate the trail. Investigators face challenges in aggregating siloed data, manually tracing money flows, and identifying geographically relevant withdrawal hotspots before criminals cash out. 

## 2. Key Capabilities

*   **Multi-Bank Data Ingestion**: Upload transaction files (`.csv`, `.xls`, `.xlsx`) and normalize columns from heterogeneous bank formats into a unified ledger.
*   **Complaint Import & Auto-Matching**: Import cybercrime complaints from authoritative sources. The engine automatically matches complaints against normalized transactions based on amount, timeframe, and account heuristics.
*   **Cross-Bank Money Trail Traversal**: Reconstructs multi-hop money trails using a Breadth-First Search (BFS) graph engine, safely navigating cross-bank boundaries and split forwardings.
*   **Interdiction & Choke-Point Optimization**: Identifies structural choke points to maximize asset recovery while quantifying criminal evasion friction via What-If counterfactual analysis.
*   **National EV Prioritization Queue**: Dynamically ranks actionable cases by Expected Recovery Value ($EV = \text{Amount} \times \text{Confidence} \times \text{Urgency}$).
*   **4-Tier Graded Evidence**: Transparently classifies every finding across `[Observed]`, `[Linked]`, `[Inferred]`, and `[Predicted]` evidence tiers.
*   **STKDE Risk Surface**: Spatio-temporal risk surfaces and predicted cash-out channels.
*   **Investigation Workspace & Forensic Dossiers**: Case-management workspace with timeline synchronization, 4-tier finding recorders, and exportable PDF forensic interdiction dossiers.

## 3. Technology Stack

*   **Frontend**: React 19, TypeScript, Vite, TailwindCSS, React-Leaflet, Lucide Icons (`apps/web`).
*   **Backend API**: Node.js, Express, TypeScript, Prisma ORM, SQLite (`apps/api`).
*   **Prediction Microservice**: Python FastAPI, NetworkX, Uvicorn (`apps/python-engine`).

## 4. Running Locally

### Prerequisites
*   Node.js v20+
*   npm
*   Python 3.10+

### Installation & Database Initialization

1. Install dependencies:
```bash
npm install
```

2. Seed database with pre-populated multi-hop trails and complaints:
```bash
npm run db:seed
```

### Running the Application

Launch all services together (Web UI, API, and Python Engine):
```bash
npm run dev:all
```

*   **Frontend UI**: http://localhost:5173
*   **Backend API**: http://localhost:3001
*   **Python Engine**: http://localhost:8000

## 5. Demo Workflow

1.  **Dashboard**: Review the **National Interdiction & EV Prioritization Queue** ranking cases by recovery value.
2.  **Route DNA & Interdiction**: Inspect Mode A/B classifications, choke-point freeze recommendations, and 4-tier evidence decompositions.
3.  **STKDE Risk Surface**: View geospatial likelihood surfaces for predicted withdrawal channels.
4.  **Money Trails**: Examine BFS graph traversal, hop-by-hop ledger details, and interdiction advisories.
5.  **Investigation Workspace & Reports**: Add 4-tier findings to case dossiers and generate official ANVESH Forensic Investigation PDFs.
