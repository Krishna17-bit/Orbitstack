from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import RadiationProfile
from app.schemas.schemas import RadiationProfileResponse
from app.services.radiation_data import calculate_attenuated_flux, estimate_radiation_dose, estimate_seu_rate, seed_radiation_profiles

router = APIRouter(prefix="/radiation-library", tags=["Space Radiation Data Layer"])

@router.get("/profiles", response_model=list[RadiationProfileResponse])
def get_radiation_profiles(db: Session = Depends(get_db)):
    seed_radiation_profiles(db)
    return db.query(RadiationProfile).all()

@router.get("/calculate")
def get_shielding_attenuation(
    profile_id: int,
    material: str = "aluminum",
    thickness: float = 2.0,
    device_type: str = "VRAM",
    duration_hours: float = 24.0,
    db: Session = Depends(get_db)
):
    profile = db.query(RadiationProfile).filter(RadiationProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Radiation profile not found.")
        
    att_gcr, att_spe = calculate_attenuated_flux(profile, material, thickness)
    dose = estimate_radiation_dose(att_gcr, att_spe, duration_hours)
    seu_rate = estimate_seu_rate(att_gcr, att_spe, device_type)
    
    return {
        "profile_name": profile.name,
        "material": material,
        "thickness": thickness,
        "attenuated_gcr_flux": round(att_gcr, 3),
        "attenuated_spe_flux": round(att_spe, 3),
        "absorbed_dose_rads": round(dose, 4),
        "predicted_seu_rate_per_hour": round(seu_rate, 4)
    }
