from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.models import Node, FaultSim, ThermalLog, EccLog
from app.schemas.schemas import DashboardOverview

router = APIRouter(prefix="/dashboard", tags=["Dashboard Overview"])

@router.get("/overview", response_model=DashboardOverview)
def get_dashboard_overview(db: Session = Depends(get_db)):
    nodes = db.query(Node).all()
    total_nodes = len(nodes)
    active_nodes = len([n for n in nodes if n.status == "online"])
    
    # Thermals
    temps = []
    for n in nodes:
        last_t = db.query(ThermalLog).filter(ThermalLog.node_id == n.id).order_by(ThermalLog.timestamp.desc()).first()
        if last_t:
            temps.append(last_t.temperature)
    avg_temp = sum(temps) / len(temps) if temps else 25.0
    
    # Radiation exposure sum
    radiation_exposure = 0.0
    for n in nodes:
        last_f = db.query(FaultSim).filter(FaultSim.node_id == n.id).order_by(FaultSim.timestamp.desc()).first()
        if last_f:
            radiation_exposure += last_f.intensity
            
    # ECC Faults sum
    correctables = db.query(EccLog).all()
    cumulative_faults = sum(c.correctable_errors + c.uncorrectable_errors for c in correctables)
    
    # Calculate Cluster Risk Score (0-100)
    risk_score = 0.0
    offline_count = len([n for n in nodes if n.status == "offline"])
    degraded_count = len([n for n in nodes if n.status == "degraded"])
    
    risk_score += offline_count * 15.0
    risk_score += degraded_count * 5.0
    
    if avg_temp > 75.0:
        risk_score += 25.0
    elif avg_temp > 50.0:
        risk_score += 12.0
        
    recent_uncorrectable = len([c for c in correctables if c.uncorrectable_errors > 0])
    risk_score += recent_uncorrectable * 10.0
    risk_score = min(100.0, max(5.0, risk_score)) # Always at least 5% base risk in space
    
    # Generate Alerts
    alerts = []
    for n in nodes:
        if n.status == "offline":
            alerts.append({
                "severity": "critical",
                "node_name": n.name,
                "message": f"Node is OFFLINE. Thermal fatigue or multi-bit SEU corruption suspected.",
                "timestamp": datetime.utcnow().isoformat()
            })
        elif n.status == "degraded":
            alerts.append({
                "severity": "warning",
                "node_name": n.name,
                "message": f"Node is DEGRADED. Single-bit ECC correction anomalies detected.",
                "timestamp": datetime.utcnow().isoformat()
            })
            
    for t_val, n in zip(temps, nodes):
        if t_val > 80.0:
            alerts.append({
                "severity": "critical",
                "node_name": n.name,
                "message": f"Critical over-temperature: {t_val:.1f}°C. Radiative cooling efficiency degraded.",
                "timestamp": datetime.utcnow().isoformat()
            })
            
    return DashboardOverview(
        active_nodes=active_nodes,
        total_nodes=total_nodes,
        risk_score=round(risk_score, 1),
        average_temp=round(avg_temp, 1),
        radiation_exposure=round(radiation_exposure, 2),
        cumulative_faults=cumulative_faults,
        critical_alerts=alerts
    )
