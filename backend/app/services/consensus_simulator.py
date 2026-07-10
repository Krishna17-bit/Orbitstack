import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Node, ConsensusLog
from typing import List, Dict, Any

# In-memory store for Byzantine corrupted node IDs
_byzantine_nodes: Dict[int, bool] = {}
_block_height = 1000
_round = 1

def set_byzantine_status(node_id: int, corrupt: bool) -> bool:
    global _byzantine_nodes
    _byzantine_nodes[node_id] = corrupt
    return corrupt

def get_byzantine_status(node_id: int) -> bool:
    return _byzantine_nodes.get(node_id, False)

def run_consensus_simulation(db: Session, proposal_data: str) -> Dict[str, Any]:
    """
    Simulates a consensus round across all active nodes.
    Computes voting outcomes for Raft (CFT) and PBFT (BFT) protocols.
    Detects state divergence or secured consensus based on Byzantine counts.
    """
    global _block_height, _round
    
    _block_height += 1
    _round += 1
    
    nodes = db.query(Node).all()
    active_nodes = [n for n in nodes if n.status in ["online", "degraded"]]
    offline_nodes = [n for n in nodes if n.status == "offline"]
    
    n_total = len(nodes)
    n_active = len(active_nodes)
    
    byzantine_nodes = [n for n in active_nodes if get_byzantine_status(n.id)]
    f_count = len(byzantine_nodes)
    
    # 1. Log simulation votes in DB
    for node in nodes:
        status = "offline" if node.status == "offline" else ("byzantine" if get_byzantine_status(node.id) else "honest")
        
        # PREPARE Vote
        db.add(ConsensusLog(
            round=_round,
            block_height=_block_height,
            node_id=node.id,
            vote_type="PREPARE",
            status=status,
            timestamp=datetime.utcnow()
        ))
        # COMMIT Vote
        db.add(ConsensusLog(
            round=_round,
            block_height=_block_height,
            node_id=node.id,
            vote_type="COMMIT",
            status=status,
            timestamp=datetime.utcnow()
        ))
    db.commit()
    
    # 2. Simulate CFT (Raft) Outcome
    # Raft only handles crash faults. Requires majority: > N/2 online
    raft_threshold = n_total / 2.0
    raft_success = False
    raft_detail = "NOMINAL: State replicated."
    
    if n_active <= raft_threshold:
        raft_success = False
        raft_detail = "CRITICAL: Majority offline. Leader election timeout."
    elif f_count > 0:
        # If there are Byzantine nodes, Raft fails to prevent split-brain / state divergence
        raft_success = False
        raft_detail = f"SPLIT-BRAIN: {f_count} Byzantine node(s) injected conflicting transactions. States diverged."
    else:
        raft_success = True
        raft_detail = "SUCCESS: Safe state replication committed."
        
    # 3. Simulate BFT (PBFT) Outcome
    # PBFT requires 3f + 1 <= N active nodes to tolerate f Byzantine nodes
    pbft_required_active = 3 * f_count + 1
    pbft_success = False
    pbft_detail = ""
    
    if n_active <= n_total / 2.0:
        pbft_success = False
        pbft_detail = "FAILED: Insufficient active nodes to form consensus quorum."
    elif n_active >= pbft_required_active:
        pbft_success = True
        if f_count > 0:
            pbft_detail = f"SECURED: Reached agreement. Successfully detected and isolated {f_count} Byzantine vote(s)."
        else:
            pbft_detail = "SUCCESS: Reached agreement with 100% honest quorum."
    else:
        pbft_success = False
        pbft_detail = f"QUORUM TIMEOUT: Injected Byzantine nodes ({f_count}) blocked pre-commit threshold (requires {pbft_required_active} active nodes)."
        
    # Build detailed voting logs for visualization
    votes_log = []
    for node in active_nodes:
        is_byz = get_byzantine_status(node.id)
        votes_log.append({
            "node_name": node.name,
            "status": "Byzantine" if is_byz else "Honest",
            "prepare_vote": "CORRUPT_ALT" if is_byz else "VALID_BLOCK",
            "commit_vote": "CONFLICTING_VOTE" if is_byz else "COMMIT_BLOCK"
        })
        
    for node in offline_nodes:
        votes_log.append({
            "node_name": node.name,
            "status": "Offline (Crash)",
            "prepare_vote": "NO_RESPONSE",
            "commit_vote": "NO_RESPONSE"
        })
        
    return {
        "block_height": _block_height,
        "round": _round,
        "proposal_data": proposal_data,
        "active_replicas": n_active,
        "total_replicas": n_total,
        "byzantine_count": f_count,
        "raft": {
            "success": raft_success,
            "status": "DIVERGED" if (f_count > 0 and n_active > raft_threshold) else ("TIMEOUT" if n_active <= raft_threshold else "SUCCESS"),
            "detail": raft_detail
        },
        "pbft": {
            "success": pbft_success,
            "status": "SUCCESS" if pbft_success else ("TIMEOUT" if n_active <= n_total/2.0 else "QUORUM_FAILED"),
            "detail": pbft_detail
        },
        "votes": votes_log
    }

def get_replicas_status(db: Session) -> List[Dict[str, Any]]:
    nodes = db.query(Node).all()
    status_list = []
    for n in nodes:
        status_list.append({
            "id": n.id,
            "name": n.name,
            "node_status": n.status,
            "is_byzantine": get_byzantine_status(n.id)
        })
    return status_list
