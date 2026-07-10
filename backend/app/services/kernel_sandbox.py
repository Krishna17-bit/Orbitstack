import numpy as np
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import KernelProfile, KernelFaultRun

def seed_kernel_profiles(db: Session):
    """
    Seeds default CUDA/Triton kernels.
    """
    if db.query(KernelProfile).count() > 0:
        return
        
    kernels = [
        KernelProfile(
            name="LLM Attention Projection (Fused CUDA)",
            memory_footprint_mb=256.0,
            register_footprint=131072,
            shared_memory_kb=96.0,
            thread_blocks=2048
        ),
        KernelProfile(
            name="SGD Optimizer update step (Triton)",
            memory_footprint_mb=1024.0,
            register_footprint=65536,
            shared_memory_kb=32.0,
            thread_blocks=512
        ),
        KernelProfile(
            name="ResNet Conv2d Backprop (CUDA)",
            memory_footprint_mb=512.0,
            register_footprint=262144,
            shared_memory_kb=48.0,
            thread_blocks=4096
        )
    ]
    
    for k in kernels:
        db.add(k)
    db.commit()

def simulate_kernel_faults(
    db: Session,
    profile_id: int,
    bit_flips: int,
    register_corruptions: int
) -> KernelFaultRun:
    """
    Simulates bit-flips and register corruption impact on a registered kernel profile.
    """
    kernel = db.query(KernelProfile).filter(KernelProfile.id == profile_id).first()
    if not kernel:
        raise ValueError("Kernel profile not found")
        
    # 1. Calculate Warp Divergence Multiplier
    # If threads in a warp experience register corruption, branch outcomes flip.
    # Warp serialization occurs.
    corrupt_rate = register_corruptions / max(1, kernel.register_footprint)
    warp_divergence = 1.0 + (corrupt_rate * 50000.0) * (kernel.thread_blocks / 1024.0)
    warp_divergence = float(round(min(15.0, warp_divergence), 2))
    
    # 2. Calculate Fault Impact Score (0 to 100)
    mem_impact = (bit_flips / max(1.0, kernel.memory_footprint_mb)) * 10.0
    reg_impact = (register_corruptions / max(1.0, kernel.register_footprint)) * 100000.0
    impact_score = min(100.0, reg_impact + mem_impact)
    impact_score = float(round(impact_score, 1))
    
    # 3. Identify affected memory zones
    zones = []
    if bit_flips > 0:
        zones.append(f"Global memory block pointer offset 0x{np.random.randint(256, 4096):04X}")
    if register_corruptions > 0:
        zones.append(f"Warp #{np.random.randint(0, 32)} scalar register R{np.random.randint(0, 16)}")
        zones.append("Thread execution condition register CR0")
    if not zones:
        zones.append("All GPU registers and caches nominal")
        
    # 4. Generate recovery recommendations
    recs = []
    if impact_score > 50.0:
        recs.append("CRITICAL: Enable Triple Modular Redundancy (TMR) at block level.")
        recs.append("Inject syncthreads() barriers before branching instructions.")
    elif impact_score > 15.0:
        recs.append("Enable CUDA memory checking parity validation.")
        recs.append("Re-allocate threads to avoid shared-memory bank conflicts.")
    else:
        recs.append("Nominal: Memory scrub interval is sufficient for this fault density.")
        
    run = KernelFaultRun(
        kernel_profile_id=kernel.id,
        simulated_bit_flips=bit_flips,
        simulated_register_corruptions=register_corruptions,
        warp_divergence_multiplier=warp_divergence,
        fault_impact_score=impact_score,
        critical_memory_zones=json.dumps(zones),
        recovery_recommendations=json.dumps(recs),
        timestamp=datetime.utcnow()
    )
    
    db.add(run)
    db.commit()
    db.refresh(run)
    return run
