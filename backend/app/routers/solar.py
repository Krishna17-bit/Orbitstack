from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import SolarStormTrigger, SolarStormResponse, SolarStatusResponse
from app.services.solar_storm_service import trigger_cme_storm, get_current_solar_status, resolve_solar_storm
from app.models.models import SolarStormEvent
from typing import List

router = APIRouter(prefix="/solar", tags=["Space Weather Reliability Controls"])

@router.post("/trigger", response_model=SolarStormResponse)
def trigger_solar_storm(payload: SolarStormTrigger, db: Session = Depends(get_db)):
    try:
        event = trigger_cme_storm(db, payload.flare_class, payload.intensity)
        return event
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to inject CME flare: {str(e)}")

@router.get("/status", response_model=SolarStatusResponse)
def get_solar_status():
    status = get_current_solar_status()
    return status

@router.post("/resolve")
def resolve_storm(db: Session = Depends(get_db)):
    try:
        resolve_solar_storm(db)
        return {"status": "success", "message": "Solar storm resolved. Core shielding restored."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events", response_model=List[SolarStormResponse])
def get_historical_events(db: Session = Depends(get_db)):
    events = db.query(SolarStormEvent).order_by(SolarStormEvent.timestamp.desc()).all()
    return events
