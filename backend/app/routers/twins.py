from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import DigitalTwin
from app.schemas.schemas import DigitalTwinResponse, TwinSnapshotResponse
from app.services.digital_twin import TwinManager

router = APIRouter(prefix="/twins", tags=["Digital Twin Engine"])

@router.post("/create/{node_id}", response_model=DigitalTwinResponse)
def create_twin(node_id: int, db: Session = Depends(get_db)):
    try:
        return TwinManager.get_or_create_twin(db, node_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/list", response_model=list[DigitalTwinResponse])
def list_twins(db: Session = Depends(get_db)):
    # Auto-seed twins if empty
    twins = db.query(DigitalTwin).all()
    if not twins:
        from app.models.models import Node
        nodes = db.query(Node).all()
        for node in nodes:
            TwinManager.get_or_create_twin(db, node.id)
        twins = db.query(DigitalTwin).all()
    return twins

@router.get("/{twin_id}", response_model=DigitalTwinResponse)
def get_twin(twin_id: int, db: Session = Depends(get_db)):
    twin = db.query(DigitalTwin).filter(DigitalTwin.id == twin_id).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital twin profile not found.")
    return twin

@router.post("/{twin_id}/snapshot", response_model=TwinSnapshotResponse)
def snapshot_twin(twin_id: int, db: Session = Depends(get_db)):
    twin = db.query(DigitalTwin).filter(DigitalTwin.id == twin_id).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital twin profile not found.")
    return TwinManager.create_snapshot(db, twin)

@router.get("/{twin_id}/timeline")
def get_twin_timeline(twin_id: int, db: Session = Depends(get_db)):
    twin = db.query(DigitalTwin).filter(DigitalTwin.id == twin_id).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital twin profile not found.")
    return TwinManager.replay_state_timeline(db, twin.id)

@router.get("/{twin_id}/replay")
def replay_twin_failures(twin_id: int, db: Session = Depends(get_db)):
    twin = db.query(DigitalTwin).filter(DigitalTwin.id == twin_id).first()
    if not twin:
        raise HTTPException(status_code=404, detail="Digital twin profile not found.")
    timeline = TwinManager.replay_state_timeline(db, twin.id)
    # Filter only snapshots that contain errors/faults to play back
    failures = [t for t in timeline if t["seus"] > 0 or t["hard_failures"] > 0]
    return {"twin_id": twin_id, "failure_events": failures}
