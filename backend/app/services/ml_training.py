import os
import json
import joblib
import numpy as np
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

REGISTRY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models", "registry"))

INPUT_FEATURES = [
    "current_temperature",
    "mean_temperature_24h",
    "thermal_cycles",
    "radiation_dose",
    "seu_count",
    "ecc_error_count",
    "multi_bit_error_count",
    "uptime_hours",
    "shielding_mm",
    "orbit_region_encoded",
    "redundancy_level",
    "checkpoint_interval",
    "workload_intensity",
    "topology_blast_radius",
    "previous_failures"
]

TARGETS = [
    "node_failure_next_24h",
    "ecc_burst_next_24h",
    "thermal_runaway_next_24h"
]

def generate_synthetic_telemetry_data(count: int = 10000):
    """
    Generates realistic orbital telemetry data using physical distributions.
    Returns:
        X: numpy array of features (shape: count x 15)
        y: dict of target arrays
    """
    np.random.seed(42)
    
    # 1. Input Features
    # Temperature: 10C to 90C
    current_temp = np.random.uniform(10.0, 95.0, count)
    mean_temp_24h = current_temp * 0.9 + np.random.normal(0, 3, count)
    thermal_cycles = np.random.poisson(12, count)
    
    # Radiation dose: LEO vs SAA vs Deep Space
    # Encode regions: LEO=0, GEO=1, SAA=2, Lunar=3, Deep Space=4, Ocean Floor=5, Sahara=6
    region = np.random.randint(0, 7, count)
    
    shielding = np.random.uniform(1.0, 8.0, count)
    # Dose scales with region flux and duration
    base_flux = np.array([0.5, 2.2, 8.5, 4.0, 12.0, 0.001, 0.05])
    flux_samples = base_flux[region] + np.random.exponential(0.5, count)
    shielding_decay = np.exp(-shielding * 0.15)
    effective_flux = flux_samples * shielding_decay
    
    radiation_dose = effective_flux * np.random.uniform(5.0, 30.0, count)
    # SEUs scale with flux
    seu_count = np.random.poisson(effective_flux * 4.0).astype(float)
    
    # ECC error counts
    ecc_error_count = np.random.poisson(seu_count * 1.5).astype(float)
    # Multi bit error count is rare
    mbe_prob = 0.01 * effective_flux
    multi_bit_error_count = np.random.binomial(3, np.clip(mbe_prob, 0.0, 0.99))
    
    uptime = np.random.uniform(10.0, 5000.0, count)
    redundancy = np.random.choice([1, 2, 3], size=count, p=[0.2, 0.5, 0.3])
    checkpoint_int = np.random.uniform(15.0, 240.0, count)
    workload = np.random.uniform(0.05, 0.98, count)
    blast_radius = np.random.uniform(0.5, 5.0, count)
    prev_failures = np.random.poisson(0.1 + radiation_dose * 0.01, count)

    X = np.column_stack([
        current_temp,
        mean_temp_24h,
        thermal_cycles,
        radiation_dose,
        seu_count,
        ecc_error_count,
        multi_bit_error_count,
        uptime,
        shielding,
        region,
        redundancy,
        checkpoint_int,
        workload,
        blast_radius,
        prev_failures
    ])

    # 2. Physics-based Target Formulation
    # target 1: thermal_runaway_next_24h (Temp > 85.0)
    thermal_score = current_temp * 0.4 + mean_temp_24h * 0.4 + workload * 15.0 + np.random.normal(0, 3, count)
    thermal_runaway = (thermal_score > 68.0).astype(int)

    # target 2: ecc_burst_next_24h (Correctables > 20 or uncorrectables)
    ecc_score = ecc_error_count * 0.4 + radiation_dose * 1.2 + (8.0 - shielding) * 1.5 + np.random.normal(0, 3, count)
    ecc_burst = (ecc_score > 16.0).astype(int)

    # target 3: node_failure_next_24h (mbes, high dose, thermal runaways, random aging wearout)
    wearout_rate = (uptime / 10000.0) ** 2.0
    failure_score = (
        multi_bit_error_count * 20.0 + 
        radiation_dose * 0.8 + 
        prev_failures * 8.0 + 
        (4.0 - redundancy) * 6.0 + 
        wearout_rate * 15.0 + 
        np.random.normal(0, 4, count)
    )
    node_failure = (failure_score > 28.0).astype(int)

    y = {
        "thermal_runaway_next_24h": thermal_runaway,
        "ecc_burst_next_24h": ecc_burst,
        "node_failure_next_24h": node_failure
    }
    
    return X, y

