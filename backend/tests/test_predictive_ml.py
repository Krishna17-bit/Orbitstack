import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import Node, TelemetryLog, MLPrediction
from app.services.predictive_ml import train_models, predict_failures, risk_rank_nodes

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
        yield db
    finally:
        db.close()

def test_ml_training_and_inference(db_session):
    # Train models
    train_res = train_models(db_session)
    assert train_res["status"] == "success"
    assert train_res["samples"] > 0
    
    # Predict failure
    pred = predict_failures(db_session, 1)
    assert pred["node_id"] == 1
    assert "risk_score" in pred
    assert "failure_probability" in pred
    assert "shap_explanations" in pred
    assert len(pred["top_risk_factors"]) > 0

def test_risk_ranking(db_session):
    # Add a second node
    node2 = Node(
        id=2,
        name="test-node-2",
        environment="space",
        region="Deep Space",
        shielding=1.0,
        device_type="DRAM",
        status="online",
        load=0.8
    )
    db_session.add(node2)
    db_session.commit()
    
    # Rank nodes
    rankings = risk_rank_nodes(db_session)
    assert len(rankings) == 2
    # The first node in list should have a higher or equal risk
    assert rankings[0]["risk_score"] >= rankings[1]["risk_score"]
