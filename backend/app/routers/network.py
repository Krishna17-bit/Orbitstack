from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.schemas import NetworkTopologyResponse, RouteTraceResponse
from app.services.network_simulator import get_network_topology, trace_route

router = APIRouter(prefix="/network", tags=["Inter-Satellite Link Network"])

@router.get("/topology", response_model=NetworkTopologyResponse)
def get_topology(db: Session = Depends(get_db)):
    try:
        return get_network_topology(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/route/{target_node_id}", response_model=RouteTraceResponse)
def get_route(target_node_id: int, db: Session = Depends(get_db)):
    try:
        res = trace_route(db, target_node_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