def train_local_models(count: int = 10000):
    """
    Trains local ML models on synthetic data, evaluates them, and writes artifacts to registry.
    """
    os.makedirs(REGISTRY_DIR, exist_ok=True)
    
    X, y = generate_synthetic_telemetry_data(count)
    
    report = {
        "timestamp": datetime.utcnow().isoformat(),
        "dataset_size": count,
        "features": INPUT_FEATURES,
        "targets": {}
    }
    
    for target in TARGETS:
        y_target = y[target]
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_target, test_size=0.2, random_state=42, stratify=y_target
        )
        
        # Train both models and pick the one with better F1
        rf = RandomForestClassifier(n_estimators=30, max_depth=8, random_state=42)
        gb = GradientBoostingClassifier(n_estimators=20, max_depth=4, random_state=42)
        
        rf.fit(X_train, y_train)
        gb.fit(X_train, y_train)
        
        # Evaluate RF
        y_pred_rf = rf.predict(X_test)
        f1_rf = f1_score(y_test, y_pred_rf, zero_division=0)
        
        # Evaluate GB
        y_pred_gb = gb.predict(X_test)
        f1_gb = f1_score(y_test, y_pred_gb, zero_division=0)
        
        # Select best model
        if f1_gb > f1_rf:
            best_model = gb
            model_type = "GradientBoostingClassifier"
            y_pred = y_pred_gb
            y_prob = gb.predict_proba(X_test)[:, 1]
        else:
            best_model = rf
            model_type = "RandomForestClassifier"
            y_pred = y_pred_rf
            y_prob = rf.predict_proba(X_test)[:, 1]
            
        # Save model file
        model_path = os.path.join(REGISTRY_DIR, f"{target}.joblib")
        joblib.dump(best_model, model_path)
        
        # Compute performance metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        try:
            auc = roc_auc_score(y_test, y_prob)
        except ValueError:
            auc = 0.5
            
        cm = confusion_matrix(y_test, y_pred)
        
        # Feature importances
        importances = best_model.feature_importances_
        feature_imp = {
            feat: float(imp) for feat, imp in zip(INPUT_FEATURES, importances)
        }
        sorted_imp = dict(sorted(feature_imp.items(), key=lambda item: item[1], reverse=True))
        
        report["targets"][target] = {
            "model_type": model_type,
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "auc": float(auc),
            "confusion_matrix": cm.tolist(),
            "feature_importances": sorted_imp
        }
        
    # Save feature schema
    schema_path = os.path.join(REGISTRY_DIR, "schema.json")
    with open(schema_path, "w") as f:
        json.dump({"features": INPUT_FEATURES}, f, indent=2)
        
    # Save training report JSON
    report_json_path = os.path.join(REGISTRY_DIR, "report.json")
    with open(report_json_path, "w") as f:
        json.dump(report, f, indent=2)
        
    # Save training report Markdown
    report_md_path = os.path.join(REGISTRY_DIR, "report.md")
    write_markdown_report(report_md_path, report)
    
    return report

def write_markdown_report(filepath: str, report: dict):
    """
    Saves report metrics in clean Github flavored Markdown.
    """
    lines = [
        "# OrbitStack ML Engine Training Report",
        f"Generated at: **{report['timestamp']}**",
        f"Total training dataset size: **{report['dataset_size']} samples**\n",
        "## Performance Metrics\n",
        "| Target Variable | Model Type | Accuracy | Precision | Recall | F1 Score | ROC-AUC |",
        "|---|---|---|---|---|---|---|"
    ]
    
    for target, metrics in report["targets"].items():
        lines.append(
            f"| `{target}` | {metrics['model_type']} | {metrics['accuracy']:.4f} | {metrics['precision']:.4f} | {metrics['recall']:.4f} | {metrics['f1_score']:.4f} | {metrics['auc']:.4f} |"
        )
        
    lines.append("\n## Top Feature Importances")
    
    for target, metrics in report["targets"].items():
        lines.append(f"\n### `{target}`")
        lines.append("| Feature Name | Importance Weight |")
        lines.append("|---|---|")
        # List top 5 features
        for feat, val in list(metrics["feature_importances"].items())[:5]:
            lines.append(f"| `{feat}` | {val:.4f} |")
            
    with open(filepath, "w") as f:
        f.write("\n".join(lines))
