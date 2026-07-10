# OrbitStack ML Engine Training Report
Generated at: **2026-07-10T12:33:18.604144**
Total training dataset size: **100 samples**

## Performance Metrics

| Target Variable | Model Type | Accuracy | Precision | Recall | F1 Score | ROC-AUC |
|---|---|---|---|---|---|---|
| `node_failure_next_24h` | RandomForestClassifier | 0.9000 | 0.8462 | 1.0000 | 0.9167 | 0.9899 |
| `ecc_burst_next_24h` | GradientBoostingClassifier | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| `thermal_runaway_next_24h` | RandomForestClassifier | 0.9000 | 1.0000 | 0.5000 | 0.6667 | 0.9297 |

## Top Feature Importances

### `node_failure_next_24h`
| Feature Name | Importance Weight |
|---|---|
| `seu_count` | 0.2547 |
| `radiation_dose` | 0.2049 |
| `ecc_error_count` | 0.1318 |
| `orbit_region_encoded` | 0.0962 |
| `uptime_hours` | 0.0484 |

### `ecc_burst_next_24h`
| Feature Name | Importance Weight |
|---|---|
| `radiation_dose` | 0.8942 |
| `ecc_error_count` | 0.0678 |
| `shielding_mm` | 0.0137 |
| `seu_count` | 0.0094 |
| `workload_intensity` | 0.0081 |

### `thermal_runaway_next_24h`
| Feature Name | Importance Weight |
|---|---|
| `mean_temperature_24h` | 0.4589 |
| `current_temperature` | 0.2899 |
| `topology_blast_radius` | 0.0442 |
| `workload_intensity` | 0.0380 |
| `radiation_dose` | 0.0360 |