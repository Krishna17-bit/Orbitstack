from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Node(Base):
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    environment = Column(String, nullable=False)  # space, underwater, desert
    region = Column(String, nullable=False)       # LEO, GEO, Lunar, Deep Space, SAA, Mariana Trench, Sahara
    shielding = Column(Float, default=2.0)        # mm Al equivalent
    device_type = Column(String, default="VRAM")  # DRAM, SRAM, VRAM, Rad-Hard
    status = Column(String, default="online")     # online, degraded, offline
    load = Column(Float, default=0.5)             # 0.0 to 1.0

    fault_sims = relationship("FaultSim", back_populates="node", cascade="all, delete-orphan")
    thermal_logs = relationship("ThermalLog", back_populates="node", cascade="all, delete-orphan")
    ecc_logs = relationship("EccLog", back_populates="node", cascade="all, delete-orphan")
    checkpoint_plans = relationship("CheckpointPlan", back_populates="node", cascade="all, delete-orphan")
    recovery_actions = relationship("RecoveryAction", foreign_keys="[RecoveryAction.node_id]", cascade="all, delete-orphan")
    digital_twin = relationship("DigitalTwin", back_populates="node", uselist=False, cascade="all, delete-orphan")

class FaultSim(Base):
    __tablename__ = "fault_sims"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    intensity = Column(Float, default=1.0)        # particles/cm2/sec
    predicted_fault_rate = Column(Float, default=0.0) # errors/hour
    memory_map = Column(Text, nullable=True)      # JSON representing the simulated physical map
    timestamp = Column(DateTime, default=datetime.utcnow)

    node = relationship("Node", back_populates="fault_sims")

class ThermalLog(Base):
    __tablename__ = "thermal_logs"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    temperature = Column(Float, nullable=False)
    fatigue_factor = Column(Float, default=0.0)
    cooling_efficiency = Column(Float, default=1.0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    node = relationship("Node", back_populates="thermal_logs")

class EccLog(Base):
    __tablename__ = "ecc_logs"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    correctable_errors = Column(Integer, default=0)
    uncorrectable_errors = Column(Integer, default=0)
    status = Column(String, default="normal")
    timestamp = Column(DateTime, default=datetime.utcnow)

    node = relationship("Node", back_populates="ecc_logs")

class CheckpointPlan(Base):
    __tablename__ = "checkpoint_plans"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    optimal_interval = Column(Float, nullable=False)  # in minutes
    expected_loss = Column(Float, default=0.0)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    node = relationship("Node", back_populates="checkpoint_plans")

class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    failover_target_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)
    steps = Column(Text, nullable=False)          # JSON list of actions
    status = Column(String, default="pending")    # pending, active, completed
    timestamp = Column(DateTime, default=datetime.utcnow)

    node = relationship("Node", foreign_keys=[node_id])
    failover_target = relationship("Node", foreign_keys=[failover_target_id])


# --- OrbitStack v2 Extensions ---

class DigitalTwin(Base):
    __tablename__ = "digital_twins"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    node_type = Column(String, nullable=False)
    deployment_region = Column(String, nullable=False)
    thermal_cycles = Column(Integer, default=0)
    radiation_dose = Column(Float, default=0.0)
    seu_count = Column(Integer, default=0)
    ecc_error_count = Column(Integer, default=0)
    hard_failure_count = Column(Integer, default=0)
    redundancy_level = Column(Integer, default=1)
    checkpoint_history = Column(Text, default="[]")  # JSON list
    total_uptime = Column(Float, default=0.0)        # in hours
    mtbf = Column(Float, default=720.0)              # in hours
    reliability_score = Column(Float, default=100.0)  # 0 to 100
    health_state = Column(String, default="online")  # online, degraded, offline
    projected_lifetime_hours = Column(Float, default=8760.0)
    degradation_score = Column(Float, default=0.0)   # 0 to 100
    current_temperature = Column(Float, default=25.0)
    historical_temperatures = Column(Text, default="[]") # JSON list of floats
    historical_faults = Column(Text, default="[]")       # JSON list
    historical_exposure = Column(Text, default="[]")     # JSON list of floats
    updated_at = Column(DateTime, default=datetime.utcnow)

    node = relationship("Node", back_populates="digital_twin")
    snapshots = relationship("TwinSnapshot", back_populates="twin", cascade="all, delete-orphan")

class TwinSnapshot(Base):
    __tablename__ = "twin_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    twin_id = Column(Integer, ForeignKey("digital_twins.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    health_state = Column(String, nullable=False)
    reliability_score = Column(Float, nullable=False)
    degradation_score = Column(Float, nullable=False)
    seu_count = Column(Integer, default=0)
    ecc_error_count = Column(Integer, default=0)
    hard_failure_count = Column(Integer, default=0)
    current_temperature = Column(Float, default=25.0)
    radiation_dose = Column(Float, default=0.0)

    twin = relationship("DigitalTwin", back_populates="snapshots")

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    temperature = Column(Float, nullable=False)
    radiation_flux = Column(Float, nullable=False)
    ecc_correctable = Column(Integer, default=0)
    ecc_uncorrectable = Column(Integer, default=0)
    checkpoint_cost = Column(Float, default=2.0)
    node_load = Column(Float, default=0.5)

    node = relationship("Node", backref="telemetry_logs")

