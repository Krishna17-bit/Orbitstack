import os
import json
import joblib
import numpy as np
from datetime import datetime
from sqlalchemy.orm import Session
from sklearn.ensemble import RandomForestClassifier
from app.models.models import Node, TelemetryLog, MLPrediction, DigitalTwin
from app.services.telemetry_generator import generate_node_telemetry_history
from app.services.digital_twin import TwinManager

REGISTRY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models", "registry"))

INPUT_FEATURES = [
    "current_temperature",
    "mean_temperature_24h",
    "thermal_cycles",
    "radiation_dose",
    "seu_count",
    "ecc_error_count",
    "multi_bit_error_count",
    "uptime_hours",
    "shielding_mm",
    "orbit_region_encoded",
    "redundancy_level",
    "checkpoint_interval",
    "workload_intensity",
    "topology_blast_radius",
    "previous_failures"
]

MODEL_REGISTRY = {}
FEATURE_NAMES = ["temperature", "radiation_flux", "ecc_correctable", "ecc_uncorrectable", "node_load"]

REGION_MAPPING = {
    "LEO": 0, "GEO": 1, "SAA": 2, "Lunar": 3, 
    "Deep Space": 4, "Mariana Trench": 5, "Sahara": 6
}

def load_registered_models() -> dict:
    """
    Attempts to load the joblib serialized models from the local registry.
    Returns:
        A dict of loaded model objects, or empty dict if any model is missing.
    """
    models = {}
    targets = [
        "node_failure_next_24h",
        "ecc_burst_next_24h",
        "thermal_runaway_next_24h"
    ]
    
    try:
        # Check report.json exists
        report_path = os.path.join(REGISTRY_DIR, "report.json")
        if not os.path.exists(report_path):
            return {}
            
        for target in targets:
            model_path = os.path.join(REGISTRY_DIR, f"{target}.joblib")
            if not os.path.exists(model_path):
                return {}
            models[target] = joblib.load(model_path)
            
        return models
    except Exception:
        return {}

def get_ml_status_details() -> dict:
    """
    Retrieves load status, F1 scores, AUC and sample count from report.json.
    """
    report_path = os.path.join(REGISTRY_DIR, "report.json")
    models = load_registered_models()
    
    if not models or not os.path.exists(report_path):
        return {
            "loaded": False,
            "status": "RULE-BASED FALLBACK",
            "model_type": "N/A",
            "dataset_size": 0,
            "training_timestamp": None,
            "f1_score": 0.0,
            "auc": 0.0,
            "top_features": []
        }
        
    try:
        with open(report_path, "r") as f:
            report = json.load(f)
            
        # Compile average metrics
        f1_list = []
        auc_list = []
        model_types = []
        all_features = {}
        
        for tgt, metrics in report["targets"].items():
            f1_list.append(metrics["f1_score"])
            auc_list.append(metrics["auc"])
            model_types.append(metrics["model_type"])
            for feat, imp in metrics["feature_importances"].items():
                all_features[feat] = all_features.get(feat, 0.0) + imp
                
        # Sorted aggregate feature importances
        sorted_features = sorted(all_features.items(), key=lambda x: x[1], reverse=True)
        top_features = [{"feature": f, "importance": round(imp / 3.0, 3)} for f, imp in sorted_features[:5]]
        
        return {
            "loaded": True,
            "status": "REAL MODEL LOADED",
            "model_type": model_types[0] if model_types else "RandomForestClassifier",
            "dataset_size": report["dataset_size"],
            "training_timestamp": report["timestamp"],
            "f1_score": float(np.mean(f1_list)),
            "auc": float(np.mean(auc_list)),
            "top_features": top_features
        }
    except Exception:
        return {
            "loaded": False,
            "status": "RULE-BASED FALLBACK",
            "model_type": "N/A",
            "dataset_size": 0,
            "training_timestamp": None,
            "f1_score": 0.0,
            "auc": 0.0,
            "top_features": []
        }

