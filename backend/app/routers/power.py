from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import PowerStateResponse, PowerSchedulerToggle
from app.services.power_service import (
    simulate_power_tick, 
    perform_rejuvenation, 
    toggle_power_scheduler, 
    is_power_scheduler_enabled, 
    get_eclipse_status
)
from typing import List, Dict, Any

router = APIRouter(prefix="/power", tags=["Solar-Battery Power Grid"])

@router.get("/status", response_model=List[PowerStateResponse])
def get_power_status(db: Session = Depends(get_db)):
    try:
        # Run a physics simulation tick before returning status
        states = simulate_power_tick(db)
        return states
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/eclipse")
def get_eclipse():
    return get_eclipse_status()

@router.post("/rejuvenate/{node_id}", response_model=PowerStateResponse)
def rejuvenate_node_power(node_id: int, db: Session = Depends(get_db)):
    try:
        state = perform_rejuvenation(db, node_id)
        return state
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scheduler")
def get_scheduler_status():
    return {"enabled": is_power_scheduler_enabled()}

@router.post("/scheduler/toggle")
def toggle_scheduler(payload: PowerSchedulerToggle):
    enabled = toggle_power_scheduler(payload.enabled)
    return {"status": "success", "enabled": enabled}
