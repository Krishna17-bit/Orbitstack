import numpy as np
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import MissionRun

REGION_FLUX_PRESETS = {
    "LEO": (0.8, 15.0),       # (flux, ambient_temp)
    "GEO": (3.5, 20.0),
    "SAA": (12.0, 18.0),
    "Lunar": (5.0, 40.0),
    "Deep Space": (25.0, -10.0),
    "Ocean Floor": (0.001, 4.0)
}

def plan_mission(
    db: Session,
    name: str,
    node_count: int,
    orbit_type: str,
    duration_days: int,
    shielding_thickness: float,
    workload_intensity: float,
    redundancy_strategy: str
) -> MissionRun:
    """
    Simulates a space mission using a time-series orbital trajectory simulation.
    Models thermal-radiation synergistic SEL risks, cumulative TID, and adaptive workload throttling.
    """
    base_flux, ambient_temp = REGION_FLUX_PRESETS.get(orbit_type, (1.0, 20.0))
    
    # 1. Shielding Attenuation
    shielding_factor = np.exp(-shielding_thickness * 0.15)
    effective_flux = base_flux * shielding_factor
    
    # 2. Orbital Trajectory Step-by-Step Simulation (100 intervals)
    steps = 100
    
    cumulative_seus_static = 0.0
    cumulative_hard_failures_static = 0.0
    cumulative_sel_mult_static = 0.0
    
    cumulative_seus_adaptive = 0.0
    cumulative_hard_failures_adaptive = 0.0
    cumulative_sel_mult_adaptive = 0.0
    
    # Radiative heat dissipation in vacuum is less efficient (modeled as vacuum temperature gain multiplier)
    vacuum_factor = 1.3 if orbit_type in ["GEO", "Deep Space", "Lunar"] else 1.0
    
    for i in range(steps):
        # Determine dynamic flux multiplier along orbit trajectory
        if orbit_type == "LEO":
            # LEO alternates: 85% quiet, 15% SAA / Polar passes
            is_high_flux_pass = (i % 7 == 0)
            flux_mult = 10.0 if is_high_flux_pass else 0.4
        elif orbit_type == "GEO":
            # GEO is mostly steady high, with 5% solar proton storm spikes
            is_high_flux_pass = (i % 20 == 0)
            flux_mult = 5.0 if is_high_flux_pass else 0.8
        elif orbit_type == "Deep Space":
            # Deep Space has 10% solar particle events
            is_high_flux_pass = (i % 10 == 0)
            flux_mult = 4.0 if is_high_flux_pass else 0.7
        else:
            is_high_flux_pass = False
            flux_mult = 1.0
            
        interval_flux = base_flux * flux_mult * shielding_factor
        
        # --- Static Workload System ---
        # Temperature is driven directly by compute load
        temp_static = ambient_temp + (workload_intensity * 35.0 * vacuum_factor)
        temp_static = max(0.0, min(110.0, temp_static))
        
        # CMOS Physics: Latchup susceptibility (SEL) increases exponentially at high temperature
        # Modeling threshold LET shift: SEL risk multiplier = exp((T - T_ref) / T_scale)
        sel_mult_static = np.exp((temp_static - 25.0) / 18.0)
        
        # expected SEUs in this interval
        seu_rate_static = (interval_flux * workload_intensity * 0.5)
        cumulative_seus_static += seu_rate_static
        
        # Hard failure rate (SEL) is scaled directly by the temperature synergy multiplier
        cumulative_hard_failures_static += seu_rate_static * 0.03 * sel_mult_static
        cumulative_sel_mult_static += sel_mult_static
        
        # --- Adaptive Throttling System ---
        # When entering high flux zones, throttle workload to 15% to cool down the chip
        if is_high_flux_pass:
            workload_adaptive = 0.15
        else:
            workload_adaptive = workload_intensity
            
        temp_adaptive = ambient_temp + (workload_adaptive * 35.0 * vacuum_factor)
        temp_adaptive = max(0.0, min(110.0, temp_adaptive))
        
        sel_mult_adaptive = np.exp((temp_adaptive - 25.0) / 18.0)
        
        seu_rate_adaptive = (interval_flux * workload_adaptive * 0.5)
        cumulative_seus_adaptive += seu_rate_adaptive
        cumulative_hard_failures_adaptive += seu_rate_adaptive * 0.03 * sel_mult_adaptive
        cumulative_sel_mult_adaptive += sel_mult_adaptive

    # Scale cumulative simulation values to full duration and node count
    expected_seus = node_count * (cumulative_seus_static / steps) * duration_days
    expected_hard_failures = node_count * (cumulative_hard_failures_static / steps) * duration_days
    
    expected_seus_adaptive = node_count * (cumulative_seus_adaptive / steps) * duration_days
    expected_hard_failures_adaptive = node_count * (cumulative_hard_failures_adaptive / steps) * duration_days
    
    avg_sel_mult_static = cumulative_sel_mult_static / steps
    avg_sel_mult_adaptive = cumulative_sel_mult_adaptive / steps
    
    # 3. Expected ECC anomalies
    projected_ecc = expected_seus * 1.8
    
    # 4. Thermal Risk (aggregate metric for dashboard)
    base_thermal_risk = 0.1 if orbit_type == "Ocean Floor" else 0.4
    thermal_risk = min(0.99, base_thermal_risk * workload_intensity * (1.25 if ambient_temp > 30 else 1.0))
    
    # 5. Total Ionizing Dose (TID) Accumulation (in krad)
    # 1 rad/hour baseline mapping for flux, scaled by duration and attenuated by shielding
    total_rads = (effective_flux * 0.008) * 24.0 * duration_days
    accumulated_tid_krad = max(0.01, total_rads / 1000.0)
    
    # 6. Checkpoint Cost (hours lost per node over mission duration)
    mtbf_days = duration_days / (expected_hard_failures + 0.1)
    mtbf_mins = mtbf_days * 1440.0
    checkpoint_mins = 2.0
    
    opt_interval_mins = np.sqrt(2.0 * checkpoint_mins * mtbf_mins) + checkpoint_mins
    checkpoints_count = (duration_days * 1440.0) / opt_interval_mins
    
    lost_checkpointing = (checkpoints_count * checkpoint_mins) / 60.0
    lost_recompute = (expected_hard_failures * (opt_interval_mins / 2.0)) / 60.0
    checkpoint_costs = (lost_checkpointing + lost_recompute) * node_count

    # 7. Estimated Survival Rate (Weibull Reliability curve R(t))
    # Characteristic life eta drops as SEL multiplier increases
    eta_static = 365.0 * (shielding_thickness + 1.0) / (effective_flux + 0.1) / (avg_sel_mult_static ** 0.5)
    eta_adaptive = 365.0 * (shielding_thickness + 1.0) / (effective_flux + 0.1) / (avg_sel_mult_adaptive ** 0.5)
    beta = 2.2  # wearout behavior
    
    node_survival_static = np.exp(- (duration_days / eta_static) ** beta)
    node_survival_static = max(0.01, min(0.99, node_survival_static))
    
    node_survival_adaptive = np.exp(- (duration_days / eta_adaptive) ** beta)
    node_survival_adaptive = max(0.01, min(0.99, node_survival_adaptive))
    
    # Function to calculate strategy survival
    def calc_redundancy_survival(node_r):
        if redundancy_strategy == "TMR":
            return 3 * (node_r**2) - 2 * (node_r**3)
        elif redundancy_strategy == "Dual":
            return 1.0 - (1.0 - node_r)**2
        else: # Simplex
            return node_r
            
    survival_rate = calc_redundancy_survival(node_survival_static)
    survival_rate_pct = round(float(survival_rate * 100), 2)
    
    survival_rate_adaptive = calc_redundancy_survival(node_survival_adaptive)
    survival_rate_adaptive_pct = round(float(survival_rate_adaptive * 100), 2)
    
    # 8. Redundancy requirements & detailed engineering feedback
    reqs = []
    if survival_rate_pct < 75.0:
        reqs.append(f"CRITICAL: Shielding thickness of {shielding_thickness}mm is insufficient for {orbit_type}.")
        reqs.append("Reconfigure Redundancy to Triple Modular Redundancy (TMR).")
    
    if accumulated_tid_krad > 50.0:
        reqs.append(f"CAUTION: High TID accumulation of {accumulated_tid_krad:.1f} krad exceeds normal COTS tolerance (50 krad). Add structural tantalum shielding.")
        
    if avg_sel_mult_static > 4.0:
        reqs.append(f"WARNING: High Thermal-SEL synergy multiplier ({avg_sel_mult_static:.1f}x) detected. Node heat triggers latch-ups.")
        
    if survival_rate_adaptive_pct > survival_rate_pct + 5.0:
        gain = survival_rate_adaptive_pct - survival_rate_pct
        reqs.append(f"RECOMMENDED: Enable Adaptive Workload Throttling to increase survival rate by +{gain:.1f}% (+{temp_static - temp_adaptive:.1f}°C cooler).")
        
    if not reqs:
        reqs.append("Nominal: Selected redundancy plan meets baseline orbital reliability goals.")
        
    run = MissionRun(
        name=name,
        node_count=node_count,
        orbit_type=orbit_type,
        duration_days=duration_days,
        shielding_thickness=shielding_thickness,
        workload_intensity=workload_intensity,
        redundancy_strategy=redundancy_strategy,
        expected_seus=round(float(expected_seus), 1),
        projected_ecc_anomalies=round(float(projected_ecc), 1),
        expected_hard_failures=round(float(expected_hard_failures), 2),
        thermal_risk=round(float(thermal_risk), 2),
        checkpoint_costs=round(float(checkpoint_costs), 1),
        redundancy_requirements=json.dumps(reqs),
        estimated_survival_rate=survival_rate_pct,
        accumulated_tid_krad=round(float(accumulated_tid_krad), 2),
        sel_risk_multiplier=round(float(max(1.0, avg_sel_mult_static)), 2),
        adaptive_survival_rate=survival_rate_adaptive_pct,
        timestamp=datetime.utcnow()
    )
    
    db.add(run)
    db.commit()
    db.refresh(run)
    return run
