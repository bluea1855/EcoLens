"""
Model Training and Comparison Pipeline for EcoLens PM2.5 Forecasting.
Handles chronological dataset splitting (~70% Train, ~15% Val, ~15% Test),
model training (Persistence, Random Forest, HistGradientBoosting, XGBoost),
model selection based on validation metrics, and final test evaluation.
"""

import os
import json
from typing import Tuple, Dict, Any, List
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from xgboost import XGBRegressor

from src.data_loader import load_raw_dataset
from src.preprocessing import preprocess_data, TARGET_COL, TIME_COL
from src.features import engineer_features
from src.evaluate import calculate_metrics, format_metrics_table


TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15


class PersistenceModel:
    """
    Baseline Persistence Model: Predicts PM2.5(t+6) as the latest observed PM2.5(t).
    """
    def __init__(self, pm25_col_idx: int = 0):
        self.pm25_col_idx = pm25_col_idx

    def fit(self, X, y):
        pass

    def predict(self, X):
        if isinstance(X, pd.DataFrame):
            return X["pm25"].values
        return X[:, self.pm25_col_idx]


def split_chronologically(
    df: pd.DataFrame,
    train_ratio: float = TRAIN_RATIO,
    val_ratio: float = VAL_RATIO
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Splits DataFrame chronologically without shuffling.

    Args:
        df (pd.DataFrame): Sorted feature matrix.
        train_ratio (float): Fraction for training set.
        val_ratio (float): Fraction for validation set.

    Returns:
        Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]: Train, val, test sets and split metadata.
    """
    df = df.sort_values(TIME_COL).reset_index(drop=True)
    n = len(df)

    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    train_df = df.iloc[:train_end].copy()
    val_df = df.iloc[train_end:val_end].copy()
    test_df = df.iloc[val_end:].copy()

    split_info = {
        "total_rows": n,
        "train": {
            "rows": len(train_df),
            "start": str(train_df[TIME_COL].min()),
            "end": str(train_df[TIME_COL].max()),
        },
        "validation": {
            "rows": len(val_df),
            "start": str(val_df[TIME_COL].min()),
            "end": str(val_df[TIME_COL].max()),
        },
        "test": {
            "rows": len(test_df),
            "start": str(test_df[TIME_COL].min()),
            "end": str(test_df[TIME_COL].max()),
        },
    }

    return train_df, val_df, test_df, split_info


def train_and_compare_models(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    feature_cols: List[str]
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], str]:
    """
    Trains baseline, Random Forest, HistGradientBoosting, and XGBoost models.
    Evaluates on validation set and selects the best model based on lowest MAE / RMSE.

    Returns:
        Tuple: Dictionary of trained candidate models, list of validation metrics, and name of selected model.
    """
    X_train = train_df[feature_cols]
    y_train = train_df[TARGET_COL]

    X_val = val_df[feature_cols]
    y_val = val_df[TARGET_COL]

    pm25_idx = feature_cols.index("pm25")

    models = {
        "Persistence Baseline": PersistenceModel(pm25_col_idx=pm25_idx),
        "Random Forest": RandomForestRegressor(
            n_estimators=100, max_depth=15, random_state=42, n_jobs=-1
        ),
        "HistGradientBoosting": HistGradientBoostingRegressor(
            max_iter=150, max_depth=12, random_state=42
        ),
        "XGBoost": XGBRegressor(
            n_estimators=150, max_depth=6, learning_rate=0.05, random_state=42, n_jobs=-1
        ),
    }

    val_metrics_list = []

    for name, model in models.items():
        print(f"Training/Evaluating {name}...")
        if name != "Persistence Baseline":
            model.fit(X_train, y_train)

        y_val_pred = model.predict(X_val)
        metrics = calculate_metrics(y_val.values, y_val_pred, model_name=name)
        val_metrics_list.append(metrics)
        print(f"  Validation -> MAE: {metrics['mae']}, RMSE: {metrics['rmse']}, R2: {metrics['r2']}")

    # Select best model based on validation MAE
    best_metric = min(val_metrics_list, key=lambda m: m["mae"])
    best_model_name = best_metric["model"]
    print(f"\nSelected Best Model based on Validation Performance: {best_model_name}")

    return models, val_metrics_list, best_model_name


if __name__ == "__main__":
    raw_df = load_raw_dataset()
    clean_df, prep_report = preprocess_data(raw_df)
    feat_df, feature_cols = engineer_features(clean_df)

    train_df, val_df, test_df, split_info = split_chronologically(feat_df)
    print("Split Info:")
    print(json.dumps(split_info, indent=2))

    models, val_metrics, best_model_name = train_and_compare_models(
        train_df, val_df, feature_cols
    )

    best_model = models[best_model_name]
    y_test = test_df[TARGET_COL].values
    y_test_pred = best_model.predict(test_df[feature_cols])
    test_metrics = calculate_metrics(y_test, y_test_pred, model_name=f"{best_model_name} (Test Set)")
    print("\nFinal Test Metrics:")
    print(test_metrics)
