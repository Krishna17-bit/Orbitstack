import pytest
from app.services.solar_storm_service import trigger_cme_storm, get_current_solar_status, resolve_solar_storm
from app.services.network_simulator import get_network_topology, trace_route
from app.services.power_service import get_eclipse_status, simulate_power_tick, perform_rejuvenation, toggle_power_scheduler, is_power_scheduler_enabled
from app.services.consensus_simulator import set_byzantine_status, get_byzantine_status, run_consensus_simulation, get_replicas_status
from app.core.database import SessionLocal, engine, Base
from app.models import models

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Pre-seed nodes if not present
        if db.query(models.Node).count() == 0:
            default_node = models.Node(
                name="test-node-leo",
                environment="space",
                region="LEO",
                shielding=2.0,
                device_type="VRAM",
                status="online",
                load=0.5
            )
            db.add(default_node)
            db.commit()
        yield db
    finally:
        db.close()

def test_solar_storm_flux_scaling(db_session):
    # Trigger an X-class CME flare
    event = trigger_cme_storm(db_session, "X", 3.0)
    assert event.flare_class == "X"
    assert event.intensity == 3.0
    assert event.status == "active"
    
    # Check that current in-memory status maps the increase
    status = get_current_solar_status()
    assert status["status"] == "active"
    assert status["base_flux"] >= 3000.0
    
    # Resolve storm and check reset
    resolve_solar_storm(db_session)
    status_resolved = get_current_solar_status()
    assert status_resolved["status"] == "resolved"
    assert status_resolved["base_flux"] == 1.0

def test_network_topology_and_routing(db_session):
    topology = get_network_topology(db_session)
    assert "nodes" in topology
    assert "links" in topology
    assert len(topology["nodes"]) >= 2  # Ground Station (0) + at least 1 LEO node
    
    # Trace path from Ground Station to test satellite
    nodes = topology["nodes"]
    sat = next(n for n in nodes if n["id"] != 0)
    
    route = trace_route(db_session, sat["id"])
    assert "path" in route
    assert "latency_ms" in route
    assert "packet_loss_pct" in route

def test_power_grid_cycles_and_rejuvenation(db_session):
    eclipse_info = get_eclipse_status()
    assert "is_eclipse" in eclipse_info
    assert "phase_name" in eclipse_info
    assert "solar_constant_w_m2" in eclipse_info
    
    # Run a tick step
    states = simulate_power_tick(db_session)
    assert len(states) > 0
    state = states[0]
    assert state.battery_soc <= 100.0
    
    # Rejuvenate and check recharge
    rejuvenated = perform_rejuvenation(db_session, state.node_id)
    assert rejuvenated.battery_soc == 100.0
    assert rejuvenated.battery_soh >= 30.0

def test_consensus_bft_vs_cft(db_session):
    # Set node as honest
    nodes = db_session.query(models.Node).all()
    target_node = nodes[0]
    set_byzantine_status(target_node.id, False)
    assert get_byzantine_status(target_node.id) is False
    
    # Test proposal under honest conditions
    res_honest = run_consensus_simulation(db_session, "TEST DATA")
    assert res_honest["raft"]["success"] is True
    assert res_honest["pbft"]["success"] is True
    
    # Inject Byzantine corruption
    set_byzantine_status(target_node.id, True)
    assert get_byzantine_status(target_node.id) is True
    
    # Test proposal under Byzantine condition
    res_byz = run_consensus_simulation(db_session, "TEST DATA")
    # Raft must report divergence due to Byzantine behavior
    assert res_byz["raft"]["success"] is False
    assert "SPLIT-BRAIN" in res_byz["raft"]["detail"]
    
    # Restore honest state for cleanup
    set_byzantine_status(target_node.id, False)
