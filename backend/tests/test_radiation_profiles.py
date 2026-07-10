import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import RadiationProfile
from app.services.radiation_data import calculate_attenuated_flux, estimate_radiation_dose, estimate_seu_rate, seed_radiation_profiles

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        seed_radiation_profiles(db)
        yield db
    finally:
        db.close()

def test_radiation_seeding(db_session):
    count = db_session.query(RadiationProfile).count()
    assert count == 3

def test_shielding_attenuation_materials():
    profile = RadiationProfile(
        name="Test",
        solar_cycle="Solar Max",
        geomagnetic_storm="Normal",
        gcr_flux=10.0,
        spe_flux=50.0
    )
    
    # Lead shielding attenuation should be higher than Aluminum for same thickness
    att_gcr_al, att_spe_al = calculate_attenuated_flux(profile, "aluminum", 3.0)
    att_gcr_pb, att_spe_pb = calculate_attenuated_flux(profile, "lead", 3.0)
    
    assert att_gcr_pb < att_gcr_al
    assert att_spe_pb < att_spe_al

def test_radiation_dose_and_seus():
    # Dose estimation
    dose = estimate_radiation_dose(10.0, 50.0, 24.0)
    assert dose > 0.0
    
    # SEU rates for SRAM vs DRAM
    seu_sram = estimate_seu_rate(2.0, 5.0, "SRAM")
    seu_dram = estimate_seu_rate(2.0, 5.0, "DRAM")
    
    assert seu_sram > seu_dram