def train_models(db: Session) -> dict:
    """
    Legacy in-memory baseline trainer (for backwards compatibility).
    """
    from app.services.ml_training import train_local_models
    try:
        report = train_local_models(count=1000)
        return {"status": "success", "models": {t: "trained" for t in report["targets"]}, "samples": 1000}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def predict_failures(db: Session, node_id: int) -> dict:
    """
    Computes failure risk probabilities for a node. Utilizes serialized local
    ML models if available, otherwise falls back to dynamic rule-based scoring.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise ValueError("Node not found")

    # Fetch/Create Digital Twin for telemetry/state attributes
    twin = TwinManager.get_or_create_twin(db, node_id)
    
    last_log = db.query(TelemetryLog).filter(TelemetryLog.node_id == node_id).order_by(TelemetryLog.timestamp.desc()).first()
    if not last_log:
        last_log = TelemetryLog(
            node_id=node_id,
            temperature=25.0,
            radiation_flux=1.0,
            ecc_correctable=0,
            ecc_uncorrectable=0,
            node_load=0.5
        )

    logs = db.query(TelemetryLog).filter(TelemetryLog.node_id == node_id).all()
    mean_temp = float(np.mean([l.temperature for l in logs])) if logs else last_log.temperature

    models = load_registered_models()
    
    if models:
        # Construct 15-dimensional input vector
        encoded_region = REGION_MAPPING.get(node.region, 0)
        
        features = np.array([[
            last_log.temperature,
            mean_temp,
            twin.thermal_cycles,
            twin.radiation_dose,
            twin.seu_count,
            twin.ecc_error_count,
            twin.hard_failure_count, # multi-bit
            twin.total_uptime,
            node.shielding,
            encoded_region,
            twin.redundancy_level,
            120.0, # checkpoint interval default
            node.load,
            1.5, # blast radius default
            twin.hard_failure_count
        ]])
        
        # Inference using trained classifiers
        prob_fail = float(models["node_failure_next_24h"].predict_proba(features)[0][1])
        prob_ecc = float(models["ecc_burst_next_24h"].predict_proba(features)[0][1])
        prob_therm = float(models["thermal_runaway_next_24h"].predict_proba(features)[0][1])
        
        # Solar SEU spike correlation
        prob_seu = float(min(0.95, last_log.radiation_flux * 0.08))
        prob_checkpoint_loss = float(min(0.99, prob_fail * 1.1))
        
        # Pull feature importances for SHAP display
        importances = models["node_failure_next_24h"].feature_importances_
        contributions = {}
        
        raw_vals = [
            last_log.temperature, mean_temp, twin.thermal_cycles, twin.radiation_dose,
            twin.seu_count, twin.ecc_error_count, twin.hard_failure_count, twin.total_uptime,
            node.shielding, encoded_region, twin.redundancy_level, 120.0, node.load, 1.5, twin.hard_failure_count
        ]
        # Normalize weights
        norms = [80.0, 80.0, 50.0, 20.0, 100.0, 100.0, 5.0, 5000.0, 10.0, 7.0, 3.0, 240.0, 1.0, 5.0, 5.0]
        
        for name, val, norm, imp in zip(INPUT_FEATURES, raw_vals, norms, importances):
            rel_val = val / norm if norm > 0 else 0
            contributions[name] = float(rel_val * imp)
            
        total_contrib = sum(contributions.values()) or 1.0
        # Reduce to top 5 feature mappings for simpler chart visualization
        shap_explanations = {k: round((v / total_contrib) * 100, 2) for k, v in contributions.items()}
        
        model_status = "REAL MODEL LOADED"
        confidence_score = 0.95
    else:
        # Fallback to rule-based logic
        prob_fail = 0.15 if twin.degradation_score < 40 else 0.55
        prob_therm = 0.10 if last_log.temperature < 65 else 0.75
        prob_ecc = 0.05 if last_log.ecc_correctable < 10 else 0.65
        prob_seu = float(min(0.95, last_log.radiation_flux * 0.08))
        prob_checkpoint_loss = float(min(0.99, prob_fail * 1.2))
        
        # Static feature relevance breakdown for rule fallback
        shap_explanations = {
            "current_temperature": 35.0,
            "radiation_dose": 25.0,
            "ecc_error_count": 20.0,
            "seu_count": 15.0,
            "uptime_hours": 5.0
        }
        
        model_status = "RULE-BASED FALLBACK"
        confidence_score = 0.50

    # Determine risk alert reasons
    risk_factors = []
    if last_log.temperature > 65.0:
        risk_factors.append("Thermal threshold exceedance")
    if last_log.radiation_flux > 4.0:
        risk_factors.append("Cosmic ray radiation flux spike")
    if last_log.ecc_correctable > 15:
        risk_factors.append("ECC error count accelerating")
    if not risk_factors:
        risk_factors.append("Nominal background degradation drift")

    risk_score = (prob_fail * 0.4 + prob_therm * 0.3 + prob_ecc * 0.2 + prob_seu * 0.1) * 100.0
    risk_score = round(min(100.0, max(5.0, risk_score)), 1)
    
    # Save Prediction log to DB
    prediction = MLPrediction(
        node_id=node.id,
        next_failure_probability=prob_fail,
        thermal_runaway_probability=prob_therm,
        ecc_burst_probability=prob_ecc,
        seu_spike_probability=prob_seu,
        checkpoint_loss_probability=prob_checkpoint_loss,
        risk_score=risk_score,
        top_risk_factors=json.dumps(risk_factors),
        confidence_score=confidence_score,
        timestamp=datetime.utcnow()
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    # Sync twin telemetry parameters
    TwinManager.update_twin_telemetry(
        db, 
        node_id, 
        last_log.temperature, 
        last_log.node_load, 
        new_seus=int(last_log.ecc_correctable / 5), 
        new_eccs=last_log.ecc_correctable
    )

    return {
        "node_id": node_id,
        "risk_score": risk_score,
        "failure_probability": round(prob_fail, 3),
        "thermal_probability": round(prob_therm, 3),
        "ecc_probability": round(prob_ecc, 3),
        "seu_probability": round(prob_seu, 3),
        "checkpoint_loss_probability": round(prob_checkpoint_loss, 3),
        "top_risk_factors": risk_factors,
        "shap_explanations": shap_explanations,
        "confidence_score": confidence_score,
        "model_status": model_status
    }

def risk_rank_nodes(db: Session) -> list[dict]:
    """
    Retrieves and ranks all cluster nodes by predicted failure probability.
    """
    nodes = db.query(Node).all()
    ranked = []
    
    for node in nodes:
        try:
            pred = predict_failures(db, node.id)
            ranked.append({
                "node_id": node.id,
                "name": node.name,
                "region": node.region,
                "device_type": node.device_type,
                "status": node.status,
                "risk_score": pred["risk_score"],
                "failure_probability": pred["failure_probability"]
            })
        except Exception:
            ranked.append({
                "node_id": node.id,
                "name": node.name,
                "region": node.region,
                "device_type": node.device_type,
                "status": node.status,
                "risk_score": 10.0,
                "failure_probability": 0.10
            })
            
    ranked.sort(key=lambda x: x["risk_score"], reverse=True)
    return ranked
