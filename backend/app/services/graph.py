import networkx as nx

class DependencyGraphManager:
    @staticmethod
    def build_graph(nodes_data: list[dict]) -> nx.DiGraph:
        """
        Builds a directed graph using networkx.
        nodes_data is a list of dicts: [{"id": "node-1", "type": "compute", "status": "online"}, ...]
        
        We inject dependencies:
        - Power Sources (e.g., power-1)
        - Switches (e.g., switch-1)
        - Compute Nodes (e.g., node-1)
        """
        G = nx.DiGraph()
        
        # 1. Add all nodes
        for node in nodes_data:
            G.add_node(
                node["id"],
                label=node["label"],
                type=node["type"],
                status=node["status"]
            )
            
        # 2. Wire dependencies automatically based on structure if not defined
        # We assume:
        # - power-1 feeds switch-1 and switch-2
        # - switch-1 feeds compute nodes 1-4
        # - switch-2 feeds compute nodes 5-8
        # Let's map dynamically:
        power_nodes = [n for n, attr in G.nodes(data=True) if attr.get("type") == "power"]
        switch_nodes = [n for n, attr in G.nodes(data=True) if attr.get("type") == "network"]
        compute_nodes = [n for n, attr in G.nodes(data=True) if attr.get("type") == "compute"]
        
        # Connect power to switches
        if power_nodes and switch_nodes:
            for i, sw in enumerate(switch_nodes):
                p_node = power_nodes[i % len(power_nodes)]
                G.add_edge(p_node, sw)
                
        # Connect switches to compute nodes
        if switch_nodes and compute_nodes:
            for i, comp in enumerate(compute_nodes):
                sw_node = switch_nodes[i % len(switch_nodes)]
                G.add_edge(sw_node, comp)
                
        return G

    @staticmethod
    def calculate_blast_radius(G: nx.DiGraph, target_node_id: str) -> float:
        """
        Calculates the blast radius of a node.
        Blast radius is the percentage of all compute nodes that will fail if target_node_id fails.
        """
        if not G.has_node(target_node_id):
            return 0.0
            
        total_nodes = G.number_of_nodes()
        if total_nodes <= 1:
            return 0.0
            
        # Find all downstream nodes in directed path
        downstream = nx.descendants(G, target_node_id)
        
        # Blast radius score (0.0 to 1.0)
        # Ratio of affected nodes to total nodes
        return len(downstream) / (total_nodes - 1) if (total_nodes - 1) > 0 else 0.0

    @staticmethod
    def simulate_cascade(G: nx.DiGraph, failed_nodes: list[str]) -> list[str]:
        """
        Traces cascading failures. Returns a list of all node IDs that are offline
        due to primary failures and propagation.
        """
        offline_nodes = set(failed_nodes)
        
        # Perform a BFS/DFS propagation
        # Any node whose parents are ALL offline/failed also becomes offline
        # For simplicity, if any dependency path is cut off, we propagate failure.
        # More specifically, if a node has incoming edges (dependencies) and all of its
        # active predecessors are offline, it goes offline. Or simply if its immediate predecessor is offline.
        
        # Queue of nodes to process
        queue = list(failed_nodes)
        while queue:
            current = queue.pop(0)
            for successor in G.successors(current):
                if successor not in offline_nodes:
                    offline_nodes.add(successor)
                    queue.append(successor)
                    
        return list(offline_nodes)
