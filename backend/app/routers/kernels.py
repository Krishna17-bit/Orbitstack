from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import KernelProfile, KernelFaultRun
from app.schemas.schemas import KernelProfileCreate, KernelProfileResponse, KernelFaultRunResponse
from app.services.kernel_sandbox import simulate_kernel_faults, seed_kernel_profiles

router = APIRouter(prefix="/kernels", tags=["Kernel Reliability Sandbox"])

@router.post("/register", response_model=KernelProfileResponse)
def register_kernel(req: KernelProfileCreate, db: Session = Depends(get_db)):
    profile = KernelProfile(
        name=req.name,
        memory_footprint_mb=req.memory_footprint_mb,
        register_footprint=req.register_footprint,
        shared_memory_kb=req.shared_memory_kb,
        thread_blocks=req.thread_blocks
    )
    db.add(profile)
    try:
        db.commit()
        db.refresh(profile)
        return profile
    except Exception:
        db.rollback()
        # Fallback if name matches
        existing = db.query(KernelProfile).filter(KernelProfile.name == req.name).first()
        if existing:
            return existing
        raise HTTPException(status_code=400, detail="Could not register kernel profile.")

@router.get("/list", response_model=list[KernelProfileResponse])
def get_kernels_list(db: Session = Depends(get_db)):
    seed_kernel_profiles(db)
    return db.query(KernelProfile).all()

@router.post("/simulate/{profile_id}", response_model=KernelFaultRunResponse)
def run_kernel_simulation(profile_id: int, bit_flips: int = 10, register_corruptions: int = 2, db: Session = Depends(get_db)):
    try:
        return simulate_kernel_faults(db, profile_id, bit_flips, register_corruptions)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{profile_id}/runs", response_model=list[KernelFaultRunResponse])
def get_kernel_runs(profile_id: int, db: Session = Depends(get_db)):
    return db.query(KernelFaultRun).filter(KernelFaultRun.kernel_profile_id == profile_id).order_by(KernelFaultRun.timestamp.desc()).all()
