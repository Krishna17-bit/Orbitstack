from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.models import Node, FaultSim, CheckpointPlan
from app.schemas.schemas import CheckpointPlanResponse, CheckpointCalcRequest
from app.services.checkpoint import calculate_optimal_checkpoint

router = APIRouter(prefix="/checkpoint", tags=["Checkpoint Planner"])

@router.post("/optimize/{node_id}", response_model=CheckpointPlanResponse)
def optimize_checkpoint(node_id: int, req: CheckpointCalcRequest, db: Session = Depends(get_db)):
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    # Get latest predicted fault rate
    last_sim = db.query(FaultSim).filter(FaultSim.node_id == node_id).order_by(FaultSim.timestamp.desc()).first()
    predicted_rate = last_sim.predicted_fault_rate if last_sim else 0.5
    
    optimal_interval, loss_reduction = calculate_optimal_checkpoint(
        predicted_rate,
        req.checkpoint_cost_mins
    )
    
    plan_entry = CheckpointPlan(
        node_id=node.id,
        optimal_interval=optimal_interval,
        expected_loss=loss_reduction,
        calculated_at=datetime.utcnow()
    )
    db.add(plan_entry)
    db.commit()
    db.refresh(plan_entry)
    return plan_entry

@router.get("/history/{node_id}", response_model=list[CheckpointPlanResponse])
def get_checkpoint_history(node_id: int, db: Session = Depends(get_db)):
    return db.query(CheckpointPlan).filter(CheckpointPlan.node_id == node_id).order_by(CheckpointPlan.calculated_at.desc()).limit(50).all()
