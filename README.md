# OrbitStack: Spacecraft & Constellation Reliability Engine

OrbitStack is a production-ready reliability planning, fault simulation, and telemetry tracking engine designed for sub-micron Commercial Off-The-Shelf (COTS) computing architectures deployed in extreme space environments.

By coupling multiphysics models (Thermal-Radiation Synergy) and simulating software-defined fault mitigation strategies (TMR, dynamic checkpointing, workload throttling), OrbitStack bridges the gap between pre-launch trajectory planning and live digital twin constellation monitoring.

---

## System Architecture

```
                                  +-----------------------------+
                                  |   Real Satellite Telemetry  |
                                  +--------------+--------------+
                                                 | (JSON payload)
                                                 v
+-----------------------------+   +--------------v--------------+
| Pre-Launch Mission Planner  |   |    FastAPI Ingestion API    |
| (Trajectories, Thermal-SEL) |   |  (POST /api/telemetry/event)|
+--------------+--------------+   +--------------+--------------+
               |                                 |
               v                                 v
+--------------v---------------------------------v--------------+
|                 SQLAlchemy ORM (PostgreSQL)                   |
+--------------------------------+------------------------------+
                                 |
                                 v
+--------------------------------v------------------------------+
|            Predictive ML & Digital Twin Engine                |
|           (Degradation, MTBF, Failure Likelihood)             |
+--------------------------------+------------------------------+
                                 |
                                 v
+--------------------------------v------------------------------+
|                  Next.js Premium UI Dashboard                 |
+---------------------------------------------------------------+
```

---

## Production Deployment Guide

OrbitStack is containerized using Docker and Docker Compose. For production environments, it automatically spins up a persistent PostgreSQL database.

### 1. Configure Environment Variables
Create a `.env` file in the `backend/` directory to configure the production settings:

```bash
# Database connection string (e.g. PostgreSQL)
DATABASE_URL=postgresql://postgres:orbitstack_secure_db_pass@db:5432/orbitstack

# Toggle demo data seeding (set to False for a clean production database)
SEED_DEMO_DATA=False

# API secret key
SECRET_KEY=generate_a_secure_random_production_key_here
```

### 2. Start the Stack
Run Docker Compose from the root directory:
```bash
docker-compose up -d --build
```
This launches:
*   **PostgreSQL Database** on port `5432`
*   **FastAPI Backend Core** on port `8000`
*   **Next.js Frontend UI** on port `3000`

---

## Ingesting Real Hardware Telemetry

To interface actual satellite telemetry logs or flight computers with OrbitStack's Digital Twin engine, send a `POST` request to the ingestion endpoint:

**Endpoint:** `POST /api/nodes/telemetry/event` (or `POST /api/telemetry/event` depending on route config)

#### Example Payload:
```json
{
  "node_id": "sat-cubesat-alpha-09",
  "timestamp": "2026-07-10T18:00:00Z",
  "region": "LEO",
  "hardware_type": "SRAM",
  "current_temperature": 52.4,
  "mean_temperature_24h": 46.8,
  "thermal_cycles": 112,
  "radiation_dose": 12.4,
  "seu_count": 5,
  "ecc_error_count": 8,
  "multi_bit_error_count": 0,
  "uptime_hours": 1420.5,
  "shielding_mm": 2.5,
  "redundancy_level": 3,
  "checkpoint_interval": 120.0,
  "workload_intensity": 0.65,
  "topology_blast_radius": 1.5,
  "previous_failures": 0,
  "power_draw_watts": 12.8,
  "memory_utilization": 0.42,
  "gpu_utilization": 0.55,
  "network_latency_ms": 12.4
}
```

This updates the node's **Digital Twin** in real time:
1. Re-calculates its **MTBF** (Mean Time Between Failures) and remaining useful life.
2. Triggers **Random Forest classifiers** to predict node failure probabilities, thermal runaway risk, and ECC burst anomalies for the next 24 hours.
3. Broadcasts the state change immediately via Server-Sent Events (SSE) to connected frontend dashboards.
