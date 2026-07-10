from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Node, ThermalLog, EccLog, FaultSim, DigitalTwin, RiskHistory, MLPrediction

def calculate_global_risk(db: Session) -> RiskHistory:
    """
    Analyzes cluster elements, computes the individual risk factors,
    and returns a composite Global Cluster Risk score.
    """
    nodes = db.query(Node).all()
    if not nodes:
        return RiskHistory(timestamp=datetime.utcnow())

    # 1. Thermal Risk
    temps = []
    for n in nodes:
        last_t = db.query(ThermalLog).filter(ThermalLog.node_id == n.id).order_by(ThermalLog.timestamp.desc()).first()
        if last_t:
            temps.append(last_t.temperature)
    avg_temp = sum(temps) / len(temps) if temps else 25.0
    thermal_risk = min(100.0, max(5.0, (avg_temp - 15.0) * 1.5))

    # 2. Radiation Risk
    fluxes = []
    for n in nodes:
        last_f = db.query(FaultSim).filter(FaultSim.node_id == n.id).order_by(FaultSim.timestamp.desc()).first()
        if last_f:
            fluxes.append(last_f.intensity)
    avg_flux = sum(fluxes) / len(fluxes) if fluxes else 1.0
    radiation_risk = min(100.0, max(5.0, avg_flux * 8.0))

    # 3. ECC Risk
    ecc_logs = db.query(EccLog).order_by(EccLog.timestamp.desc()).limit(20).all()
    total_ecc_uncorr = sum(e.uncorrectable_errors for e in ecc_logs)
    ecc_risk = min(100.0, max(5.0, total_ecc_uncorr * 20.0))

    # 4. Topology Risk
    offline_nodes = len([n for n in nodes if n.status == "offline"])
    degraded_nodes = len([n for n in nodes if n.status == "degraded"])
    topology_risk = min(100.0, max(5.0, (offline_nodes * 25.0) + (degraded_nodes * 10.0)))

    # 5. Aging Risk
    twins = db.query(DigitalTwin).all()
    degradations = [t.degradation_score for t in twins]
    aging_risk = sum(degradations) / len(degradations) if degradations else 10.0

    # 6. Mission Risk (derived from prediction models)
    preds = db.query(MLPrediction).order_by(MLPrediction.timestamp.desc()).limit(10).all()
    failure_probs = [p.next_failure_probability for p in preds]
    mission_risk = (sum(failure_probs) / len(failure_probs) * 100.0) if failure_probs else 15.0

    # Composite Score
    # w_1=0.2, w_2=0.2, w_3=0.2, w_4=0.15, w_5=0.15, w_6=0.1
    composite_score = (
        thermal_risk * 0.20 +
        radiation_risk * 0.20 +
        ecc_risk * 0.20 +
        topology_risk * 0.15 +
        aging_risk * 0.15 +
        mission_risk * 0.10
    )
    composite_score = float(round(min(100.0, max(5.0, composite_score)), 1))

    risk_entry = RiskHistory(
        cluster_risk_score=composite_score,
        thermal_risk=round(float(thermal_risk), 1),
        radiation_risk=round(float(radiation_risk), 1),
        ecc_risk=round(float(ecc_risk), 1),
        topology_risk=round(float(topology_risk), 1),
        mission_risk=round(float(mission_risk), 1),
        aging_risk=round(float(aging_risk), 1),
        timestamp=datetime.utcnow()
    )
    
    db.add(risk_entry)
    db.commit()
    db.refresh(risk_entry)
    return risk_entry
