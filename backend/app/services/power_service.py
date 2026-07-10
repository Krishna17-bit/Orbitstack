import time
import math
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Node, PowerState, DigitalTwin, ThermalLog
from typing import List, Dict, Any

# Global toggle for power-aware scheduler
_power_scheduler_enabled = True

def get_eclipse_status() -> Dict[str, Any]:
    """
    Returns the current simulated Sunlight/Eclipse status based on time.
    Alternates every 30 seconds to make the UI active and dynamic.
    """
    current_sec = int(time.time())
    cycle_pos = current_sec % 60
    is_eclipse = cycle_pos >= 30
    time_remaining = 30 - (cycle_pos % 30)
    
    return {
        "is_eclipse": is_eclipse,
        "phase_name": "ECLIPSE (Earth Shadow)" if is_eclipse else "SUNLIGHT (Active Charging)",
        "seconds_remaining": time_remaining,
        "solar_constant_w_m2": 0.0 if is_eclipse else 1361.0
    }

def toggle_power_scheduler(enabled: bool) -> bool:
    global _power_scheduler_enabled
    _power_scheduler_enabled = enabled
    return _power_scheduler_enabled

def is_power_scheduler_enabled() -> bool:
    return _power_scheduler_enabled

def simulate_power_tick(db: Session) -> List[PowerState]:
    """
    Runs a physics-based simulation step for all nodes' battery and power systems.
    Computes Sunlight solar charging, Eclipse discharge, and thermal resistance scaling.
    """
    nodes = db.query(Node).all()
    eclipse_info = get_eclipse_status()
    is_eclipse = eclipse_info["is_eclipse"]
    
    updated_states = []
    
    for node in nodes:
        # 1. Get or create PowerState record
        power_state = db.query(PowerState).filter(PowerState.node_id == node.id).first()
        if not power_state:
            power_state = PowerState(
                node_id=node.id,
                battery_soc=100.0,
                battery_soh=100.0,
                solar_generation=50.0,
                battery_temperature=20.0,
                internal_resistance=0.02,
                timestamp=datetime.utcnow()
            )
            db.add(power_state)
            db.commit()
            db.refresh(power_state)
            
        # Calculate time delta (seconds) since last update, cap at 10s to prevent simulation explosions
        now = datetime.utcnow()
        time_delta = (now - power_state.timestamp).total_seconds()
        if time_delta <= 0:
            time_delta = 1.0
        time_delta = min(time_delta, 10.0)
        
        # 2. Get node physical parameters (TID and temperature from Twin)
        twin = db.query(DigitalTwin).filter(DigitalTwin.node_id == node.id).first()
        rad_dose = twin.radiation_dose if twin else 0.0
        node_temp = twin.current_temperature if twin else 25.0
        
        # 3. Simulate solar panels generation
        if is_eclipse:
            solar_gen = 0.0
        else:
            # Solar panels degrade under radiation (TID)
            # 50 krad reduces panels by ~70%
            panel_efficiency = max(0.1, 1.0 - (rad_dose / 75.0))
            solar_gen = 80.0 * panel_efficiency * (1.1 if node.region == "GEO" else 0.9)
            
        # 4. Simulate node power consumption
        # Base CPU draw is 15W, scales up to 55W at max workload load
        cpu_draw = 15.0 + (node.load * 40.0)
        
        # If power scheduler is enabled, and battery is critically low (< 25%), throttle node
        if _power_scheduler_enabled and power_state.battery_soc < 25.0:
            node.load = 0.05
            node.status = "degraded"
            cpu_draw = 17.0  # throttled consumption
            
        # 5. Compute battery State of Charge (SOC)
        # Net wattage: solar_gen - cpu_draw
        # 100% capacity = 200 Watt-hours (720,000 Joules)
        capacity_ws = 200.0 * 3600.0
        net_energy_j = (solar_gen - cpu_draw) * time_delta
        
        new_soc = power_state.battery_soc + (net_energy_j / capacity_ws) * 100.0
        power_state.battery_soc = max(0.0, min(100.0, new_soc))
        
        # 6. Simulate battery temperature and internal resistance
        # Battery temp is driven by CPU temp and current draw heat dissipation
        battery_temp = node_temp + (cpu_draw * 0.15)
        # Add orbital ambient effect
        if is_eclipse:
            battery_temp = max(-10.0, battery_temp - 5.0)
        else:
            battery_temp = min(85.0, battery_temp + 5.0)
            
        power_state.battery_temperature = round(battery_temp, 2)
        
        # CMOS internal resistance increases exponentially with temperature
        r_int = 0.01 + 0.00015 * math.exp((battery_temp - 20.0) / 15.0)
        power_state.internal_resistance = round(r_int, 4)
        
        # 7. State of Health (SOH) degrades with thermal extremes and charge cycles
        # Thermal cycling stress factor
        temp_stress = abs(battery_temp - 25.0) * 0.000002
        soh_loss = (temp_stress + (cpu_draw * 0.0000001)) * time_delta
        power_state.battery_soh = max(25.0, round(power_state.battery_soh - soh_loss, 4))
        
        # Save updates
        power_state.solar_generation = round(solar_gen, 1)
        power_state.timestamp = now
        updated_states.append(power_state)
        
    db.commit()
    return updated_states

def perform_rejuvenation(db: Session, node_id: int) -> PowerState:
    """
    Rejuvenates the power system:
    1. Anneals solar panels (restores some efficiency lost from radiation)
    2. Recalibrates battery (boosts SOH slightly and charges to 100%)
    """
    power_state = db.query(PowerState).filter(PowerState.node_id == node_id).first()
    if not power_state:
        raise ValueError("PowerState record not found.")
        
    power_state.battery_soc = 100.0
    power_state.battery_soh = min(100.0, power_state.battery_soh + 10.0)
    power_state.timestamp = datetime.utcnow()
    
    # Also clean some radiation dose in the digital twin to simulate panel annealing
    twin = db.query(DigitalTwin).filter(DigitalTwin.node_id == node_id).first()
    if twin:
        twin.radiation_dose = max(0.0, twin.radiation_dose - 15.0)
        
    db.commit()
    return power_state
