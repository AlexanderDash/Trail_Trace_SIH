def generate_plain_text_alert(cid, category, tier, elapsed, golden_left, trail_data, reasons):
    summary = f"\n{'='*70}\n"
    summary += f"[{tier}] Complaint {cid} ({category})\n"
    summary += f"{'='*70}\n"
    
    # 1. Golden Hour Breakdown
    summary += f"  • Golden Hour Window: {golden_left} mins remaining ({elapsed} mins elapsed)\n"
    if golden_left > 0:
        summary += f"    💡 [EXPLANATION]: Active window available. Prioritize real-time digital account freeze orders.\n"
    else:
        summary += f"    ⚠️ [EXPLANATION]: Golden Hour window closed (>120m). Focus shifts to CCTV retrieval and forensic tracing.\n"

    # 2. Trail Visualization
    summary += f"  • Money Trail: {trail_data['traced_trail_string']}\n"
    summary += f"    💡 [EXPLANATION]: Graph path traced from victim's account through active intermediate nodes.\n"
    
    # 3. Step-by-Step Hops
    if trail_data.get("steps"):
        summary += "  • Completed Digital Hops:\n"
        for step in trail_data["steps"]:
            summary += f"     [Hop {step['hop']}] {step['from_account']} ➔ {step['to_account']} | ₹{step['amount']:,} via {step['channel']} (+{step['elapsed_mins']}m)\n"
        summary += f"    💡 [EXPLANATION]: Confirmed electronic transactions already completed in the banking ledger.\n"

    # 4. Behavioral Signals
    if reasons:
        summary += f"  • Behavioral Risk Signals: {'; '.join(reasons)}\n"
        summary += f"    💡 [EXPLANATION]: Graph anomaly indicators (e.g., dormant activation, high velocity).\n"
        
    # 5. Probabilistic Forecast vs Confirmed
    if trail_data.get("is_predicted"):
        preds = trail_data["predictions"]
        summary += f"\n  --- 🔮 PROBABILISTIC PATH FORECAST ---\n"
        summary += f"  • Primary Predicted Hop: {preds['primary_node']} (Likelihood: {preds['primary_prob']})\n"
        
        if preds.get("secondary_node"):
            summary += f"  • Secondary Risk Hop: {preds['secondary_node']} (Likelihood: {preds['secondary_prob']})\n"
            
        summary += f"  • Novel Route / Drift Risk: {preds['novel_drift_risk']} chance of funds moving to an unobserved new account\n"
        summary += f"  • Predicted Cash-Out District: {preds['channel']} in {preds['predicted_district']} (Confidence: {preds['location_confidence']})\n"
        summary += f"  • Estimated Time-to-Liquidate: ~{preds['est_time_remaining_mins']} minutes remaining before withdrawal\n"
        summary += f"    💡 [EXPLANATION]: Probabilities are calculated using historical edge frequencies and Laplace smoothing to account for alternative routes and novel account creation.\n"
        summary += f"  • Action Plan: Primary freeze order on {preds['primary_node']}; watchlist alert on {preds.get('secondary_node', 'N/A')}; dispatch alert to {preds['predicted_district']}.\n"
    else:
        term = trail_data.get("terminal_event")
        if term:
            summary += f"\n  --- 🛑 CONFIRMED TERMINAL EVENT ---\n"
            summary += f"  • Cash-Out Executed: {term['channel']} in {term['district']} (Amount: ₹{term['amount']:,})\n"
            summary += f"    💡 [EXPLANATION]: Money has physically exited the banking network. Request immediate CCTV footage from {term['district']}.\n"
            
    return summary