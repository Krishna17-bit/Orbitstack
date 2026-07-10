import sys
import os
import argparse

# Insert backend root to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.ml_training import train_local_models

def main():
    parser = argparse.ArgumentParser(description="OrbitStack Offline Predictive ML Model Trainer")
    parser.add_argument("--samples", type=int, default=10000, help="Number of synthetic samples to generate")
    args = parser.parse_args()

    print(f"[*] Starting model training pipeline with {args.samples} samples...")
    try:
        report = train_local_models(args.samples)
        print("[+] Training completed successfully.")
        print(f"[+] Dataset size: {report['dataset_size']} samples")
        print(f"[+] Report timestamp: {report['timestamp']}")
        print("\nTarget Variable Metrics:")
        for target, metrics in report["targets"].items():
            print(f"  - {target}:")
            print(f"    * Model: {metrics['model_type']}")
            print(f"    * Accuracy: {metrics['accuracy']:.4f}")
            print(f"    * Precision: {metrics['precision']:.4f}")
            print(f"    * Recall: {metrics['recall']:.4f}")
            print(f"    * F1 Score: {metrics['f1_score']:.4f}")
            print(f"    * ROC-AUC: {metrics['auc']:.4f}")
            print(f"    * Confusion Matrix: {metrics['confusion_matrix']}")
            
        print("\n[+] Models and metrics successfully serialized to models/registry/.")
    except Exception as e:
        print(f"[-] Training pipeline failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
