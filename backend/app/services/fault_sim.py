import json
import numpy as np
from app.models.models import Node, FaultSim

# Preset parameters
REGION_INTENSITY = {
    "LEO": 1.2,
    "GEO": 5.0,
    "SAA": 12.0,
    "Lunar": 8.0,
    "Deep Space": 20.0,
    "Mariana Trench": 0.001,
    "Sahara": 0.05
}

DEVICE_BASE_RATES = {
    "DRAM": 0.05,
    "SRAM": 0.2,
    "VRAM": 0.5,
    "Rad-Hard": 0.001
}

SHIELDING_LAMBDA = 0.15  # Attenuation factor

def calculate_predicted_fault_rate(device_type: str, region: str, shielding: float) -> float:
    base_rate = DEVICE_BASE_RATES.get(device_type, 0.1)
    intensity = REGION_INTENSITY.get(region, 1.0)
    # Exponential decay based on shielding thickness
    shielding_effect = np.exp(-shielding * SHIELDING_LAMBDA)
    predicted_rate = base_rate * intensity * shielding_effect
    return float(predicted_rate)

def simulate_seu_memory_map(predicted_rate_per_hour: float, current_map_str: str = None) -> tuple[str, int, int]:
    """
    Simulates Single Event Upsets in a 32x32 memory map (1024 cells).
    Returns (updated_map_json, correctable_count, uncorrectable_count).
    """
    # Initialize or load map
    if current_map_str:
        try:
            mem_map = json.loads(current_map_str)
        except Exception:
            mem_map = {}
    else:
        mem_map = {}

    # Average errors in a 1-minute simulation step
    avg_errors_per_minute = predicted_rate_per_hour / 60.0
    
    # Sample actual number of flips using Poisson distribution
    num_flips = np.random.poisson(avg_errors_per_minute)
    
    correctable = 0
    uncorrectable = 0
    
    for _ in range(num_flips):
        # Choose a random physical index from 0 to 1023
        cell_idx = str(np.random.randint(0, 1024))
        
        # Check current state of this cell
        current_state = mem_map.get(cell_idx, "ECC_OK")
        
        if current_state == "ECC_OK":
            # 90% correctable (single-bit SEU), 10% uncorrectable (multi-bit)
            if np.random.rand() < 0.90:
                mem_map[cell_idx] = "ECC_CORRECTED"
                correctable += 1
            else:
                mem_map[cell_idx] = "CRITICAL_CORRUPT"
                uncorrectable += 1
        elif current_state == "ECC_CORRECTED":
            # A second bit-flip turns it uncorrectable
            mem_map[cell_idx] = "CRITICAL_CORRUPT"
            correctable -= 1
            uncorrectable += 1
        # If already CRITICAL_CORRUPT, stays corrupt
        
    return json.dumps(mem_map), correctable, uncorrectable
