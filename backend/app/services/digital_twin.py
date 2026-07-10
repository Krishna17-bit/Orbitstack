import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Node, DigitalTwin, TwinSnapshot

class TwinManager:
    @staticmethod
    def get_or_create_twin(db: Session, node_id: int) -> DigitalTwin:
        node = db.query(Node).filter(Node.id == node_id).first()
        if not node:
            raise ValueError("Node not found")
        
        twin = db.query(DigitalTwin).filter(DigitalTwin.node_id == node_id).first()
        if not twin:
            twin = DigitalTwin(
                node_id=node.id,
                node_type=node.device_type,
                deployment_region=node.region,
                total_uptime=24.0,  # Base uptime seed
                current_temperature=24.5
            )
            db.add(twin)
            db.commit()
            db.refresh(twin)
            
            # Initial snapshot
            TwinManager.create_snapshot(db, twin)
            
        return twin

    @staticmethod
    def update_twin_telemetry(
        db: Session, 
        node_id: int, 
        temperature: float, 
        load: float, 
        new_seus: int = 0, 
        new_eccs: int = 0, 
        new_hard_failures: int = 0
    ) -> DigitalTwin:
        twin = TwinManager.get_or_create_twin(db, node_id)
        
        # Increment counters
        twin.seu_count += new_seus
        twin.ecc_error_count += new_eccs
        twin.hard_failure_count += new_hard_failures
        twin.current_temperature = temperature
        twin.total_uptime += 0.1  # Incremental update timestep (6 minutes equivalent)
        
        if new_seus > 0 or new_eccs > 0 or new_hard_failures > 0:
            fault_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "seus": new_seus,
                "eccs": new_eccs,
                "hard_failures": new_hard_failures
            }
            faults = json.loads(twin.historical_faults or "[]")
            faults.append(fault_entry)
            twin.historical_faults = json.dumps(faults[-20:])  # Cap length
            
        # Append historical temps
        temps = json.loads(twin.historical_temperatures or "[]")
        temps.append(round(temperature, 2))
        twin.historical_temperatures = json.dumps(temps[-30:])
        
        # Append exposure dose history
        exposures = json.loads(twin.historical_exposure or "[]")
        base_exp = 0.05 if twin.deployment_region == "LEO" else 0.5
        new_dose = base_exp * (1.0 + new_seus * 0.1)
        twin.radiation_dose += new_dose
        exposures.append(round(twin.radiation_dose, 2))
        twin.historical_exposure = json.dumps(exposures[-30:])

        # Recalculate metrics
        twin.mtbf = TwinManager.calculate_mtbf(twin.total_uptime, twin.seu_count, twin.ecc_error_count, twin.hard_failure_count)
        twin.projected_lifetime_hours = TwinManager.predict_lifetime(twin.total_uptime, twin.radiation_dose, twin.thermal_cycles)
        
        # Degradation score: 0 to 100 based on faults, temp swings, and radiation dose
        degradation = (twin.radiation_dose * 0.2) + (twin.seu_count * 0.5) + (twin.ecc_error_count * 0.1) + (twin.hard_failure_count * 15.0)
        twin.degradation_score = min(100.0, max(0.0, degradation))
        
        # Reliability score = 100 - degradation
        twin.reliability_score = round(100.0 - twin.degradation_score, 2)
        
        # Health state transition
        if twin.reliability_score < 40.0 or twin.hard_failure_count > 3:
            twin.health_state = "offline"
        elif twin.reliability_score < 80.0 or twin.ecc_error_count > 50:
            twin.health_state = "degraded"
        else:
            twin.health_state = "online"
            
        twin.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(twin)
        
        # Periodically trigger snapshots or trigger on major changes
        if new_seus > 0 or new_hard_failures > 0 or len(temps) % 5 == 0:
            TwinManager.create_snapshot(db, twin)
            
        return twin

    @staticmethod
    def calculate_mtbf(total_uptime: float, seus: int, eccs: int, hard_failures: int) -> float:
        total_events = seus + (eccs * 0.05) + (hard_failures * 10.0)
        if total_events <= 0:
            return 720.0  # Nominally 720 hours base MTBF
        return round(total_uptime / (total_events / 10.0 + 1.0), 2)

    @staticmethod
    def predict_lifetime(total_uptime: float, radiation_dose: float, thermal_cycles: int) -> float:
        # Design life is 5 years = 43800 hours
        base_life = 43800.0
        # Aging factors
        rad_factor = radiation_dose * 15.0      # 15 hours lost per Rad of dose
        thermal_factor = thermal_cycles * 50.0  # 50 hours lost per thermal cycle
        
        remaining = base_life - rad_factor - thermal_factor
        return float(max(100.0, remaining))

    @staticmethod
    def create_snapshot(db: Session, twin: DigitalTwin) -> TwinSnapshot:
        snapshot = TwinSnapshot(
            twin_id=twin.id,
            health_state=twin.health_state,
            reliability_score=twin.reliability_score,
            degradation_score=twin.degradation_score,
            seu_count=twin.seu_count,
            ecc_error_count=twin.ecc_error_count,
            hard_failure_count=twin.hard_failure_count,
            current_temperature=twin.current_temperature,
            radiation_dose=twin.radiation_dose,
            timestamp=datetime.utcnow()
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        return snapshot

    @staticmethod
    def replay_state_timeline(db: Session, twin_id: int) -> list[dict]:
        snapshots = db.query(TwinSnapshot).filter(TwinSnapshot.twin_id == twin_id).order_by(TwinSnapshot.timestamp.asc()).all()
        return [
            {
                "timestamp": snap.timestamp.isoformat(),
                "health_state": snap.health_state,
                "reliability_score": snap.reliability_score,
                "degradation_score": snap.degradation_score,
                "seus": snap.seu_count,
                "eccs": snap.ecc_error_count,
                "hard_failures": snap.hard_failure_count,
                "temp": snap.current_temperature,
                "radiation": snap.radiation_dose
            }
            for snap in snapshots
        ]

    @staticmethod
    def risk_drift(db: Session, twin_id: int) -> float:
        """
        Calculates the velocity of reliability degradation over the last 5 snapshots.
        Returns a drift score representing reliability loss rate (points/hour).
        """
        snapshots = db.query(TwinSnapshot).filter(TwinSnapshot.twin_id == twin_id).order_by(TwinSnapshot.timestamp.desc()).limit(5).all()
        if len(snapshots) < 2:
            return 0.0
            
        # Oldest of the set vs newest
        newest = snapshots[0]
        oldest = snapshots[-1]
        
        time_diff = (newest.timestamp - oldest.timestamp).total_seconds() / 3600.0
        if time_diff <= 0.001:
            return 0.0
            
        reliability_loss = oldest.reliability_score - newest.reliability_score
        return round(reliability_loss / time_diff, 4)
