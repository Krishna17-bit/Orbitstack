def evaluate_ecc_health(
    correctable_errors: int,
    uncorrectable_errors: int
) -> tuple[str, float]:
    """
    Evaluates node hardware health based on correctable/uncorrectable error levels.
    Returns (suggested_status, degradation_score)
    degradation_score is between 0 (fully healthy) and 100 (total failure).
    """
    # Base calculation
    # Correctable errors are soft errors, but high rates indicate physical deterioration
    # Uncorrectable errors are critical failures
    
    degradation_score = 0.0
    degradation_score += min(35.0, correctable_errors * 0.5)  # Max 35 points from correctable
    degradation_score += uncorrectable_errors * 25.0          # 25 points per uncorrectable
    
    degradation_score = min(100.0, degradation_score)
    
    if degradation_score >= 80.0 or uncorrectable_errors >= 3:
        status = "offline"
    elif degradation_score >= 20.0 or uncorrectable_errors > 0:
        status = "degraded"
    else:
        status = "online"
        
    return status, float(degradation_score)

def detect_error_burst(error_history: list[int], threshold: float = 5.0) -> bool:
    """
    Simple derivative-based burst detector.
    If the error count accelerates faster than threshold, returns True.
    """
    if len(error_history) < 3:
        return False
        
    # Calculate differences
    diffs = [error_history[i] - error_history[i-1] for i in range(1, len(error_history))]
    # If the latest difference is significantly higher than the average of previous differences, it's a burst
    avg_prev_diff = sum(diffs[:-1]) / len(diffs[:-1]) if len(diffs) > 1 else 0.0
    latest_diff = diffs[-1]
    
    if latest_diff > avg_prev_diff + threshold:
        return True
    return False
