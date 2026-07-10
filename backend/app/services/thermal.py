import numpy as np

ENV_THERMAL_PARAMS = {
    # (ambient_temp, cooling_efficiency_base)
    "space": (15.0, 0.4),       # Radiative dissipation is harder in vacuum
    "underwater": (4.0, 0.9),  # Ocean water is an excellent thermal sink
    "desert": (45.0, 0.5)      # Hot air limits delta-T cooling potential
}

def calculate_next_temperature(
    current_temp: float,
    compute_load: float,
    environment: str,
    prev_fatigue: float
) -> tuple[float, float, float]:
    """
    Computes updated temperature, cooling efficiency, and cumulative thermal fatigue.
    Returns (new_temp, cooling_efficiency, new_fatigue).
    """
    ambient, base_eff = ENV_THERMAL_PARAMS.get(environment.lower(), (20.0, 0.6))
    
    # Heat generation component
    alpha = 18.0  # heating rate coefficient
    heat_gen = alpha * compute_load
    
    # Cooling component
    beta = 10.0  # cooling recovery rate coefficient
    # Cooling efficiency drops slightly as temperature increases (common in electronics)
    cooling_efficiency = base_eff * (1.0 - (current_temp - ambient) * 0.002)
    cooling_efficiency = max(0.1, min(1.0, cooling_efficiency))
    
    cooling = beta * cooling_efficiency
    
    # Heat exchange with ambient
    gamma = 0.08
    ambient_exchange = gamma * (ambient - current_temp)
    
    # Next temperature calculation
    new_temp = current_temp + heat_gen - cooling + ambient_exchange
    # Clip temperature boundaries
    new_temp = max(-10.0, min(105.0, new_temp))
    
    # Coffin-Manson relation fatigue modeling
    # Stress damage accumulates exponentially with thermal swing
    temp_swing = abs(new_temp - current_temp)
    stress_damage = (temp_swing ** 2.2) / 150.0
    new_fatigue = prev_fatigue + stress_damage
    
    return float(new_temp), float(cooling_efficiency), float(new_fatigue)

def generate_thermal_heatmap(center_temp: float, dimensions: tuple[int, int] = (10, 10)) -> list[list[float]]:
    """
    Generates a 10x10 thermal grid simulating spatial hotspots around a central hot node.
    """
    rows, cols = dimensions
    grid = np.zeros((rows, cols))
    
    # Choose a random hotspot position
    hs_r = rows // 2
    hs_c = cols // 2
    
    for r in range(rows):
        for c in range(cols):
            # Compute distance to hotspot
            dist = np.sqrt((r - hs_r)**2 + (c - hs_c)**2)
            # Ambient gradient base
            base = 22.0
            # Gaussian temp drop-off
            temp_offset = (center_temp - base) * np.exp(-dist * 0.4)
            grid[r, c] = round(base + temp_offset + np.random.normal(0, 0.5), 2)
            
    return grid.tolist()
