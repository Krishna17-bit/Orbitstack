from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.models import Node, ThermalLog
from app.schemas.schemas import ThermalLogResponse, ThermalRun
from app.services.thermal import calculate_next_temperature, generate_thermal_heatmap

router = APIRouter(prefix="/thermal", tags=["Thermal Engine"])

@router.post("/run/{node_id}", response_model=ThermalLogResponse)
def run_thermal_step(node_id: int, run_data: ThermalRun, db: Session = Depends(get_db)):
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    # Get last thermal log
    last_log = db.query(ThermalLog).filter(ThermalLog.node_id == node_id).order_by(ThermalLog.timestamp.desc()).first()
    
    current_temp = last_log.temperature if last_log else 25.0
    prev_fatigue = last_log.fatigue_factor if last_log else 0.0
    
    # Calculate next temp
    new_temp, cooling_eff, new_fatigue = calculate_next_temperature(
        current_temp,
        run_data.compute_load,
        node.environment,
        prev_fatigue
    )
    
    # Update node load
    node.load = run_data.compute_load
    
    # Record thermal log
    log_entry = ThermalLog(
        node_id=node.id,
        temperature=new_temp,
        fatigue_factor=new_fatigue,
        cooling_efficiency=cooling_eff,
        timestamp=datetime.utcnow()
    )
    
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

@router.get("/history/{node_id}", response_model=list[ThermalLogResponse])
def get_thermal_history(node_id: int, db: Session = Depends(get_db)):
    return db.query(ThermalLog).filter(ThermalLog.node_id == node_id).order_by(ThermalLog.timestamp.desc()).limit(50).all()

@router.get("/heatmap/{node_id}")
def get_node_heatmap(node_id: int, db: Session = Depends(get_db)):
    last_log = db.query(ThermalLog).filter(ThermalLog.node_id == node_id).order_by(ThermalLog.timestamp.desc()).first()
    center_temp = last_log.temperature if last_log else 25.0
    
    heatmap = generate_thermal_heatmap(center_temp)
    return {"node_id": node_id, "heatmap": heatmap}
