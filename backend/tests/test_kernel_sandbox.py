import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import KernelProfile
from app.services.kernel_sandbox import simulate_kernel_faults, seed_kernel_profiles

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        seed_kernel_profiles(db)
        yield db
    finally:
        db.close()

def test_kernel_seeding(db_session):
    count = db_session.query(KernelProfile).count()
    assert count == 3

def test_kernel_fault_simulation(db_session):
    profile = db_session.query(KernelProfile).first()
    assert profile is not None
    
    # Run simulation step
    run = simulate_kernel_faults(
        db_session,
        profile_id=profile.id,
        bit_flips=15,
        register_corruptions=5
    )
    
    assert run.kernel_profile_id == profile.id
    assert run.simulated_bit_flips == 15
    assert run.simulated_register_corruptions == 5
    assert run.warp_divergence_multiplier > 1.0
    assert run.fault_impact_score > 0.0
    assert "critical_memory_zones" in run.__dict__
    assert "recovery_recommendations" in run.__dict__
