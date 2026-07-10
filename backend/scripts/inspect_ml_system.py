import sys
import os
import json
import numpy as np

# Insert backend root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.predictive_ml import get_ml_status_details, load_registered_models, INPUT_FEATURES

def main():
    print("==================================================")
    print("      ORBITSTACK ML ENGINE HEALTH INSPECTION      ")
    print("==================================================")
    
    status = get_ml_status_details()
    print(f"Status:       [{status['status']}]")
    print(f"Model Type:   {status['model_type']}")
    print(f"Dataset Size: {status['dataset_size']} rows")
    print(f"Timestamp:    {status['training_timestamp']}")
    print(f"F1 Score:     {status['f1_score']:.4f}")
    print(f"ROC-AUC:      {status['auc']:.4f}")
    
    print("\nTop Feature Importances:")
    for feat in status["top_features"]:
        print(f"  - {feat['feature']}: {feat['importance']:.4f}")
        
    # Check physical serialized files
    registry_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "registry"))
    print(f"\nRegistry Path: {registry_dir}")
    print("Registry Directory Files:")
    if os.path.exists(registry_dir):
        files = os.listdir(registry_dir)
        for f in files:
            size_kb = os.path.getsize(os.path.join(registry_dir, f)) / 1024.0
            print(f"  - {f} ({size_kb:.2f} KB)")
    else:
        print("  - [Directory does not exist]")
        
    # Model Test Run Inference
    print("\nTest Run Sample Inference:")
    models = load_registered_models()
    if models:
        # Create a sample compute node in Deep Space under stress
        # Features mapping:
        # Temp=82.5, MeanTemp=80.0, Cycles=25, Dose=12.0, Seus=85, Eccs=120, Mbes=1, Uptime=2400.0, Shield=1.5, Region=4(Deep Space), Redundancy=1, Interval=60, Workload=0.92, Blast=2.5, PrevFailures=2
        sample_x = np.array([[
            82.5, 80.0, 25, 12.0, 85, 120, 1, 2400.0, 1.5, 4, 1, 60.0, 0.92, 2.5, 2
        ]])
        
        print("  Input Stress Vector:")
        for name, val in zip(INPUT_FEATURES, sample_x[0]):
            print(f"    * {name}: {val}")
            
        print("\n  Classifier Outputs:")
        for name, clf in models.items():
            prob = clf.predict_proba(sample_x)[0][1]
            pred = clf.predict(sample_x)[0]
            print(f"    * {name} -> Probability: {prob:.4f} (Prediction: {pred})")
            
        print("\n[+] Verification successful: Real serialized models are responding.")
    else:
        print("  [-] No real models loaded. Running under physics-based rule-based fallback mode.")
    print("==================================================")

if __name__ == "__main__":
    main()
