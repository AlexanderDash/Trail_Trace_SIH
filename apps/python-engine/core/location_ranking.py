import pandas as pd

def calculate_urgency(fraud_time_str, sim_time_str):
    fraud_dt = pd.to_datetime(fraud_time_str)
    sim_dt = pd.to_datetime(sim_time_str)
    
    elapsed_mins = max(0, (sim_dt - fraud_dt).total_seconds() / 60.0)
    golden_hour_mins_left = max(0, 60.0 - elapsed_mins)
    
    if elapsed_mins <= 60:
        tier = "CRITICAL URGENCY"
    elif elapsed_mins <= 120:
        tier = "HIGH RISK"
    else:
        tier = "EXPIRED / LOW"
        
    return round(elapsed_mins, 1), round(golden_hour_mins_left, 1), tier