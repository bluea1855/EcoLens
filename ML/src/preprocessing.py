"""
Automated Data Preprocessing Module for EcoLens PM2.5 Pipeline.
Handles validation, missing value reporting, deduplication, chronological sorting,
invalid numeric value detection, target construction, and continuity checks.
"""

from typing import Tuple, Dict, Any
import pandas as pd
import numpy as np


TARGET_HORIZON_HOURS = 6
TARGET_COL = "pm25_target"
PM25_COL = "pm25"
TIME_COL = "time"

# Physical validity boundaries for air quality & meteorology
PHYSICAL_RANGES = {
    "pm25": (0.0, 1000.0),
    "pm10": (0.0, 2000.0),
    "no2": (0.0, 1000.0),
    "co": (0.0, 100.0),
    "so2": (0.0, 500.0),
    "o3": (0.0, 500.0),
    "temp": (-50.0, 60.0),
    "rh": (0.0, 100.0),
    "wind": (0.0, 100.0),
    "rain": (0.0, 500.0),
}


def preprocess_data(
    df: pd.DataFrame,
    target_horizon: int = TARGET_HORIZON_HOURS
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Automated preprocessing pipeline for EcoLens PM2.5 forecasting.

    Steps:
    1. Standardize timestamp & sort chronologically.
    2. Check and report missing values per column.
    3. Remove exact duplicate records.
    4. Detect and clip impossible / extreme physical outlier values conservatively.
    5. Check chronological continuity (hourly delta).
    6. Construct target PM2.5(t + forecast_horizon).
    7. Remove records where target cannot be constructed (last forecast_horizon rows).

    Args:
        df (pd.DataFrame): Raw input DataFrame.
        target_horizon (int): Hours into the future for target prediction (default: 6).

    Returns:
        Tuple[pd.DataFrame, Dict[str, Any]]: Processed DataFrame and preprocessing report dictionary.
    """
    report = {}
    df = df.copy()

    # 1. Normalize timestamp & sort chronologically
    df[TIME_COL] = pd.to_datetime(df[TIME_COL])
    df = df.sort_values(TIME_COL).reset_index(drop=True)
    report["time_range_start"] = str(df[TIME_COL].min())
    report["time_range_end"] = str(df[TIME_COL].max())

    # 2. Check and report missing values
    missing_before = df.isnull().sum().to_dict()
    report["missing_values_before"] = missing_before

    # 3. Deduplication
    initial_rows = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    duplicates_removed = initial_rows - len(df)
    report["duplicates_removed"] = duplicates_removed

    # 4. Handle invalid numeric values & conservative extreme clipping
    clipped_counts = {}
    for col, (min_val, max_val) in PHYSICAL_RANGES.items():
        if col in df.columns:
            invalid_mask = (df[col] < min_val) | (df[col] > max_val)
            clipped_counts[col] = int(invalid_mask.sum())
            df[col] = df[col].clip(lower=min_val, upper=max_val)
    report["extreme_outliers_clipped"] = clipped_counts

    # Forward fill / linear interpolate missing values if any exist in predictors
    missing_after_fill = {}
    for col in PHYSICAL_RANGES.keys():
        if col in df.columns:
            if df[col].isnull().sum() > 0:
                df[col] = df[col].interpolate(method="linear").ffill().bfill()
            missing_after_fill[col] = int(df[col].isnull().sum())
    report["missing_values_after_imputation"] = missing_after_fill

    # 5. Chronological continuity check
    time_diffs = df[TIME_COL].diff()
    expected_step = pd.Timedelta(hours=1)
    gaps_count = int((time_diffs > expected_step).sum())
    report["chronological_gaps_count"] = gaps_count

    # 6. Target construction: PM2.5(t + target_horizon)
    df[TARGET_COL] = df[PM25_COL].shift(-target_horizon)

    # 7. Remove rows where target cannot be constructed
    valid_target_df = df.dropna(subset=[TARGET_COL]).copy().reset_index(drop=True)
    report["rows_dropped_missing_target"] = len(df) - len(valid_target_df)
    report["final_processed_rows"] = len(valid_target_df)

    return valid_target_df, report


if __name__ == "__main__":
    from src.data_loader import load_raw_dataset
    raw_df = load_raw_dataset()
    clean_df, report = preprocess_data(raw_df)
    print("Preprocessing completed successfully.")
    print("Report:", report)
