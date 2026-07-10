import os
import json
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Node, TelemetryEvent, DigitalTwin, TelemetryLog, EccLog, ThermalLog, FaultSim
from app.services.digital_twin import TwinManager
from app.services.predictive_ml import predict_failures
from app.services.risk import calculate_global_risk

# SSE Broadcaster State
class TelemetryBroadcaster:
    _listeners = set()

    @classmethod
    def subscribe(cls):
        queue = asyncio.Queue()
        cls._listeners.add(queue)
        return queue

    @classmethod
    def unsubscribe(cls, queue):
        cls._listeners.remove(queue)

    @classmethod
    def broadcast(cls, event_data: dict):
        for queue in list(cls._listeners):
            # Non-blocking push
            asyncio.create_task(queue.put(event_data))

def ingest_telemetry_event(db: Session, payload: dict, source: str = "API") -> dict:
    """
    Ingests live telemetry, stores it, updates node states and twins,
    triggers ML predictions, calculates global risks, and broadcasts to listeners.
    """
    node_id_str = payload["node_id"]
    
    # 1. Store event in DB
    event = TelemetryEvent(
        node_id=node_id_str,
        timestamp=payload["timestamp"],
        region=payload["region"],
        hardware_type=payload["hardware_type"],
        current_temperature=payload["current_temperature"],
        mean_temperature_24h=payload["mean_temperature_24h"],
        thermal_cycles=payload["thermal_cycles"],
        radiation_dose=payload["radiation_dose"],
        seu_count=payload["seu_count"],
        ecc_error_count=payload["ecc_error_count"],
        multi_bit_error_count=payload["multi_bit_error_count"],
        uptime_hours=payload["uptime_hours"],
        shielding_mm=payload["shielding_mm"],
        redundancy_level=payload["redundancy_level"],
        checkpoint_interval=payload["checkpoint_interval"],
        workload_intensity=payload["workload_intensity"],
        topology_blast_radius=payload["topology_blast_radius"],
        previous_failures=payload["previous_failures"],
        power_draw_watts=payload["power_draw_watts"],
        memory_utilization=payload["memory_utilization"],
        gpu_utilization=payload["gpu_utilization"],
        network_latency_ms=payload["network_latency_ms"],
        raw_payload_json=json.dumps(payload),
        ingestion_source=source
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # 2. Get or Create Node
    node = db.query(Node).filter(Node.name == node_id_str).first()
    if not node:
        env = "underwater" if payload["region"] == "Mariana Trench" else ("desert" if payload["region"] == "Sahara" else "space")
        node = Node(
            name=node_id_str,
            environment=env,
            region=payload["region"],
            shielding=payload["shielding_mm"],
            device_type=payload["hardware_type"],
            status="online",
            load=payload["workload_intensity"]
        )
        db.add(node)
        db.commit()
        db.refresh(node)

    # Update node current properties
    node.load = payload["workload_intensity"]
    
    # 3. Add to Legacy Logs to keep old dashboard charts functional
    db.add(TelemetryLog(
        node_id=node.id,
        timestamp=payload["timestamp"],
        temperature=payload["current_temperature"],
        radiation_flux=payload["radiation_dose"] / 10.0 + 0.1,  # approximate conversion
        ecc_correctable=payload["ecc_error_count"],
        ecc_uncorrectable=payload["multi_bit_error_count"],
        node_load=payload["workload_intensity"]
    ))
    db.add(EccLog(
        node_id=node.id,
        timestamp=payload["timestamp"],
        correctable_errors=payload["ecc_error_count"],
        uncorrectable_errors=payload["multi_bit_error_count"],
        status="online"
    ))
    db.add(ThermalLog(
        node_id=node.id,
        timestamp=payload["timestamp"],
        temperature=payload["current_temperature"],
        cooling_efficiency=0.8
    ))
    db.add(FaultSim(
        node_id=node.id,
        timestamp=payload["timestamp"],
        intensity=payload["radiation_dose"] / 5.0 + 0.1,
        predicted_fault_rate=payload["seu_count"] / 24.0
    ))
    db.commit()

    # 4. Get Digital Twin & compute incremental counts
    twin = TwinManager.get_or_create_twin(db, node.id)
    new_seus = max(0, payload["seu_count"] - twin.seu_count)
    new_eccs = max(0, payload["ecc_error_count"] - twin.ecc_error_count)
    new_hards = max(0, payload["multi_bit_error_count"] - twin.hard_failure_count)
    
    # Force alignment of counts
    twin.seu_count = payload["seu_count"]
    twin.ecc_error_count = payload["ecc_error_count"]
    twin.hard_failure_count = payload["multi_bit_error_count"]
    twin.total_uptime = payload["uptime_hours"]
    twin.current_temperature = payload["current_temperature"]
    twin.redundancy_level = payload["redundancy_level"]
    twin.thermal_cycles = payload["thermal_cycles"]
    db.commit()

    # Update twin telemetry to run mtbf/degradation calculations
    TwinManager.update_twin_telemetry(
        db,
        node.id,
        payload["current_temperature"],
        payload["workload_intensity"],
        new_seus=new_seus,
        new_eccs=new_eccs,
        new_hard_failures=new_hards
    )

    # 5. Run ML Prediction Engine
    pred_res = predict_failures(db, node.id)
    
    # Sync Node Status with Twin Health
    node.status = twin.health_state
    db.commit()

    # 6. Re-calculate Global composite risk score
    risk_res = calculate_global_risk(db)

    # 7. Compile SSE stream payload
    stream_payload = {
        "event_id": event.id,
        "node_id": node_id_str,
        "timestamp": payload["timestamp"].isoformat() if isinstance(payload["timestamp"], datetime) else str(payload["timestamp"]),
        "region": payload["region"],
        "hardware_type": payload["hardware_type"],
        "current_temperature": payload["current_temperature"],
        "radiation_dose": payload["radiation_dose"],
        "seu_count": payload["seu_count"],
        "ecc_error_count": payload["ecc_error_count"],
        "multi_bit_error_count": payload["multi_bit_error_count"],
        "workload_intensity": payload["workload_intensity"],
        "power_draw_watts": payload["power_draw_watts"],
        
        # Predictions
        "failure_probability": pred_res["failure_probability"],
        "ecc_burst_probability": pred_res["ecc_probability"],
        "thermal_runaway_probability": pred_res["thermal_probability"],
        "overall_risk": pred_res["risk_score"] / 100.0,
        "mode": pred_res["model_status"],
        "top_features": list(pred_res["shap_explanations"].keys())[:3]
    }
    
    # Broadcast to active SSE streams
    TelemetryBroadcaster.broadcast(stream_payload)

    return {
        "event_id": event.id,
        "prediction": pred_res,
        "global_risk": risk_res.cluster_risk_score,
        "node_status": node.status
    }
