import numpy as np
from sqlalchemy.orm import Session
from app.models.models import RadiationProfile

SHIELDING_ATTENUATION = {
    "aluminum": 0.15,
    "polyethylene": 0.22,
    "lead": 0.35
}

DEVICE_CROSS_SECTION = {
    "DRAM": 0.05,
    "SRAM": 0.20,
    "VRAM": 0.50,
    "Rad-Hard": 0.001
}

def seed_radiation_profiles(db: Session):
    """
    Seeds SPENVIS/OLTARIS compatible profiles.
    """
    if db.query(RadiationProfile).count() > 0:
        return
        
    profiles = [
        RadiationProfile(
            name="GCR Solar Min (Peak Cosmic Ray Flux)",
            solar_cycle="Solar Min",
            geomagnetic_storm="Normal",
            gcr_flux=5.5,
            spe_flux=0.1,
            trapped_protons=2.5,
            trapped_electrons=4.0
        ),
        RadiationProfile(
            name="GCR Solar Max (Low Cosmic Ray, High Solar Activity)",
            solar_cycle="Solar Max",
            geomagnetic_storm="Normal",
            gcr_flux=2.0,
            spe_flux=1.2,
            trapped_protons=1.1,
            trapped_electrons=2.0
        ),
        RadiationProfile(
            name="SPE Carrington Event (Extreme Geomagnetic Storm)",
            solar_cycle="Solar Max",
            geomagnetic_storm="Storm",
            gcr_flux=1.5,
            spe_flux=250.0,
            trapped_protons=85.0,
            trapped_electrons=120.0
        )
    ]
    
    for p in profiles:
        db.add(p)
    db.commit()

def calculate_attenuated_flux(
    profile: RadiationProfile,
    material: str,
    thickness: float
) -> tuple[float, float]:
    """
    Computes attenuated GCR and SPE flux using exponential attenuation constants.
    """
    coef = SHIELDING_ATTENUATION.get(material.lower(), 0.15)
    
    # Attenuation: Flux = Flux_0 * e^(-coef * thickness)
    attenuated_gcr = profile.gcr_flux * np.exp(-coef * thickness)
    attenuated_spe = profile.spe_flux * np.exp(-coef * thickness)
    
    return float(attenuated_gcr), float(attenuated_spe)

def estimate_radiation_dose(
    attenuated_gcr: float,
    attenuated_spe: float,
    duration_hours: float
) -> float:
    """
    Estimates total radiation dose absorbed in Rads.
    GCR flux dose multiplier is higher due to high-Z heavy ions (HZE particles).
    """
    gcr_rad_per_hour = attenuated_gcr * 0.005
    spe_rad_per_hour = attenuated_spe * 0.001
    
    total_rads = (gcr_rad_per_hour + spe_rad_per_hour) * duration_hours
    return float(total_rads)

def estimate_seu_rate(
    attenuated_gcr: float,
    attenuated_spe: float,
    device_type: str
) -> float:
    """
    Calculates errors/hour given the attenuated flux and device sensitivity.
    """
    sensitivity = DEVICE_CROSS_SECTION.get(device_type, 0.1)
    total_flux = attenuated_gcr + attenuated_spe
    
    return float(total_flux * sensitivity)
