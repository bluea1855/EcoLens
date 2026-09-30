"""
Prediction Module for EcoLens PM2.5 Forecasting Pipeline.
Loads saved model artifact and predicts PM2.5 concentration 6 hours into the future.
"""

import os
from typing import Dict, Any
import pandas as pd
import numpy as np
import joblib

from src.preprocessing import preprocess_data
from src.features import engineer_features

DEFAULT_MODEL_PATH = "models/pm25_forecaster.joblib"


def load_model_artifact(model_path: str = DEFAULT_MODEL_PATH) -> Dict[str, Any]:
    """
    Loads saved model bundle containing model, feature list, and metadata.
    """
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model artifact not found at '{model_path}'. Run training first.")

    artifact = joblib.load(model_path)
    return artifact


def predict_pm25_6h(
    input_data: pd.DataFrame,
    model_path: str = DEFAULT_MODEL_PATH
) -> Dict[str, Any]:
    """
    Accepts recent observations DataFrame, extracts features, and predicts PM2.5(t+6).

    Args:
        input_data (pd.DataFrame): DataFrame containing recent hourly observations
                                   (at least 25 hours of history required for lag/rolling features).
        model_path (str): Path to saved joblib model artifact.

    Returns:
        Dict[str, Any]: Forecast prediction dictionary including target_timestamp, predicted_pm25_ugm3,
                        latest_observed_time, latest_observed_pm25, and forecast_horizon_hours.
    """
    artifact = load_model_artifact(model_path)
    model = artifact["model"]
    feature_cols = artifact["feature_list"]

    # Preprocess & engineer features for recent sequence
    # Ensure time is datetime and sorted
    df = input_data.copy()
    df["time"] = pd.to_datetime(df["time"])
    df = df.sort_values("time").reset_index(drop=True)

    # Fill missing or invalid numeric values if present in predictors
    for col in ["pm25", "pm10", "no2", "co", "so2", "o3", "temp", "rh", "wind", "rain"]:
        if col in df.columns:
            df[col] = df[col].interpolate(method="linear").ffill().bfill()

    # Engineer time, lag, and rolling features
    dt = df["time"].dt
    df["hour"] = dt.hour
    df["day_of_week"] = dt.dayofweek
    df["day_of_month"] = dt.day
    df["month"] = dt.month
    df["day_of_year"] = dt.dayofyear
    df["is_weekend"] = (dt.dayofweek >= 5).astype(int)

    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24.0)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12.0)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12.0)

    # Lag features
    for lag in [1, 3, 6, 12, 24]:
        df[f"pm25_lag_{lag}h"] = df["pm25"].shift(lag)

    # Rolling mean features
    for window in [3, 6, 12, 24]:
        df[f"pm25_roll_mean_{window}h"] = df["pm25"].shift(1).rolling(window=window).mean()

    # Take latest row where all lag/rolling features are available
    valid_features_df = df.dropna(subset=feature_cols)
    if len(valid_features_df) == 0:
        raise ValueError("Insufficient history provided for prediction. At least 25 consecutive hourly records are required.")

    latest_row = valid_features_df.iloc[-1:]
    X_pred = latest_row[feature_cols]

    predicted_val = float(model.predict(X_pred)[0])
    latest_time = latest_row["time"].values[0]
    latest_pm25 = float(latest_row["pm25"].values[0])

    target_time = pd.to_datetime(latest_time) + pd.Timedelta(hours=6)

    return {
        "latest_observation_time": str(pd.to_datetime(latest_time)),
        "latest_observed_pm25_ugm3": round(latest_pm25, 2),
        "forecast_target_time": str(target_time),
        "forecast_horizon_hours": 6,
        "predicted_pm25_ugm3_t6": round(predicted_val, 2),
        "model_used": artifact.get("model_name", "Unknown"),
    }


if __name__ == "__main__":
    from src.data_loader import load_raw_dataset

    print("Testing prediction module...")
    df = load_raw_dataset()
    sample_seq = df.tail(30)  # Last 30 hours
    prediction = predict_pm25_6h(sample_seq)
    print("Prediction Output:")
    print(prediction)
