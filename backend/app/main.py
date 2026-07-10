from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models import models
from app.routers import nodes, fault_sim, thermal, checkpoint, ecc, graph, recovery, dashboard, twins, ml, mission, kernels, radiation, risk
from datetime import datetime
from app.services.radiation_data import seed_radiation_profiles
from app.services.kernel_sandbox import seed_kernel_profiles

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev environment convenience
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(dashboard.router, prefix="/api")
app.include_router(nodes.router, prefix="/api")
app.include_router(fault_sim.router, prefix="/api")
app.include_router(thermal.router, prefix="/api")
app.include_router(checkpoint.router, prefix="/api")
app.include_router(ecc.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(recovery.router, prefix="/api")
app.include_router(twins.router, prefix="/api")
app.include_router(ml.router, prefix="/api")
app.include_router(mission.router, prefix="/api")
app.include_router(kernels.router, prefix="/api")
app.include_router(radiation.router, prefix="/api")
app.include_router(risk.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to OrbitStack Reliability Engine API"}

# Seed Database on Startup if empty
@app.on_event("startup")
def seed_database():
    db = SessionLocal()
    try:
        # Seed profiles
        seed_radiation_profiles(db)
        seed_kernel_profiles(db)
        
        if settings.SEED_DEMO_DATA and db.query(models.Node).count() == 0:
            # Create default nodes
            nodes_to_seed = [
                models.Node(
                    name="node-alpha-leo",
                    environment="space",
                    region="LEO",
                    shielding=2.5,
                    device_type="VRAM",
                    status="online",
                    load=0.45
                ),
                models.Node(
                    name="node-beta-geo",
                    environment="space",
                    region="GEO",
                    shielding=1.5,
                    device_type="SRAM",
                    status="online",
                    load=0.60
                ),
                models.Node(
                    name="node-gamma-lunar",
                    environment="space",
                    region="Lunar",
                    shielding=3.0,
                    device_type="DRAM",
                    status="online",
                    load=0.30
                ),
                models.Node(
                    name="node-delta-ocean",
                    environment="underwater",
                    region="Mariana Trench",
                    shielding=5.0,
                    device_type="Rad-Hard",
                    status="online",
                    load=0.75
                ),
                models.Node(
                    name="node-epsilon-desert",
                    environment="desert",
                    region="Sahara",
                    shielding=1.0,
                    device_type="DRAM",
                    status="online",
                    load=0.50
                )
            ]
            
            for node in nodes_to_seed:
                db.add(node)
            db.commit()
            
            # Create initial logs
            seeded_nodes = db.query(models.Node).all()
            for node in seeded_nodes:
                # Add default thermal log
                db.add(models.ThermalLog(
                    node_id=node.id,
                    temperature=24.5,
                    fatigue_factor=0.0,
                    cooling_efficiency=0.8,
                    timestamp=datetime.utcnow()
                ))
                # Add default fault simulation log
                db.add(models.FaultSim(
                    node_id=node.id,
                    intensity=1.0,
                    predicted_fault_rate=0.2,
                    memory_map="{}",
                    timestamp=datetime.utcnow()
                ))
                # Add default ECC log
                db.add(models.EccLog(
                    node_id=node.id,
                    correctable_errors=0,
                    uncorrectable_errors=0,
                    status="online",
                    timestamp=datetime.utcnow()
                ))
            db.commit()
            print("Database successfully seeded with default extreme-environment nodes.")
    finally:
        db.close()
