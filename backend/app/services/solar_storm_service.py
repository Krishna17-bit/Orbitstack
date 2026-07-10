import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import SolarStormEvent, Node, PowerState
from typing import List, Dict, Any

# In-memory current storm cache for fast lookup
_current_storm: Dict[str, Any] = {
    "flare_class": "C",
    "intensity": 1.0,
    "status": "resolved",
    "base_flux": 1.0,
    "solar_wind_speed": 400.0,
    "active_mitigations": []
}

def trigger_cme_storm(db: Session, flare_class: str, intensity: float) -> SolarStormEvent:
    """
    Triggers a Coronal Mass Ejection (CME) solar storm.
    Increases radiation flux on all nodes and runs emergency mitigation runbooks.
    """
    global _current_storm
    
    # 1. Update in-memory state
    _current_storm["flare_class"] = flare_class
    _current_storm["intensity"] = intensity
    _current_storm["status"] = "active"
    
    # G1-G5 flux multiplier mapping
    flux_mult = 1.0
    if flare_class == "X":
        flux_mult = 1000.0 * intensity
        _current_storm["solar_wind_speed"] = 1200.0 + (intensity * 100.0)
    elif flare_class == "M":
        flux_mult = 100.0 * intensity
        _current_storm["solar_wind_speed"] = 800.0 + (intensity * 50.0)
    else:
        flux_mult = 5.0 * intensity
        _current_storm["solar_wind_speed"] = 500.0
        
    _current_storm["base_flux"] = flux_mult
    
    # Determine appropriate runbooks based on class
    mitigations = []
    if flare_class == "X" and intensity >= 3.0:
        mitigations = ["Standby Safe Mode", "Active Magnetic Shielding", "Cryo-Cooling Loops"]
    elif flare_class == "X" or (flare_class == "M" and intensity >= 4.0):
        mitigations = ["Active Magnetic Shielding", "Cryo-Cooling Loops"]
    else:
        mitigations = ["Cryo-Cooling Loops"]
        
    _current_storm["active_mitigations"] = mitigations
    
    # 2. Persist storm record
    db_event = SolarStormEvent(
        flare_class=flare_class,
        intensity=intensity,
        status="active",
        mitigations_active=json.dumps(mitigations),
        timestamp=datetime.utcnow()
    )
    db.add(db_event)
    
    # 3. Apply mitigation actions on database nodes
    nodes = db.query(Node).all()
    for node in nodes:
        if "Standby Safe Mode" in mitigations:
            node.load = 0.02
            node.status = "degraded"
        elif "Active Magnetic Shielding" in mitigations:
            node.load = min(1.0, node.load + 0.15)  # draws more power
            node.status = "online"
            
        # Draw power for active shielding in node battery states
        power_state = db.query(PowerState).filter(PowerState.node_id == node.id).first()
        if power_state and "Active Magnetic Shielding" in mitigations:
            power_state.battery_soc = max(0.0, power_state.battery_soc - 5.0)  # quick power drain
            
    db.commit()
    db.refresh(db_event)
    return db_event

def get_current_solar_status() -> Dict[str, Any]:
    return _current_storm

def resolve_solar_storm(db: Session):
    """
    Resolves the current storm, returning nodes to normal operational loads.
    """
    global _current_storm
    _current_storm["flare_class"] = "C"
    _current_storm["intensity"] = 1.0
    _current_storm["status"] = "resolved"
    _current_storm["base_flux"] = 1.0
    _current_storm["solar_wind_speed"] = 400.0
    _current_storm["active_mitigations"] = []
    
    active_storms = db.query(SolarStormEvent).filter(SolarStormEvent.status == "active").all()
    for storm in active_storms:
        storm.status = "resolved"
        
    nodes = db.query(Node).all()
    for node in nodes:
        node.status = "online"
        node.load = 0.5  # reset to nominal load
        
    db.commit()
