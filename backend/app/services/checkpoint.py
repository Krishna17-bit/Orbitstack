import math

def calculate_optimal_checkpoint(
    predicted_fault_rate_per_hour: float,
    checkpoint_cost_mins: float = 2.0
) -> tuple[float, float]:
    """
    Computes the optimal checkpoint interval (minutes) and expected loss reduction.
    Uses Young-Daly equations:
      T_opt = sqrt(2 * C * M) + C  (in minutes)
    Where:
      C = checkpoint_cost_mins
      M = Mean Time Between Failures (MTBF) in minutes
    """
    # If fault rate is negligible, set interval to a default maximum (e.g., 240 mins)
    if predicted_fault_rate_per_hour <= 0.001:
        return 240.0, 0.0
        
    mtbf_mins = 60.0 / predicted_fault_rate_per_hour
    
    # Young's basic formula
    # T_opt = sqrt(2 * C * M)
    # Daly's formula
    # T_opt = sqrt(2 * C * M) + C
    optimal_interval = math.sqrt(2.0 * checkpoint_cost_mins * mtbf_mins) + checkpoint_cost_mins
    
    # Ensure interval isn't absurdly small or large
    optimal_interval = max(checkpoint_cost_mins * 1.5, min(1440.0, optimal_interval))
    
    # Calculate compute waste/loss per 24 hours (1440 mins)
    # Waste = (C / T) + (T / 2M)
    # Under standard 60 mins checkpoint:
    standard_t = 60.0
    waste_std = (checkpoint_cost_mins / standard_t) + (standard_t / (2.0 * mtbf_mins))
    
    # Under optimal checkpoint:
    waste_opt = (checkpoint_cost_mins / optimal_interval) + (optimal_interval / (2.0 * mtbf_mins))
    
    # Expected compute loss reduction per day (in hours of compute saved)
    # 24 hours * difference in waste fraction
    expected_loss_reduction = max(0.0, (waste_std - waste_opt) * 24.0)
    
    return float(optimal_interval), float(expected_loss_reduction)
