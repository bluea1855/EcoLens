"""
Automated Feature Engineering Module for EcoLens PM2.5 Pipeline.
Generates temporal features, PM2.5 historical lag features, and rolling window statistics
while preventing data leakage.
"""

from typing import List, Tuple
import pandas as pd
import numpy as np


FEATURE_COLUMNS_BASE = [
    "pm25", "pm10", "no2", "co", "so2", "o3", "temp", "rh", "wind", "rain"
]

LAG_HOURS = [1, 3, 6, 12, 24]
ROLLING_HOURS = [3, 6, 12, 24]


def engineer_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """
    Constructs feature matrix from preprocessed DataFrame.

    1. Derives time features from 'time' column:
       - hour
       - day_of_week
       - day_of_month
       - month
       - day_of_year
       - is_weekend
       - cyclic transformations for hour and month (sin/cos)
    2. Derives historical PM2.5 lag features (1h, 3h, 6h, 12h, 24h).
    3. Derives rolling window PM2.5 statistics (3h, 6h, 12h, 24h mean).
    4. Drops rows with NaN values resulting from maximum lag history (24h).

    IMPORTANT:
    The target variable 'pm25_target' (t + 6h) is NEVER used in feature calculation.

    Args:
        df (pd.DataFrame): Preprocessed DataFrame containing 'time', 'pm25', and 'pm25_target'.

    Returns:
        Tuple[pd.DataFrame, List[str]]: Feature-enriched DataFrame and list of feature names.
    """
    df = df.copy()

    # Ensure chronological order before lag / rolling calculations
    df = df.sort_values("time").reset_index(drop=True)

    # 1. Time Features
    dt = df["time"].dt
    df["hour"] = dt.hour
    df["day_of_week"] = dt.dayofweek
    df["day_of_month"] = dt.day
    df["month"] = dt.month
    df["day_of_year"] = dt.dayofyear
    df["is_weekend"] = (dt.dayofweek >= 5).astype(int)

    # Cyclic encoding for periodic time features
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24.0)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12.0)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12.0)

    # 2. Historical Lag Features for PM2.5
    lag_cols = []
    for lag in LAG_HOURS:
        col_name = f"pm25_lag_{lag}h"
        df[col_name] = df["pm25"].shift(lag)
        lag_cols.append(col_name)

    # 3. Rolling Statistics Features for PM2.5
    rolling_cols = []
    for window in ROLLING_HOURS:
        col_name = f"pm25_roll_mean_{window}h"
        # closed='left' or shifting by 1 ensures rolling window excludes current or future data
        df[col_name] = df["pm25"].shift(1).rolling(window=window).mean()
        rolling_cols.append(col_name)

    # 4. Construct complete list of feature columns
    time_features = [
        "hour", "day_of_week", "day_of_month", "month", "day_of_year", "is_weekend",
        "hour_sin", "hour_cos", "month_sin", "month_cos"
    ]

    predictor_cols = [col for col in FEATURE_COLUMNS_BASE if col in df.columns]
    feature_cols = predictor_cols + time_features + lag_cols + rolling_cols

    # 5. Drop initial rows containing NaNs due to maximum lag window (24 hours)
    df_clean = df.dropna(subset=feature_cols).reset_index(drop=True)

    print(f"Feature engineering completed. Matrix shape: {df_clean.shape}")
    print(f"Number of engineered features: {len(feature_cols)}")

    return df_clean, feature_cols


if __name__ == "__main__":
    from src.data_loader import load_raw_dataset
    from src.preprocessing import preprocess_data

    raw_df = load_raw_dataset()
    clean_df, _ = preprocess_data(raw_df)
    feat_df, feature_cols = engineer_features(clean_df)

    print("Sample feature matrix:")
    print(feat_df[["time", "pm25"] + feature_cols[:5] + ["pm25_target"]].head())
