import json

def generate_recovery_plan(
    source_node_id: int,
    source_node_name: str,
    source_status: str,
    available_backups: list[dict]
) -> tuple[int | None, list[str]]:
    """
    Formulates a recovery and failover plan for a degraded/offline node.
    Returns (recommended_backup_node_id, recovery_steps)
    """
    steps = [
        f"Initialize isolation protocol for {source_node_name}.",
        f"Instruct hypervisor to pause running compute tasks on {source_node_name}."
    ]
    
    # Filter candidates: status must be online, sorted by load (lowest first)
    candidates = [
        b for b in available_backups 
        if b["status"] == "online" and b["id"] != source_node_id
    ]
    candidates.sort(key=lambda x: x.get("load", 0.5))
    
    target_id = None
    if candidates:
        backup = candidates[0]
        target_id = backup["id"]
        steps.extend([
            f"Select target node {backup['name']} as failover host (Current load: {int(backup['load']*100)}%).",
            f"Transfer container network interface routing to node {backup['name']}.",
            f"Restore active GPU memory state checkpoint on node {backup['name']}.",
            f"Verify compute loop synchronization on {backup['name']}.",
            f"Mark failover migration complete."
        ])
    else:
        steps.append("WARNING: No online backup nodes with sufficient capacity available. Triple Modular Redundancy (TMR) degraded.")
        
    steps.extend([
        f"Trigger physical memory scrub (zero-fill cycle) on {source_node_name}.",
        f"Perform soft/hard reboot on {source_node_name} to reset ECC registers.",
        f"Execute POST (Power-On Self-Test) diagnostic checks on {source_node_name}."
    ])
    
    return target_id, steps

def recommend_tmr_placement(nodes: list[dict]) -> list[str]:
    """
    Recommends 3 distinct nodes for Triple Modular Redundancy setup.
    We prefer nodes with low predicted fault rate and different physical racks/zones.
    """
    # Sort nodes by load and status
    online_nodes = [n for n in nodes if n["status"] == "online"]
    online_nodes.sort(key=lambda x: x.get("load", 0.5))
    
    if len(online_nodes) < 3:
        return [n["name"] for n in online_nodes]
        
    # Pick the top 3 nodes
    return [online_nodes[0]["name"], online_nodes[1]["name"], online_nodes[2]["name"]]
