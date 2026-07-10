import numpy as np
from datetime import datetime, timedelta
from app.models.models import Node, TelemetryLog

REGION_BASE_FLUX = {
    "LEO": 0.5,
    "GEO": 2.2,
    "SAA": 8.5,
    "Lunar": 4.0,
    "Deep Space": 12.0,
    "Mariana Trench": 0.001,
    "Sahara": 0.05
}

def generate_node_telemetry_history(node: Node, count: int = 50) -> list[dict]:
    """
    Generates a list of realistic historical telemetry log dicts for a node.
    """
    logs = []
    base_flux = REGION_BASE_FLUX.get(node.region, 1.0)
    
    # Shielding absorption
    shield_decay = np.exp(-node.shielding * 0.15)
    effective_flux = base_flux * shield_decay
    
    now = datetime.utcnow()
    
    for i in range(count):
        # Time steps back (e.g., 20 mins per step)
        timestamp = now - timedelta(minutes=20 * (count - i))
        
        # Load follows a diurnal-like sine wave with random noise
        hour = timestamp.hour
        sin_load = 0.5 + 0.3 * np.sin(hour * np.pi / 12.0)
        load = float(max(0.05, min(0.98, sin_load + np.random.normal(0, 0.08))))
        
        # Temperature correlates with load and environment
        base_temp = 20.0
        if node.environment == "underwater":
            base_temp = 5.0
            cooling_rate = 14.0
        elif node.environment == "desert":
            base_temp = 42.0
            cooling_rate = 8.0
        else: # space
            base_temp = 18.0
            cooling_rate = 6.0
            
        temp = base_temp + (load * 30.0) - (cooling_rate * 0.5) + np.random.normal(0, 1.2)
        temp = max(-5.0, min(100.0, temp))
        
        # Flux intensity can fluctuate due to random solar activity bursts
        flux = effective_flux * (1.0 + np.random.exponential(0.3))
        
        # Errors based on Poisson draw
        rate_err = flux * (0.8 if node.device_type == "VRAM" else 0.2)
        ecc_corr = int(np.random.poisson(rate_err * 2.0))
        # 3% chance of uncorrectable errors under higher fluxes
        ecc_uncorr = 0
        if ecc_corr > 2 and np.random.rand() < 0.05:
            ecc_uncorr = int(np.random.poisson(0.2) + 1)
            
        logs.append({
            "node_id": node.id,
            "timestamp": timestamp,
            "temperature": round(temp, 2),
            "radiation_flux": round(flux, 3),
            "ecc_correctable": ecc_corr,
            "ecc_uncorrectable": ecc_uncorr,
            "checkpoint_cost": 2.0,
            "node_load": round(load, 2)
        })
        
    return logs
