import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import MissionRun
from app.services.mission_planner import plan_mission

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_mission_planning_simulation(db_session):
    run = plan_mission(
        db_session,
        name="Test Flight 1",
        node_count=12,
        orbit_type="Deep Space",
        duration_days=90,
        shielding_thickness=2.5,
        workload_intensity=0.75,
        redundancy_strategy="TMR"
    )
    
    assert run.name == "Test Flight 1"
    assert run.expected_seus > 0.0
    assert run.estimated_survival_rate > 0.0
    assert run.checkpoint_costs > 0.0
    assert "redundancy_requirements" in run.__dict__
    
    # Assert new premium fields are set
    assert run.accumulated_tid_krad > 0.0
    assert run.sel_risk_multiplier >= 1.0
    assert run.adaptive_survival_rate >= run.estimated_survival_rate
    
    # Compare LEO vs Deep Space survival under simplex strategy
    run_leo = plan_mission(
        db_session,
        name="LEO Flight",
        node_count=1,
        orbit_type="LEO",
        duration_days=365,
        shielding_thickness=2.0,
        workload_intensity=0.5,
        redundancy_strategy="Simplex"
    )
    
    run_deep = plan_mission(
        db_session,
        name="Deep Space Flight",
        node_count=1,
        orbit_type="Deep Space",
        duration_days=365,
        shielding_thickness=2.0,
        workload_intensity=0.5,
        redundancy_strategy="Simplex"
    )
    
    # Deep Space survival rate should be lower due to higher radiation intensity
    assert run_deep.estimated_survival_rate < run_leo.estimated_survival_rate
    assert run_deep.accumulated_tid_krad > run_leo.accumulated_tid_krad
