from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Node
from app.schemas.schemas import DependencyGraphResponse, DependencyNode, DependencyEdge
from app.services.graph import DependencyGraphManager

router = APIRouter(prefix="/graph", tags=["Failure Graph"])

def _build_full_topology_data(db: Session) -> list[dict]:
    """
    Combines SQL compute nodes with virtual Power & Network switch nodes
    to return a unified flat node list for graph construction.
    """
    compute_nodes = db.query(Node).all()
    
    # Define our virtual system elements
    data = [
        {"id": "power-1", "label": "Solar Array Alpha (LEO/GEO Power)", "type": "power", "status": "online"},
        {"id": "power-2", "label": "RTG Nuclear Cell (Lunar/Deep Power)", "type": "power", "status": "online"},
        {"id": "switch-1", "label": "Orbital Router Alpha", "type": "network", "status": "online"},
        {"id": "switch-2", "label": "Lunar Edge Switch", "type": "network", "status": "online"},
    ]
    
    # Map compute nodes
    for cn in compute_nodes:
        # If the compute node is offline, reflect it
        status = cn.status
        data.append({
            "id": f"node-{cn.id}",
            "label": cn.name,
            "type": "compute",
            "status": status
        })
        
    return data

@router.get("/topology", response_model=DependencyGraphResponse)
def get_topology(db: Session = Depends(get_db)):
    nodes_data = _build_full_topology_data(db)
    
    # Build graph using our manager
    G = DependencyGraphManager.build_graph(nodes_data)
    
    # Calculate blast radius for each node
    response_nodes = []
    for node_id, attrs in G.nodes(data=True):
        blast_radius = DependencyGraphManager.calculate_blast_radius(G, node_id)
        response_nodes.append(
            DependencyNode(
                id=node_id,
                label=attrs.get("label", node_id),
                type=attrs.get("type", "compute"),
                status=attrs.get("status", "online"),
                blast_radius=float(blast_radius)
            )
        )
        
    response_edges = [
        DependencyEdge(source=u, target=v)
        for u, v in G.edges()
    ]
    
    return DependencyGraphResponse(nodes=response_nodes, edges=response_edges)

@router.post("/cascade")
def simulate_graph_cascade(failed_node_ids: list[str], db: Session = Depends(get_db)):
    """
    Simulates a cascading failure. If switch-1 fails, it cascades downstream.
    Returns the list of all nodes that are taken offline.
    """
    nodes_data = _build_full_topology_data(db)
    G = DependencyGraphManager.build_graph(nodes_data)
    
    # Run cascade propagation
    cascaded_failures = DependencyGraphManager.simulate_cascade(G, failed_node_ids)
    
    return {"failed_roots": failed_node_ids, "cascaded_offline_nodes": cascaded_failures}
