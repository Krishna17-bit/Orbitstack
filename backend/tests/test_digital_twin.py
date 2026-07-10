import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import Node, DigitalTwin, TwinSnapshot
from app.services.digital_twin import TwinManager

@pytest.fixture(name="db_session")
def fixture_db_session():
    # In-memory SQLite for testing
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

def test_twin_creation_and_update(db_session):
    # Test auto get_or_create_twin
    twin = TwinManager.get_or_create_twin(db_session, 1)
    assert twin.node_id == 1
    assert twin.health_state == "online"
    assert twin.seu_count == 0
    
    # Test update_twin_telemetry
    updated = TwinManager.update_twin_telemetry(
        db_session, 
        node_id=1, 
        temperature=45.0, 
        load=0.7, 
        new_seus=10, 
        new_eccs=5, 
        new_hard_failures=0
    )
    
    assert updated.seu_count == 10
    assert updated.ecc_error_count == 5
    assert updated.current_temperature == 45.0
    assert updated.mtbf < 720.0  # MTBF should drop under errors
    assert updated.degradation_score > 0.0
    
    # Verify snapshot was created
    snapshot_count = db_session.query(TwinSnapshot).count()
    assert snapshot_count >= 1

def test_twin_timeline_and_drift(db_session):
    twin = TwinManager.get_or_create_twin(db_session, 1)
    
    # Multiple updates to verify trend
    TwinManager.update_twin_telemetry(db_session, 1, 40.0, 0.6, 5, 2, 0)
    TwinManager.update_twin_telemetry(db_session, 1, 42.0, 0.7, 10, 5, 0)
    TwinManager.update_twin_telemetry(db_session, 1, 44.0, 0.8, 15, 10, 1)
    
    timeline = TwinManager.replay_state_timeline(db_session, twin.id)
    assert len(timeline) >= 2
    
    drift = TwinManager.risk_drift(db_session, twin.id)
    assert isinstance(drift, float)
