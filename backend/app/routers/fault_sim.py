from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.models import Node, FaultSim, EccLog
from app.schemas.schemas import FaultSimResponse, FaultSimTrigger
from app.services.fault_sim import calculate_predicted_fault_rate, simulate_seu_memory_map
from app.services.ecc import evaluate_ecc_health

router = APIRouter(prefix="/fault-sim", tags=["Fault Simulator"])

@router.post("/run/{node_id}", response_model=FaultSimResponse)
def run_simulation(node_id: int, trigger: FaultSimTrigger, db: Session = Depends(get_db)):
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    # Calculate physics rate
    predicted_rate = calculate_predicted_fault_rate(node.device_type, node.region, node.shielding)
    # Multiply by manual intensity adjustment
    adjusted_rate = predicted_rate * trigger.intensity
    
    # Fetch last simulation map
    last_sim = db.query(FaultSim).filter(FaultSim.node_id == node_id).order_by(FaultSim.timestamp.desc()).first()
    last_map = last_sim.memory_map if last_sim else None
    
    # Run simulation
    new_map, correctable, uncorrectable = simulate_seu_memory_map(adjusted_rate, last_map)
    
    # Record FaultSim log
    sim_entry = FaultSim(
        node_id=node.id,
        intensity=trigger.intensity,
        predicted_fault_rate=adjusted_rate,
        memory_map=new_map,
        timestamp=datetime.utcnow()
    )
    db.add(sim_entry)
    
    # Record ECC log
    ecc_entry = EccLog(
        node_id=node.id,
        correctable_errors=correctable,
        uncorrectable_errors=uncorrectable,
        timestamp=datetime.utcnow()
    )
    
    # Update node status based on accumulated uncorrectable errors
    # Let's count all errors from history for this node in the last hour
    total_correctable = correctable
    total_uncorrectable = uncorrectable
    
    past_ecc = db.query(EccLog).filter(EccLog.node_id == node_id).all()
    for log in past_ecc:
        total_correctable += log.correctable_errors
        total_uncorrectable += log.uncorrectable_errors
        
    status, degradation = evaluate_ecc_health(total_correctable, total_uncorrectable)
    node.status = status
    ecc_entry.status = status
    db.add(ecc_entry)
    
    db.commit()
    db.refresh(sim_entry)
    return sim_entry

@router.get("/history/{node_id}", response_model=list[FaultSimResponse])
def get_simulation_history(node_id: int, db: Session = Depends(get_db)):
    return db.query(FaultSim).filter(FaultSim.node_id == node_id).order_by(FaultSim.timestamp.desc()).limit(50).all()
