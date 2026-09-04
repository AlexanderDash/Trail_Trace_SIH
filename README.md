# TrailTrace

TrailTrace is a web-based cybercrime financial intelligence platform designed to ingest transaction datasets from multiple banks, connect transactions across institutions, identify money trails originating from cybercrime complaints, and detect suspicious account behaviour (such as potential mule networks). It integrates geospatial intelligence and a decision-support investigation workspace.

> **IMPORTANT**: The system provides investigative intelligence and decision support. It does not independently determine criminal guilt or execute enforcement actions. All predictive ML capabilities gracefully degrade to rule-based logic when historical data is insufficient.

## 1. Problem Statement

Financial cybercrime often involves rapid movement of funds across multiple bank accounts (layering) to obfuscate the trail. Investigators face challenges in aggregating siloed data, manually tracing money flows, and identifying geographically relevant withdrawal hotspots before criminals cash out. 

## 2. Key Capabilities

*   **Multi-Bank Data Ingestion**: Upload transaction files (`.csv`, `.xls`, `.xlsx`) and normalize columns from heterogeneous bank formats into a unified ledger.
*   **Complaint Import & Auto-Matching**: Import cybercrime complaints from authoritative sources. The engine automatically matches complaints against normalized transactions based on amount, timeframe, and account heuristics.
*   **Cross-Bank Trail Reconstruction**: Reconstructs multi-hop money trails using a Breadth-First Search (BFS) graph engine, safely navigating cross-bank boundaries and split forwardings.
*   **Behavioural Risk Engine**: Continuously evaluates accounts against a configurable rule engine detecting *Rapid Forwarding*, *High-Velocity Turnover*, and *Fan-Out* behaviour.
*   **Geospatial Intelligence**: Maps known physical endpoints (like ATM withdrawals) associated with accounts in the suspect trail. Predicts withdrawal hotspots.
*   **Investigation Workspace**: Case-management timeline, synced with an interactive map, and formal finding recorders. Supports one-click PDF Report Generation.
*   **Advanced Network Intelligence**: Correlates accounts active across multiple disconnected cases.

## 3. Technology Stack

*   **Frontend**: React, TypeScript, Vite, TailwindCSS, React-Leaflet, Lucide Icons.
*   **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite.
*   **Analysis/Parsing**: xlsx, papaparse, pdfkit.

## 4. Running Locally

### Prerequisites
*   Node.js v20+
*   npm

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Initialize the Database:
```bash
npm run prisma:migrate -w @trailtrace/api
npm run prisma:generate -w @trailtrace/api
```

3. (Optional) Run Tests:
```bash
npm run test -w @trailtrace/api
```

### Running the Application

In a terminal, run the development server (runs both frontend and backend):
```bash
npm run dev
```

*   Frontend: http://localhost:5173
*   Backend API: http://localhost:3001

## 5. Demo Workflow

1.  Navigate to **Data Sources**. Upload sample bank transactions (`.csv` or `.xlsx`). Select the bank and map the columns. Import the data.
2.  Navigate to **Complaints**. Upload the sample cybercrime complaint file.
3.  The system will automatically identify candidate transactions and generate **Money Trails**.
4.  Navigate to **Trails**. Inspect the automatically generated graph traversal.
5.  Check **Watchlist** and **Alerts** for automated behavioural triggers generated during the trail trace.
6.  Open **Investigations** and click "Create Investigation" on a matched complaint to open the timeline sync.
7.  Check **Intelligence** for cross-complaint correlations and network summaries.

## 6. Security Considerations

*   Ensure `.env` files are properly excluded in production.
*   Uploaded files are processed using temporary disk storage (`multer`). Ensure the `uploads/` directory has proper write permissions and is cleared regularly. Temporary files are unlinked securely immediately after parsing.
*   The SQLite database is for prototype/demo scaling. For production, migrate the Prisma provider to PostgreSQL.