class MLPrediction(Base):
    __tablename__ = "ml_predictions"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    next_failure_probability = Column(Float, default=0.0)
    thermal_runaway_probability = Column(Float, default=0.0)
    ecc_burst_probability = Column(Float, default=0.0)
    seu_spike_probability = Column(Float, default=0.0)
    checkpoint_loss_probability = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    top_risk_factors = Column(Text, default="[]")     # JSON list of strings
    confidence_score = Column(Float, default=0.0)

    node = relationship("Node", backref="ml_predictions")

class MissionRun(Base):
    __tablename__ = "mission_runs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    node_count = Column(Integer, nullable=False)
    orbit_type = Column(String, nullable=False)
    duration_days = Column(Integer, nullable=False)
    shielding_thickness = Column(Float, nullable=False)
    workload_intensity = Column(Float, nullable=False)
    redundancy_strategy = Column(String, nullable=False)
    expected_seus = Column(Float, default=0.0)
    projected_ecc_anomalies = Column(Float, default=0.0)
    expected_hard_failures = Column(Float, default=0.0)
    thermal_risk = Column(Float, default=0.0)
    checkpoint_costs = Column(Float, default=0.0)
    redundancy_requirements = Column(Text, nullable=True)
    estimated_survival_rate = Column(Float, default=100.0)
    accumulated_tid_krad = Column(Float, default=0.0)
    sel_risk_multiplier = Column(Float, default=1.0)
    adaptive_survival_rate = Column(Float, default=100.0)

class RadiationProfile(Base):
    __tablename__ = "radiation_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    solar_cycle = Column(String, nullable=False)       # Solar Max, Solar Min
    geomagnetic_storm = Column(String, nullable=False) # Normal, Active, Storm
    gcr_flux = Column(Float, nullable=False)           # particles/cm2/sec
    spe_flux = Column(Float, nullable=False)           # particles/cm2/sec
    trapped_protons = Column(Float, default=0.0)
    trapped_electrons = Column(Float, default=0.0)

class KernelProfile(Base):
    __tablename__ = "kernel_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    memory_footprint_mb = Column(Float, nullable=False)
    register_footprint = Column(Integer, nullable=False)
    shared_memory_kb = Column(Float, nullable=False)
    thread_blocks = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    fault_runs = relationship("KernelFaultRun", back_populates="kernel", cascade="all, delete-orphan")

class KernelFaultRun(Base):
    __tablename__ = "kernel_fault_runs"

    id = Column(Integer, primary_key=True, index=True)
    kernel_profile_id = Column(Integer, ForeignKey("kernel_profiles.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    simulated_bit_flips = Column(Integer, default=0)
    simulated_register_corruptions = Column(Integer, default=0)
    warp_divergence_multiplier = Column(Float, default=1.0)
    fault_impact_score = Column(Float, default=0.0)
    critical_memory_zones = Column(Text, default="[]")       # JSON list of strings
    recovery_recommendations = Column(Text, default="[]")    # JSON list of strings

    kernel = relationship("KernelProfile", back_populates="fault_runs")

class RiskHistory(Base):
    __tablename__ = "risk_history"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    cluster_risk_score = Column(Float, default=0.0)
    thermal_risk = Column(Float, default=0.0)
    radiation_risk = Column(Float, default=0.0)
    ecc_risk = Column(Float, default=0.0)
    topology_risk = Column(Float, default=0.0)
    mission_risk = Column(Float, default=0.0)
    aging_risk = Column(Float, default=0.0)

class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False)
    region = Column(String, nullable=False)
    hardware_type = Column(String, nullable=False)

    current_temperature = Column(Float, nullable=False)
    mean_temperature_24h = Column(Float, nullable=False)
    thermal_cycles = Column(Integer, nullable=False)
    radiation_dose = Column(Float, nullable=False)
    seu_count = Column(Integer, nullable=False)
    ecc_error_count = Column(Integer, nullable=False)
    multi_bit_error_count = Column(Integer, nullable=False)
    uptime_hours = Column(Float, nullable=False)
    shielding_mm = Column(Float, nullable=False)
    redundancy_level = Column(Integer, nullable=False)
    checkpoint_interval = Column(Float, nullable=False)
    workload_intensity = Column(Float, nullable=False)
    topology_blast_radius = Column(Float, nullable=False)
    previous_failures = Column(Integer, nullable=False)

    power_draw_watts = Column(Float, nullable=False)
    memory_utilization = Column(Float, nullable=False)
    gpu_utilization = Column(Float, nullable=False)
    network_latency_ms = Column(Float, nullable=False)

    raw_payload_json = Column(Text, nullable=False)
    ingestion_source = Column(String, default="API")
    created_at = Column(DateTime, default=datetime.utcnow)
