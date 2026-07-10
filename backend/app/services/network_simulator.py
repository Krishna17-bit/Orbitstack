import math
import time
from sqlalchemy.orm import Session
from app.models.models import Node
from typing import List, Dict, Any, Tuple

def get_network_topology(db: Session) -> Dict[str, Any]:
    """
    Computes dynamic coordinates for satellites in LEO orbits and
    determines active laser links based on distance and node statuses.
    """
    nodes = db.query(Node).all()
    n_count = len(nodes)
    
    current_time = time.time()
    
    # Ground Station at fixed location
    net_nodes = [
        {
            "id": 0,
            "name": "Ground Station Alpha",
            "x": 250.0,
            "y": 420.0,
            "status": "online",
            "load": 0.0
        }
    ]
    
    # Orbit parameters
    cx, cy = 250.0, 220.0
    radius = 160.0
    
    # Calculate satellite coordinates
    for idx, node in enumerate(nodes):
        # Evenly space them in orbit and apply time rotation
        angle = (2 * math.pi * idx / max(1, n_count)) + (current_time * 0.04)
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        
        net_nodes.append({
            "id": node.id,
            "name": node.name,
            "x": round(x, 1),
            "y": round(y, 1),
            "status": node.status,
            "load": node.load
        })
        
    links = []
    
    # Connect adjacent satellites in orbit
    for i in range(1, len(net_nodes)):
        for j in range(i + 1, len(net_nodes)):
            n1 = net_nodes[i]
            n2 = net_nodes[j]
            
            # Distance in 2D coordinate space
            dist = math.sqrt((n1["x"] - n2["x"])**2 + (n1["y"] - n2["y"])**2)
            
            # Satellites communicate if distance is close enough (mesh adjacent)
            if dist < 220.0:
                # Link quality depends on node status
                if n1["status"] == "offline" or n2["status"] == "offline":
                    status = "down"
                    loss = 100.0
                elif n1["status"] == "degraded" or n2["status"] == "degraded":
                    status = "degraded"
                    loss = 20.0
                else:
                    status = "online"
                    loss = 0.5
                    
                links.append({
                    "source": n1["id"],
                    "target": n2["id"],
                    "status": status,
                    "latency_ms": round(dist * 0.15 + 5.0, 1),
                    "packet_loss_pct": loss
                })
                
    # Connect satellites to Ground Station if they are in view (bottom half of orbit y > 180)
    for i in range(1, len(net_nodes)):
        sat = net_nodes[i]
        if sat["y"] > 180.0:
            dist = math.sqrt((sat["x"] - 250.0)**2 + (sat["y"] - 420.0)**2)
            
            if sat["status"] == "offline":
                status = "down"
                loss = 100.0
            elif sat["status"] == "degraded":
                status = "degraded"
                loss = 15.0
            else:
                status = "online"
                loss = 0.2
                
            links.append({
                "source": 0,
                "target": sat["id"],
                "status": status,
                "latency_ms": round(dist * 0.25 + 10.0, 1),
                "packet_loss_pct": loss
            })
            
    return {"nodes": net_nodes, "links": links}

def trace_route(db: Session, target_node_id: int) -> Dict[str, Any]:
    """
    Computes the shortest routing path using Dijkstra's algorithm from 
    Ground Station (id: 0) to the target satellite node.
    """
    topology = get_network_topology(db)
    nodes = topology["nodes"]
    links = topology["links"]
    
    # Build graph
    adj = {n["id"]: [] for n in nodes}
    node_names = {n["id"]: n["name"] for n in nodes}
    
    for link in links:
        if link["status"] == "down":
            continue
        # Bi-directional link
        adj[link["source"]].append((link["target"], link["latency_ms"], link["packet_loss_pct"]))
        adj[link["target"]].append((link["source"], link["latency_ms"], link["packet_loss_pct"]))
        
    # Dijkstra
    source = 0
    import heapq
    
    # PQ contains: (latency, loss, current_node, path)
    queue = [(0.0, 0.0, source, [source])]
    visited = set()
    
    best_latency = {n["id"]: float('inf') for n in nodes}
    best_latency[source] = 0.0
    
    while queue:
        lat, loss, curr, path = heapq.heappop(queue)
        
        if curr in visited:
            continue
        visited.add(curr)
        
        if curr == target_node_id:
            # Found shortest path
            path_names = [node_names[nid] for nid in path]
            return {
                "path": path_names,
                "latency_ms": round(lat, 1),
                "packet_loss_pct": round(100.0 - (100.0 - loss), 2),
                "success": True
            }
            
        for neighbor, weight_lat, weight_loss in adj[curr]:
            if neighbor in visited:
                continue
            
            new_lat = lat + weight_lat
            # Compound packet loss: Probability of success = P(S1) * P(S2)
            # Loss = 1 - (1 - L1) * (1 - L2)
            new_loss = 100.0 - ((100.0 - loss) / 100.0 * (100.0 - weight_loss) / 100.0 * 100.0)
            
            if new_lat < best_latency[neighbor]:
                best_latency[neighbor] = new_lat
                heapq.heappush(queue, (new_lat, new_loss, neighbor, path + [neighbor]))
                
    return {
        "path": [],
        "latency_ms": 0.0,
        "packet_loss_pct": 100.0,
        "success": False
    }
