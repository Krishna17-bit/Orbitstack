import os
import json
import shutil
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import Node, TelemetryLog, MLPrediction
from app.services.ml_training import train_local_models, REGISTRY_DIR
from app.services.predictive_ml import predict_failures, get_ml_status_details, load_registered_models

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        # Seed a test node
        node = Node(
            id=1,
            name="test-node-1",
            environment="space",
            region="LEO",
            shielding=2.0,
            device_type="VRAM",
            status="online",
            load=0.5
        )
        db.add(node)
        db.commit()
        
        # Seed initial telemetry log
        log = TelemetryLog(
            node_id=1,
            temperature=30.0,
            radiation_flux=1.0,
            ecc_correctable=2,
            ecc_uncorrectable=0,
            node_load=0.5
        )
        db.add(log)
        db.commit()
        
        yield db
    finally:
        db.close()

def test_ml_training_creates_model():
    # Make sure we clean registry before running
    if os.path.exists(REGISTRY_DIR):
        # Keep backup just in case
        pass
        
    report = train_local_models(count=100) # Small sample size for speed
    assert report["dataset_size"] == 100
    assert "node_failure_next_24h" in report["targets"]
    
    # Assert physical model files were created
    assert os.path.exists(os.path.join(REGISTRY_DIR, "node_failure_next_24h.joblib"))
    assert os.path.exists(os.path.join(REGISTRY_DIR, "ecc_burst_next_24h.joblib"))
    assert os.path.exists(os.path.join(REGISTRY_DIR, "thermal_runaway_next_24h.joblib"))
    assert os.path.exists(os.path.join(REGISTRY_DIR, "report.json"))
    assert os.path.exists(os.path.join(REGISTRY_DIR, "report.md"))

def test_model_registry_loads_model():
    models = load_registered_models()
    assert "node_failure_next_24h" in models
    assert "ecc_burst_next_24h" in models
    assert "thermal_runaway_next_24h" in models

def test_prediction_uses_model_when_available(db_session):
    # Ensure models are trained/loaded
    train_local_models(count=100)
    
    pred = predict_failures(db_session, 1)
    assert pred["node_id"] == 1
    assert pred["model_status"] == "REAL MODEL LOADED"
    assert pred["confidence_score"] == 0.95

def test_rule_based_fallback_when_model_missing(db_session):
    # Temp delete model files to force fallback
    paths_to_restore = {}
    targets = ["node_failure_next_24h", "ecc_burst_next_24h", "thermal_runaway_next_24h"]
    
    for t in targets:
        p = os.path.join(REGISTRY_DIR, f"{t}.joblib")
        if os.path.exists(p):
            backup_p = os.path.join(REGISTRY_DIR, f"{t}.joblib.bak")
            shutil.move(p, backup_p)
            paths_to_restore[p] = backup_p
            
    try:
        pred = predict_failures(db_session, 1)
        assert pred["model_status"] == "RULE-BASED FALLBACK"
        assert pred["confidence_score"] == 0.50
    finally:
        # Restore backups
        for orig, backup in paths_to_restore.items():
            if os.path.exists(backup):
                shutil.move(backup, orig)

def test_training_report_contains_metrics():
    report_path = os.path.join(REGISTRY_DIR, "report.json")
    assert os.path.exists(report_path)
    
    with open(report_path, "r") as f:
        report = json.load(f)
        
    assert "dataset_size" in report
    assert "targets" in report
    for target in ["node_failure_next_24h", "ecc_burst_next_24h", "thermal_runaway_next_24h"]:
        assert target in report["targets"]
        tgt_metrics = report["targets"][target]
        assert "accuracy" in tgt_metrics
        assert "f1_score" in tgt_metrics
        assert "auc" in tgt_metrics
        assert "feature_importances" in tgt_metrics
