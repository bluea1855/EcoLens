"""
Command Line Prediction Script for EcoLens PM2.5 Forecaster.
"""

import sys
import os
import json
import pandas as pd

from src.data_loader import load_raw_dataset
from src.predict import predict_pm25_6h, DEFAULT_MODEL_PATH


def main():
    if not os.path.exists(DEFAULT_MODEL_PATH):
        print(f"Error: Model file '{DEFAULT_MODEL_PATH}' not found. Run 'python train.py' first.", file=sys.stderr)
        sys.exit(1)

    print("Loading recent observations for prediction...")
    df = load_raw_dataset()
    recent_obs = df.tail(48)  # Last 48 hours

    prediction = predict_pm25_6h(recent_obs)

    print("\n" + "=" * 50)
    print("      EcoLens PM2.5 Forecast Result (t+6h)")
    print("=" * 50)
    for key, val in prediction.items():
        print(f"  {key}: {val}")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    main()
