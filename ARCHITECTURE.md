# ANVESH Architecture

This document describes the architectural flow of data from ingestion to advanced intelligence correlation.

## High-Level Data Flow

```text
                ┌──────────────────────┐
                │ Bank Transaction     │
                │ CSV/XLS/XLSX Files   │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ Normalization &      │
                │ Validation           │
                └──────────┬───────────┘
                           │
                           ▼
┌──────────────────┐   ┌──────────────────────┐
│ Complaint Files  │──►│ Transaction Matching │
│ CSV/XLS/XLSX     │   └──────────┬───────────┘
└──────────────────┘              │
                                  ▼
                       ┌─────────────────────┐
                       │ Cross-Bank Trail    │
                       │ Reconstruction      │
                       └─────────┬───────────┘
                                 │
              ┌──────────────────┼─────────────────┐
              ▼                  ▼                 ▼
       Risk Intelligence    Geospatial        Investigation
              │             Intelligence         │
              ▼                  │                 ▼
        Watchlist/Alerts         │           Timeline/Report
              │                  │
              └──────────┬───────┘
                         ▼
              ┌─────────────────────┐
              │ Advanced Financial │
              │ Intelligence       │
              └─────────────────────┘
```

## System Components

### 1. Ingestion Pipeline (`/api/v1/ingestion`)
Manages the upload of multi-bank datasets. Uses dynamic column-mapping allowing investigators to bridge heterogeneous datasets (SBI, HDFC, ICICI, etc.) onto a single unified transactional schema.

### 2. Transaction Matching (`/api/v1/complaints`)
Employs a configurable heuristic matching engine. Weights timestamps, amounts, modes, and account proximity to accurately locate the exact fraudulent transaction seed within millions of normalized ledger records. 

### 3. Trail Reconstruction (`/api/v1/trails`)
A Breadth-First Search (BFS) graph-traversal engine. Identifies cyclic loops and split-amount forwarding tactics. Evaluates down to a configured depth to isolate the `Latest Known Account`.

### 4. Behavioural Risk Engine (`/api/v1/risk`)
Operates continuously over reconstructed nodes. Uses a deterministic feature-extraction pipeline (e.g., `forwarding_ratio`, `cross_bank_velocity`, `rapid_movement`) to maintain an aggregated `RiskProfile` score (0-100). Exceeding thresholds automatically issues `Alerts` and updates the `Watchlist`.

### 5. Geospatial Intelligence (`/api/v1/geospatial` & `/api/v1/ml`)
Aggregates ATM/Physical metadata linked to terminal accounts in a suspect trail. Employs DBSCAN density-based clustering to map Withdrawal Hotspots. Will fall back to deterministic proximity if `INSUFFICIENT_DATA` prevents robust ML Logistic Regression predictions.

### 6. Case Workspace (`/api/v1/investigations`)
An orchestration layer synthesizing all engine outputs into a cohesive "Single Pane of Glass" timeline. Supports the addition of human-curated Notes and formal Findings, terminating in an automated PDF Report generation sequence.

### 7. Advanced Intelligence (`/api/v1/intelligence`)
A cross-correlation engine analyzing the macro-environment. Detects distinct cybercrime trails that converge on shared accounts (Suspicious Networks), exposing underlying structural mule topologies across banking boundaries.
