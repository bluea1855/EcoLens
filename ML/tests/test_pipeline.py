"""
Unit and Integration Tests for EcoLens PM2.5 ML Pipeline.
"""

import os
import pytest
import pandas as pd
import numpy as np

from src.data_loader import inspect_dataset
from src.preprocessing import preprocess_data, TARGET_COL, TIME_COL
from src.features import engineer_features
from src.train import split_chronologically
from src.predict import predict_pm25_6h, DEFAULT_MODEL_PATH, load_model_artifact


@pytest.fixture
def mock_raw_df():
    """
    Creates mock 100-hour air quality sequence for pipeline testing.
    """
    times = pd.date_range("2024-01-01 00:00:00", periods=100, freq="1h")
    np.random.seed(42)
    df = pd.DataFrame({
        "time": times,
        "pm25": np.random.uniform(10.0, 150.0, size=100),
        "pm10": np.random.uniform(20.0, 250.0, size=100),
        "no2": np.random.uniform(5.0, 80.0, size=100),
        "co": np.random.uniform(0.1, 3.0, size=100),
        "so2": np.random.uniform(1.0, 20.0, size=100),
        "o3": np.random.uniform(5.0, 100.0, size=100),
        "temp": np.random.uniform(15.0, 35.0, size=100),
        "rh": np.random.uniform(30.0, 90.0, size=100),
        "wind": np.random.uniform(0.5, 10.0, size=100),
        "rain": np.zeros(100),
    })
    return df


def test_inspect_dataset(mock_raw_df):
    summary = inspect_dataset(mock_raw_df)
    assert summary["num_rows"] == 100
    assert summary["duplicate_rows"] == 0
    assert "time" in summary["columns"]
    assert "pm25" in summary["columns"]


def test_preprocessing(mock_raw_df):
    clean_df, report = preprocess_data(mock_raw_df, target_horizon=6)
    assert len(clean_df) == 94  # 100 - 6 missing targets
    assert TARGET_COL in clean_df.columns
    assert report["rows_dropped_missing_target"] == 6
    # Target at index 0 should equal pm25 at index 6
    assert np.isclose(clean_df.iloc[0][TARGET_COL], mock_raw_df.iloc[6]["pm25"])


def test_feature_engineering(mock_raw_df):
    clean_df, _ = preprocess_data(mock_raw_df, target_horizon=6)
    feat_df, feature_cols = engineer_features(clean_df)

    # 24 rows dropped due to maximum lag window (24h)
    assert len(feat_df) == 94 - 24
    assert "pm25_lag_1h" in feature_cols
    assert "pm25_lag_24h" in feature_cols
    assert "pm25_roll_mean_6h" in feature_cols
    assert "hour_sin" in feature_cols

    # Check no target leakage in features
    assert TARGET_COL not in feature_cols


def test_chronological_splitting(mock_raw_df):
    clean_df, _ = preprocess_data(mock_raw_df, target_horizon=6)
    feat_df, _ = engineer_features(clean_df)

    train_df, val_df, test_df, split_info = split_chronologically(feat_df, train_ratio=0.7, val_ratio=0.15)

    total = len(train_df) + len(val_df) + len(test_df)
    assert total == len(feat_df)

    # Check strict chronological order across splits
    assert train_df[TIME_COL].max() < val_df[TIME_COL].min()
    assert val_df[TIME_COL].max() < test_df[TIME_COL].min()


def test_model_artifact_and_prediction(mock_raw_df):
    if not os.path.exists(DEFAULT_MODEL_PATH):
        pytest.skip("Model artifact does not exist yet; run train.py first.")

    artifact = load_model_artifact()
    assert "model" in artifact
    assert "feature_list" in artifact

    prediction = predict_pm25_6h(mock_raw_df.tail(30))
    assert "predicted_pm25_ugm3_t6" in prediction
    assert prediction["forecast_horizon_hours"] == 6
    assert isinstance(prediction["predicted_pm25_ugm3_t6"], float)
