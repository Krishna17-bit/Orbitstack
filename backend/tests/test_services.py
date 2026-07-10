import pytest
import json
from app.services.fault_sim import calculate_predicted_fault_rate, simulate_seu_memory_map
from app.services.thermal import calculate_next_temperature
from app.services.checkpoint import calculate_optimal_checkpoint
from app.services.ecc import evaluate_ecc_health
from app.services.graph import DependencyGraphManager

def test_radiation_fault_math():
    # Shielding should reduce fault rate
    rate_low_shield = calculate_predicted_fault_rate("VRAM", "LEO", 1.0)
    rate_high_shield = calculate_predicted_fault_rate("VRAM", "LEO", 5.0)
    assert rate_high_shield < rate_low_shield

    # Deep Space should have higher rate than LEO
    rate_deep = calculate_predicted_fault_rate("VRAM", "Deep Space", 2.0)
    rate_leo = calculate_predicted_fault_rate("VRAM", "LEO", 2.0)
    assert rate_deep > rate_leo

    # Rad-Hard devices should have ultra-low rate
    rate_rad_hard = calculate_predicted_fault_rate("Rad-Hard", "Deep Space", 2.0)
    rate_vram = calculate_predicted_fault_rate("VRAM", "Deep Space", 2.0)
    assert rate_rad_hard < rate_vram

def test_memory_seu_simulation():
    # Running simulation should output valid JSON map
    map_str, correctable, uncorrectable = simulate_seu_memory_map(predicted_rate_per_hour=3000.0)
    assert isinstance(map_str, str)
    mem_map = json.loads(map_str)
    assert len(mem_map) > 0
    
    # Subsequent flips in same map should escalate corrected to corrupt
    updated_map_str, c, uc = simulate_seu_memory_map(predicted_rate_per_hour=5000.0, current_map_str=map_str)
    updated_map = json.loads(updated_map_str)
    assert len(updated_map) >= len(mem_map)

def test_thermal_dynamics():
    # Ambient space (15C) vs underwater (4C) cooling efficiency
    # Space cooling is slower, underwater is very rapid
    _, _, fatigue_space = calculate_next_temperature(
        current_temp=30.0,
        compute_load=0.8,
        environment="space",
        prev_fatigue=10.0
    )
    
    # Stress damage / fatigue should accumulate
    assert fatigue_space > 10.0

def test_checkpoint_young_daly():
    # Under high fault rate, optimal interval should be lower to prevent compute loss
    opt_interval_high, loss_high = calculate_optimal_checkpoint(predicted_fault_rate_per_hour=5.0)
    opt_interval_low, loss_low = calculate_optimal_checkpoint(predicted_fault_rate_per_hour=0.1)
    
    assert opt_interval_high < opt_interval_low
    assert opt_interval_high > 0.0

def test_ecc_evaluation():
    status_good, deg_good = evaluate_ecc_health(0, 0)
    assert status_good == "online"
    assert deg_good == 0.0
    
    # Multi-bit uncorrectable error makes it degraded immediately
    status_degraded, deg_degraded = evaluate_ecc_health(0, 1)
    assert status_degraded == "degraded"
    assert deg_degraded == 25.0
    
    # Severe errors take it offline
    status_offline, deg_offline = evaluate_ecc_health(50, 4)
    assert status_offline == "offline"
    assert deg_offline >= 80.0

def test_graph_network():
    nodes_data = [
        {"id": "power-1", "label": "Solar Array", "type": "power", "status": "online"},
        {"id": "switch-1", "label": "Network Switch", "type": "network", "status": "online"},
        {"id": "node-1", "label": "Compute Core A", "type": "compute", "status": "online"},
        {"id": "node-2", "label": "Compute Core B", "type": "compute", "status": "online"}
    ]
    
    G = DependencyGraphManager.build_graph(nodes_data)
    assert G.number_of_nodes() == 4
    
    # Power failure blast radius: should affect downstream nodes (switch and compute)
    power_blast = DependencyGraphManager.calculate_blast_radius(G, "power-1")
    # affects switch-1, node-1, node-2 (3 out of 3 other nodes = 1.0)
    assert power_blast == 1.0
    
    # Compute node failure blast radius: should be 0.0 since it has no downstream nodes
    comp_blast = DependencyGraphManager.calculate_blast_radius(G, "node-1")
    assert comp_blast == 0.0
