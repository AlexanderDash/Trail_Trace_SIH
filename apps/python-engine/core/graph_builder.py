import networkx as nx

def build_networkx_graph(accounts, transactions):
    G = nx.MultiDiGraph()
    for acc in accounts:
        G.add_node(
            acc["account_id"],
            account_type=acc.get("account_type", "savings"),
            is_dormant=acc.get("is_dormant_prior", False),
            profile=acc.get("declared_profile", "unknown")
        )
    for txn in transactions:
        G.add_edge(
            txn["source_account"],
            txn["dest_account"],
            trans_id=txn["trans_id"],
            amount=txn["amount"],
            channel=txn["channel"],
            timestamp=txn["timestamp"],
            district=txn.get("district", "N/A")
        )
    return G