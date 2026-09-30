"""
Evaluation Module for EcoLens PM2.5 Pipeline.
Calculates regression metrics (MAE, RMSE, R², MAPE) and produces metric reports.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def calculate_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    model_name: str = "Model"
) -> Dict[str, float]:
    """
    Calculates MAE, RMSE, R2, and MAPE (if safe) for time-series forecasting.

    Args:
        y_true (np.ndarray): Ground truth PM2.5 values.
        y_pred (np.ndarray): Predicted PM2.5 values.
        model_name (str): Identifier for the model.

    Returns:
        Dict[str, float]: Calculated metrics.
    """
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))

    # MAPE is calculated safely to avoid division by near-zero values
    epsilon = 1e-5
    safe_mask = np.abs(y_true) > 1.0  # Only consider observations > 1 µg/m³ for stable MAPE
    if np.sum(safe_mask) > 0:
        mape = float(np.mean(np.abs((y_true[safe_mask] - y_pred[safe_mask]) / y_true[safe_mask])) * 100)
    else:
        mape = float("nan")

    return {
        "model": model_name,
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "mape": round(mape, 2)
    }


def format_metrics_table(metrics_list: list) -> str:
    """
    Formats a list of metric dictionaries into a markdown comparison table.

    Args:
        metrics_list (list): List of dicts returned by calculate_metrics.

    Returns:
        str: Markdown table string.
    """
    df = pd.DataFrame(metrics_list)
    return df.to_markdown(index=False)
