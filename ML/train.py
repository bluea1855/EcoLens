"""
Main Training Pipeline Script for EcoLens PM2.5 Forecasting.
Executes data loading, cleaning, feature engineering, chronological splitting,
model selection, artifact export, and visual evaluation report generation.
"""

import os
import json
import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt
import seaborn as sns

from src.data_loader import load_raw_dataset, inspect_dataset
from src.preprocessing import preprocess_data, TARGET_COL, TIME_COL
from src.features import engineer_features
from src.train import split_chronologically, train_and_compare_models
from src.evaluate import calculate_metrics, format_metrics_table

MODEL_ARTIFACT_PATH = "models/pm25_forecaster.joblib"
REPORTS_DIR = "reports"


def generate_plots(
    model,
    model_name: str,
    test_df: pd.DataFrame,
    feature_cols: list,
    reports_dir: str = REPORTS_DIR
):
    """
    Generates required evaluation plots:
    1. Actual vs predicted PM2.5 scatter plot
    2. Prediction error distribution (residuals) histogram
    3. Feature importances plot
    4. PM2.5 time-series visualization showing actual vs predicted over test subset
    """
    os.makedirs(reports_dir, exist_ok=True)
    sns.set_theme(style="whitegrid")

    X_test = test_df[feature_cols]
    y_test = test_df[TARGET_COL].values
    y_pred = model.predict(X_test)
    test_times = test_df[TIME_COL].values

    residuals = y_test - y_pred

    # 1. Actual vs Predicted Scatter Plot
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, y_pred, alpha=0.3, color="teal", edgecolors="none")
    max_val = max(np.max(y_test), np.max(y_pred))
    plt.plot([0, max_val], [0, max_val], "r--", linewidth=2, label="1:1 Perfect Forecast")
    plt.xlabel("Actual PM2.5 (µg/m³)")
    plt.ylabel("Predicted PM2.5 (t+6h) (µg/m³)")
    plt.title(f"Actual vs Predicted PM2.5 (t+6h) - {model_name}")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(reports_dir, "actual_vs_predicted.png"), dpi=300)
    plt.close()

    # 2. Residual Distribution Histogram
    plt.figure(figsize=(8, 6))
    sns.histplot(residuals, bins=50, kde=True, color="indigo")
    plt.axvline(0, color="red", linestyle="--", linewidth=1.5)
    plt.xlabel("Prediction Error / Residual (Actual - Predicted) (µg/m³)")
    plt.ylabel("Frequency")
    plt.title(f"Prediction Error Distribution - {model_name}")
    plt.tight_layout()
    plt.savefig(os.path.join(reports_dir, "error_distribution.png"), dpi=300)
    plt.close()

    # 3. Feature Importances
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        fi_df = pd.DataFrame({"feature": feature_cols, "importance": importances})
        fi_df = fi_df.sort_values("importance", ascending=False).head(15)

        plt.figure(figsize=(10, 6))
        sns.barplot(data=fi_df, x="importance", y="feature", palette="viridis")
        plt.title(f"Top 15 Feature Importances - {model_name}")
        plt.xlabel("Importance Score")
        plt.ylabel("Feature")
        plt.tight_layout()
        plt.savefig(os.path.join(reports_dir, "feature_importance.png"), dpi=300)
        plt.close()

    # 4. Time-Series Visualization (Test Subset e.g., 30 days = 720 hours)
    plt.figure(figsize=(14, 6))
    subset_slice = slice(-720, None)  # Last 30 days of test set
    plt.plot(test_times[subset_slice], y_test[subset_slice], label="Actual PM2.5 (t+6)", color="black", alpha=0.8, linewidth=1.2)
    plt.plot(test_times[subset_slice], y_pred[subset_slice], label=f"Predicted PM2.5 ({model_name})", color="crimson", alpha=0.8, linewidth=1.2)
    plt.xlabel("Timestamp")
    plt.ylabel("PM2.5 (µg/m³)")
    plt.title("PM2.5 Time-Series Forecast (t+6 Hours) - 30-Day Test Snapshot")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(reports_dir, "timeseries_forecast.png"), dpi=300)
    plt.close()

    print(f"Evaluation plots saved to '{reports_dir}/'")


def run_pipeline():
    """
    Complete end-to-end training pipeline.
    """
    print("=" * 60)
    print("      EcoLens Automated PM2.5 Forecasting Pipeline")
    print("=" * 60)

    # 1. Data Ingestion
    raw_df = load_raw_dataset()
    data_summary = inspect_dataset(raw_df)

    # 2. Data Preprocessing
    clean_df, prep_report = preprocess_data(raw_df)

    # 3. Feature Engineering
    feat_df, feature_cols = engineer_features(clean_df)

    # 4. Chronological Split
    train_df, val_df, test_df, split_info = split_chronologically(feat_df)

    # 5. Model Training & Comparison
    models, val_metrics_list, best_model_name = train_and_compare_models(
        train_df, val_df, feature_cols
    )

    best_model = models[best_model_name]

    # 6. Final Evaluation on Untouched Test Set
    X_test = test_df[feature_cols]
    y_test = test_df[TARGET_COL].values
    y_test_pred = best_model.predict(X_test)

    test_metrics = calculate_metrics(y_test, y_test_pred, model_name=f"{best_model_name} (Test Set)")

    print("\n" + "=" * 60)
    print("Validation Model Comparison Table:")
    print(format_metrics_table(val_metrics_list))
    print("\nFinal Test Metrics for Selected Model:")
    print(test_metrics)
    print("=" * 60)

    # 7. Save Final Model Artifact
    os.makedirs("models", exist_ok=True)
    artifact = {
        "model": best_model,
        "model_name": best_model_name,
        "feature_list": feature_cols,
        "split_info": split_info,
        "data_summary": data_summary,
        "prep_report": prep_report,
        "val_metrics": val_metrics_list,
        "test_metrics": test_metrics,
        "forecast_horizon_hours": 6,
    }

    joblib.dump(artifact, MODEL_ARTIFACT_PATH)
    print(f"Model artifact successfully saved to '{MODEL_ARTIFACT_PATH}'")

    # 8. Generate Visualizations & Evaluation Report
    generate_plots(best_model, best_model_name, test_df, feature_cols)

    eval_report = {
        "dataset_summary": data_summary,
        "split_info": split_info,
        "validation_metrics": val_metrics_list,
        "selected_model": best_model_name,
        "final_test_metrics": test_metrics,
        "saved_model_path": MODEL_ARTIFACT_PATH,
    }

    report_file = os.path.join(REPORTS_DIR, "evaluation_report.json")
    with open(report_file, "w") as f:
        json.dump(eval_report, f, indent=2)
    print(f"Evaluation report written to '{report_file}'")


if __name__ == "__main__":
    run_pipeline()
