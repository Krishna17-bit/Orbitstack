# OrbitStack: Spacecraft & Constellation Reliability Engine

OrbitStack is a reliability planning, fault simulation, and telemetry tracking engine designed for sub-micron Commercial Off-The-Shelf (COTS) computing architectures deployed in extreme space environments.

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
|                              \                /               |
|                               \              /                |
v                                v            v                 v
+---------------------------------v----------v------------------+
|                   SQLAlchemy ORM (SQLite / PostgreSQL)        |
+---------------------------------------+-----------------------+
                                        |
                                        v
+---------------------------------------v-----------------------+
|             Predictive ML & Digital Twin Engine               |
|            (Degradation, MTBF, Failure Likelihood)            |
+---------------------------------------+-----------------------+
                                        |
                                        v
+---------------------------------------v-----------------------+
|                   Next.js Premium UI Dashboard                |
+---------------------------------------------------------------+
```

---

## Key Modules & Feature Sets

### 1. Solar Storm Cockpit (Space Weather Control)
- **CME Flares Ingestion**: Simulate Class C (minor), Class M (moderate), or Class X (extreme) Coronal Mass Ejections.
- **Geomagnetic G-Scale Index**: Models storms from G1 to G5, scaling background radiation particle flux by up to $10,000\times$.
- **Emergency Runbooks**: Evaluates active safety actions including:
  - *Active Magnetic Deflection*: defuses charged particles at the cost of electromagnetic battery power.
  - *Cryo-Cooling Loops*: lowers node temperature by 40°C to halt the Thermal-SEL latchup synergy.
  - *Standby Safe Mode*: throttles node compute load to 2% and flushes cache registers to non-volatile storage.

### 2. Constellation ISL Routing Simulator
- **LEO Circular Orbits**: Computes dynamic 2D coordinates representing satellites orbiting above the Earth's horizon in real-time.
- **Laser Hops Mesh**: Connects satellites together when distance limits are met and nodes remain online.
- **Dijkstra Path Tracer**: Routes packet vectors from a central ground station to any orbiting satellite, computing dynamic latency, link hop paths, and packet loss rates.

### 3. Solar-Battery Power Grid
- **Daylight/Eclipse Cycles**: Simulates solar panel generation in Sunlight, switching to battery drain during Eclipse periods.
- **TID panel Decay**: Degrades solar panel charging efficiency dynamically relative to cumulative Total Ionizing Dose (TID) radiation.
- **Thermal Resistance Synergy**: Models battery internal resistance rising exponentially with node temperature.
- **Autothrottling**: The *Power-Aware Scheduler* automatically throttles node compute loads if the State of Charge (SOC) drops below 25%.

### 4. BFT Consensus Console
- **Crash vs. Byzantine Faults**: Models consensus replication across satellite nodes.
- **Byzantine Bit-Flips**: Injects memory corruption errors, causing nodes to vote inconsistently (Byzantine state).
- **Raft vs. PBFT Comparison**: Demonstrates how Raft (CFT) fails due to split-brain or data corruption under Byzantine conditions, while PBFT (BFT) secures the transaction when $3f + 1 \le N$.

---

## Local Development Quickstart

### Backend Setup (FastAPI)
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The API will be available at `http://localhost:8000`.

### Frontend Setup (Next.js)
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Launch the Next.js development server:
   ```bash
   npm run dev
   ```
   The dashboard will be active at `http://localhost:3000`.

---

## Production Deployment (Docker Compose)

OrbitStack is fully containerized using Docker. For production environments, it automatically spins up a persistent PostgreSQL database.

1. Configure environment variables in `backend/.env`:
   ```bash
   DATABASE_URL=postgresql://postgres:orbitstack_secure_db_pass@db:5432/orbitstack
   SEED_DEMO_DATA=True
   ```
2. Run Docker Compose from the root directory:
   ```bash
   docker-compose up -d --build
   ```
This launches:
* **PostgreSQL Database** on port `5432`
* **FastAPI Backend Core** on port `8000`
* **Next.js Frontend UI** on port `3000`

---

## Core API Endpoints

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Nodes** | `GET` | `/api/nodes/` | Retrieve active hardware nodes list |
| **Nodes** | `POST` | `/api/nodes/` | Provision a new extreme-environment node |
| **Solar Storms** | `POST` | `/api/solar/trigger` | Trigger a solar flare and geomagnetic storm |
| **Solar Storms** | `GET` | `/api/solar/status` | Get current heliophysics wind and flux factors |
| **Network** | `GET` | `/api/network/topology` | Fetch circular LEO satellite coordinates and links |
| **Network** | `GET` | `/api/network/route/{id}`| Trace shortest Dijkstra laser hops path |
| **Power** | `GET` | `/api/power/status` | Fetch SOC, SOH, temperature, and solar generation |
| **Power** | `POST` | `/api/power/rejuvenate/{id}`| Anneal solar panels and recharge node battery |
| **Consensus** | `POST` | `/api/consensus/propose` | Propose block data and execute BFT vs Raft consensus |
| **Consensus** | `POST` | `/api/consensus/byzantine`| Toggle Byzantine state of a replica |

---

## Simulation Physics & Mathematical Models

### 1. Thermal-SEL Latchup Susceptibility
CMOS susceptibility to Single Event Latchups (SEL) increases exponentially at high junction temperatures. OrbitStack models this susceptibility multiplier ($M_{SEL}$) as:
$$M_{SEL} = e^{\frac{T - 25.0}{18.0}}$$
Where $T$ is the current CPU core temperature in °C.

### 2. Spacecraft Reliability (Weibull Distribution)
Satellite survival rates are modeled using a Weibull reliability function:
$$R(t) = e^{-\left(\frac{t}{\eta}\right)^\beta}$$
Where:
- $\beta = 2.2$ represents the wearout factor.
- $\eta$ represents characteristic lifetime, scaled dynamically by shielding thickness and attenuated particle flux.

### 3. Battery Internal Resistance
Battery internal heating is coupled with the CPU core temperature, scaling the internal resistance ($R_{int}$) as:
$$R_{int} = 0.01 + 0.00015 \cdot e^{\frac{T_{batt} - 20.0}{15.0}}$$

---

## Running Automated Tests

Run the full pytest suite from the root directory to verify system extensions:
```bash
# Set PYTHONPATH to include the backend directory
$env:PYTHONPATH="backend"
pytest backend/tests/test_extensions.py
```
