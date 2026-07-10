from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- NODE ---
class NodeBase(BaseModel):
    name: str
    environment: str
    region: str
    shielding: float = 2.0
    device_type: str = "VRAM"
    status: str = "online"
    load: float = 0.5

class NodeCreate(NodeBase):
    pass

class NodeUpdate(BaseModel):
    name: Optional[str] = None
    environment: Optional[str] = None
    region: Optional[str] = None
    shielding: Optional[float] = None
    device_type: Optional[str] = None
    status: Optional[str] = None
    load: Optional[float] = None

class NodeResponse(NodeBase):
    id: int

    class Config:
        from_attributes = True

# --- FAULT SIM ---
class FaultSimResponse(BaseModel):
    id: int
    node_id: int
    intensity: float
    predicted_fault_rate: float
    memory_map: Optional[str] = None  # JSON string containing page states
    timestamp: datetime

    class Config:
        from_attributes = True

class FaultSimTrigger(BaseModel):
    intensity: float

# --- THERMAL ---
class ThermalLogResponse(BaseModel):
    id: int
    node_id: int
    temperature: float
    fatigue_factor: float
    cooling_efficiency: float
    timestamp: datetime

    class Config:
        from_attributes = True

class ThermalRun(BaseModel):
    compute_load: float

# --- ECC ---
class EccLogResponse(BaseModel):
    id: int
    node_id: int
    correctable_errors: int
    uncorrectable_errors: int
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True

class EccTrigger(BaseModel):
    correctable: int
    uncorrectable: int

# --- CHECKPOINT ---
class CheckpointPlanResponse(BaseModel):
    id: int
    node_id: int
    optimal_interval: float
    expected_loss: float
    calculated_at: datetime

    class Config:
        from_attributes = True

class CheckpointCalcRequest(BaseModel):
    checkpoint_cost_mins: float = 2.0

# --- RECOVERY ---
class RecoveryActionResponse(BaseModel):
    id: int
    node_id: int
    failover_target_id: Optional[int] = None
    steps: str  # JSON list
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True

# --- DASHBOARD OVERVIEW ---
class DashboardOverview(BaseModel):
    active_nodes: int
    total_nodes: int
    risk_score: float  # scale of 0 to 100
    average_temp: float
    radiation_exposure: float  # aggregate particle flux
    cumulative_faults: int
    critical_alerts: List[Dict[str, Any]]

# --- FAILURE GRAPH ---
class DependencyNode(BaseModel):
    id: str
    label: str
    type: str  # power, network, compute
    status: str  # online, degraded, offline
    blast_radius: float

class DependencyEdge(BaseModel):
    source: str
    target: str

class DependencyGraphResponse(BaseModel):
    nodes: List[DependencyNode]
    edges: List[DependencyEdge]


# --- OrbitStack v2 Extensions ---

# Digital Twin
class TwinSnapshotResponse(BaseModel):
    id: int
    twin_id: int
    timestamp: datetime
    health_state: str
    reliability_score: float
    degradation_score: float
    seu_count: int
    ecc_error_count: int
    hard_failure_count: int
    current_temperature: float
    radiation_dose: float

    class Config:
        from_attributes = True

class DigitalTwinResponse(BaseModel):
    id: int
    node_id: int
    node_type: str
    deployment_region: str
    thermal_cycles: int
    radiation_dose: float
    seu_count: int
    ecc_error_count: int
    hard_failure_count: int
    redundancy_level: int
    checkpoint_history: str
    total_uptime: float
    mtbf: float
    reliability_score: float
    health_state: str
    projected_lifetime_hours: float
    degradation_score: float
    current_temperature: float
    historical_temperatures: str
    historical_faults: str
    historical_exposure: str
    updated_at: datetime

    class Config:
        from_attributes = True

# ML Engine
class MLPredictionResponse(BaseModel):
    id: int
    node_id: int
    timestamp: datetime
    next_failure_probability: float
    thermal_runaway_probability: float
    ecc_burst_probability: float
    seu_spike_probability: float
    checkpoint_loss_probability: float
    risk_score: float
    top_risk_factors: str
    confidence_score: float

    class Config:
        from_attributes = True

# Mission Planner
class MissionSimRequest(BaseModel):
    name: str = "Apollo-Compute-G1"
    node_count: int = 8
    orbit_type: str = "LEO"  # LEO, GEO, SAA, Lunar, Deep Space, Ocean Floor
    duration_days: int = 180
    shielding_thickness: float = 2.0
    workload_intensity: float = 0.5
    redundancy_strategy: str = "TMR"  # Simplex, Dual, TMR

class MissionSimResponse(BaseModel):
    id: Optional[int] = None
    name: str
    timestamp: datetime
    node_count: int
    orbit_type: str
    duration_days: int
    shielding_thickness: float
    workload_intensity: float
    redundancy_strategy: str
    expected_seus: float
    projected_ecc_anomalies: float
    expected_hard_failures: float
    thermal_risk: float
    checkpoint_costs: float
    redundancy_requirements: str
    estimated_survival_rate: float
    accumulated_tid_krad: float
    sel_risk_multiplier: float
    adaptive_survival_rate: float

    class Config:
        from_attributes = True

# Radiation profiles
class RadiationProfileResponse(BaseModel):
    id: int
    name: str
    solar_cycle: str
    geomagnetic_storm: str
    gcr_flux: float
    spe_flux: float
    trapped_protons: float
    trapped_electrons: float

    class Config:
        from_attributes = True

# Kernel Profiles
class KernelProfileCreate(BaseModel):
    name: str
    memory_footprint_mb: float = 128.0
    register_footprint: int = 65536
    shared_memory_kb: float = 48.0
    thread_blocks: int = 1024

class KernelProfileResponse(BaseModel):
    id: int
    name: str
    memory_footprint_mb: float
    register_footprint: int
    shared_memory_kb: float
    thread_blocks: int
    created_at: datetime

    class Config:
        from_attributes = True

class KernelFaultRunResponse(BaseModel):
    id: int
    kernel_profile_id: int
    timestamp: datetime
    simulated_bit_flips: int
    simulated_register_corruptions: int
    warp_divergence_multiplier: float
    fault_impact_score: float
    critical_memory_zones: str
    recovery_recommendations: str

    class Config:
        from_attributes = True

# Global Risk
class GlobalRiskResponse(BaseModel):
    id: Optional[int] = None
    timestamp: datetime
    cluster_risk_score: float
    thermal_risk: float
    radiation_risk: float
    ecc_risk: float
    topology_risk: float
    mission_risk: float
    aging_risk: float

    class Config:
        from_attributes = True

# --- Telemetry Ingestion Schemas ---
class TelemetryEventCreate(BaseModel):
    node_id: str
    timestamp: datetime
    region: str
    hardware_type: str
    current_temperature: float
    mean_temperature_24h: float
    thermal_cycles: int
    radiation_dose: float
    seu_count: int
    ecc_error_count: int
    multi_bit_error_count: int
    uptime_hours: float
    shielding_mm: float
    redundancy_level: int
    checkpoint_interval: float
    workload_intensity: float
    topology_blast_radius: float
    previous_failures: int
    power_draw_watts: float
    memory_utilization: float
    gpu_utilization: float
    network_latency_ms: float

class TelemetryEventResponse(TelemetryEventCreate):
    id: int
    raw_payload_json: str
    ingestion_source: str
    created_at: datetime

    class Config:
        from_attributes = True
