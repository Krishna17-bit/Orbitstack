from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import MissionRun
from app.schemas.schemas import MissionSimRequest, MissionSimResponse
from app.services.mission_planner import plan_mission

router = APIRouter(prefix="/mission", tags=["Mission Planner"])

@router.post("/simulate", response_model=MissionSimResponse)
def run_mission_simulation(req: MissionSimRequest, db: Session = Depends(get_db)):
    return plan_mission(
        db,
        req.name,
        req.node_count,
        req.orbit_type,
        req.duration_days,
        req.shielding_thickness,
        req.workload_intensity,
        req.redundancy_strategy
    )

@router.get("/runs", response_model=list[MissionSimResponse])
def get_mission_runs(db: Session = Depends(get_db)):
    return db.query(MissionRun).order_by(MissionRun.timestamp.desc()).all()
