"""
Data Loader Module for EcoLens PM2.5 Forecasting Pipeline.
Loads THULab/air-quality dataset from Hugging Face.
"""

import os
from typing import Dict, Any, Tuple
import pandas as pd
from datasets import load_dataset


DATASET_NAME = "THULab/air-quality"


def load_raw_dataset(dataset_name: str = DATASET_NAME) -> pd.DataFrame:
    """
    Loads the THULab/air-quality dataset programmatically from Hugging Face
    and transforms it into a standardized pandas DataFrame.

    Returns:
        pd.DataFrame: DataFrame containing raw air quality and meteorological observations.
    """
    print(f"Loading dataset '{dataset_name}' from Hugging Face...")
    ds = load_dataset(dataset_name)

    # Handle TsFile Hugging Face Dataset format where single record contains list features
    split_data = ds["train"]
    row = split_data[0]

    df_dict = {}
    for col in row.keys():
        df_dict[col] = row[col]

    df = pd.DataFrame(df_dict)

    # Ensure time column is parsed as datetime
    if "time" in df.columns:
        df["time"] = pd.to_datetime(df["time"])

    print(f"Loaded dataset with shape: {df.shape}")
    return df


def inspect_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Inspects dataset schema, row count, time range, columns, missing values, duplicates, and location details.

    Returns:
        Dict[str, Any]: Summary dictionary of dataset characteristics.
    """
    missing_counts = df.isnull().sum().to_dict()
    missing_pcts = (df.isnull().mean() * 100).round(2).to_dict()
    duplicate_count = int(df.duplicated().sum())

    min_time = df["time"].min() if "time" in df.columns else None
    max_time = df["time"].max() if "time" in df.columns else None

    summary = {
        "dataset_name": DATASET_NAME,
        "num_rows": len(df),
        "num_columns": len(df.columns),
        "columns": list(df.columns),
        "time_range": {
            "start": str(min_time) if min_time is not None else None,
            "end": str(max_time) if max_time is not None else None,
        },
        "locations_stations": 1,  # Kolkata, West Bengal, India station as documented
        "duplicate_rows": duplicate_count,
        "missing_counts": missing_counts,
        "missing_pcts": missing_pcts,
    }

    return summary


if __name__ == "__main__":
    df = load_raw_dataset()
    summary = inspect_dataset(df)
    print("Dataset Inspection Summary:")
    for k, v in summary.items():
        print(f"  {k}: {v}")
