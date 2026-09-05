import math
import pandas as pd
import networkx as nx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from core.next_hop import trace_active_path

app = FastAPI(title="TrailTrace Python Mathematical Prediction Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TransactionItem(BaseModel):
    trans_id: str
    source_account: str
    dest_account: str
    amount: float
    channel: str
    timestamp: str
    district: Optional[str] = "N/A"

class ComplaintItem(BaseModel):
    complaint_id: str
    category: Optional[str] = "Financial Cyber Fraud"
    initial_beneficiary: str
    amount: float
    timestamp_filed: str

class PredictionRequest(BaseModel):
    complaint: ComplaintItem
    transactions: List[TransactionItem]

TransactionItem.model_rebuild()
ComplaintItem.model_rebuild()
PredictionRequest.model_rebuild()

@app.post("/api/predict")
def predict_trail_endpoint(payload: PredictionRequest):
    try:
        G = nx.MultiDiGraph()
        for txn in payload.transactions:
            if not G.has_node(txn.source_account):
                G.add_node(txn.source_account)
            if not G.has_node(txn.dest_account):
                G.add_node(txn.dest_account)

            G.add_edge(
                txn.source_account,
                txn.dest_account,
                trans_id=txn.trans_id,
                amount=txn.amount,
                channel=txn.channel,
                timestamp=pd.to_datetime(txn.timestamp),
                district=txn.district
            )

        complaint = payload.complaint
        start_acc = complaint.initial_beneficiary
        
        if not G.has_node(start_acc):
            first_edges = list(G.edges(data=True))
            if first_edges:
                start_acc = first_edges[0][0]
            else:
                raise HTTPException(status_code=400, detail=f"Target account {start_acc} not found in graph")

        fraud_time = pd.to_datetime(complaint.timestamp_filed)
        amount = complaint.amount

        # Run multi-hop graph traversal and Laplace-smoothed forecasting
        result = trace_active_path(G, start_acc, fraud_time, amount)

        # Standardize return keys for the Express API and React Frontend
        result["complaint_id"] = complaint.complaint_id
        result["money_trail_string"] = result.get("traced_trail_string", "")
        
        if result.get("is_predicted") and "predictions" in result:
            p = result["predictions"]
            result["plain_text_explanation"] = (
                f"Probabilistic forecast generated via Laplace Add-1 smoothing across multi-hop graph. "
                f"Primary target: {p.get('primary_node')} ({p.get('primary_prob')} likelihood). "
                f"Predicted cash-out: {p.get('channel')} in {p.get('predicted_district')} "
                f"(Location Confidence: {p.get('location_confidence')}). "
                f"Novel route drift risk: {p.get('novel_drift_risk')}."
            )
        else:
            term = result.get("terminal_event", {})
            result["plain_text_explanation"] = (
                f"Funds have reached a terminal cash-out liquidation event via {term.get('channel', 'ATM/Cash')} "
                f"in {term.get('district', 'N/A')}. Check terminal records and request immediate CCTV retrieval."
            )

        # Golden Hour urgency calculation
        fraud_dt_clean = fraud_time.tz_localize(None) if fraud_time.tzinfo else fraud_time
        now_dt = pd.Timestamp.utcnow().tz_localize(None)
        elapsed_mins = max(0.0, (now_dt - fraud_dt_clean).total_seconds() / 60.0)
        golden_left = max(0.0, 60.0 - elapsed_mins)
        urgency_tier = "CRITICAL URGENCY" if elapsed_mins <= 60 else ("HIGH RISK" if elapsed_mins <= 120 else "EXPIRED / FORENSIC")
        
        result["urgency"] = {
            "tier": urgency_tier,
            "elapsed_minutes": round(elapsed_mins, 1),
            "golden_hour_remaining_minutes": round(golden_left, 1)
        }

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)