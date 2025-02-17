# Analysis weights for different components
TECHNICAL_ANALYSIS_WEIGHT = 0.25
SENTIMENT_ANALYSIS_WEIGHT = 0.10
SOCIAL_MONITOR_WEIGHT = 0.15
RISK_MANAGEMENT_WEIGHT = 0.50  # Risk management always has highest weight

# Validate weights sum to 1.0
assert sum([
    TECHNICAL_ANALYSIS_WEIGHT,
    SENTIMENT_ANALYSIS_WEIGHT,
    SOCIAL_MONITOR_WEIGHT,
    RISK_MANAGEMENT_WEIGHT
]) == 1.0, "Weights must sum to 1.0" 