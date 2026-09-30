# EcoLens — Automated PM2.5 Forecasting ML Pipeline

A reproducible machine learning pipeline designed for **EcoLens** that predicts ambient PM2.5 concentration **6 hours into the future (`t + 6 hours`)**.

---

## 1. Dataset Overview

- **Source Dataset**: [`THULab/air-quality`](https://huggingface.co/datasets/THULab/air-quality) (originally converted from `neuralsorcerer/air-quality`, DOI: 10.57967/hf/5729)
- **Total Records**: 87,672 hourly observations
- **Date Range**: `2015-01-01 00:00:00` to `2024-12-31 23:00:00` (~10 complete years)
- **Station Location**: 1 location (Kolkata, West Bengal, India)
- **Missing Data Percentage**: 0.00% across all 11 variables in the source file
- **Duplicate Rows**: 0

### Measured Variables
- **Primary Target**: `pm25` (µg/m³) — Particulate matter < 2.5 µm
- **Pollutant Predictors**: `pm10`, `no2`, `co`, `so2`, `o3`
- **Meteorological Predictors**: `temp` (°C), `rh` (%), `wind` (m/s), `rain` (mm/h)
- **Timestamp**: `time` (Hourly UTC+05:30 IST)

---

## 2. Prediction Objective

Given historical pollution and weather observations available at time `t`, predict:

$$\text{PM2.5}(t + 6 \text{ hours})$$

> **Note**: This model predicts raw **PM2.5 concentration (µg/m³)**, NOT AQI. AQI is computed separately by downstream application services.

---

## 3. Data Cleaning & Automated Preprocessing

The preprocessing pipeline (`src/preprocessing.py`) executes automated validation and cleaning without manual dataset edits:

1. **Chronological Sorting**: Ensures strict hourly sorting by timestamp `time`.
2. **Missing Value Reporting & Imputation**: Detects NaNs and applies linear interpolation / forward fill if missing values occur in input sequences.
3. **Deduplication**: Automatically checks and removes duplicate records.
4. **Physical Outlier Clipping**: Clips invalid numerical observations to realistic physical domain boundaries (e.g., $0 \le \text{PM2.5} \le 1000$ µg/m³).
5. **Chronological Continuity**: Verifies hourly step continuity ($\Delta t = 1$ hour).
6. **Target Construction**: Constructs `pm25_target = PM2.5(t + 6)` and removes rows where target cannot be formed (the last 6 rows).

---

## 4. Feature Engineering

Features (`src/features.py`) are strictly computed using information available at time $t$ to prevent data leakage:

- **Time Features**: `hour`, `day_of_week`, `day_of_month`, `month`, `day_of_year`, `is_weekend`, plus cyclical sine/cosine transformations (`hour_sin`, `hour_cos`, `month_sin`, `month_cos`).
- **PM2.5 Lags**: Historical PM2.5 values at $t-1\text{h}$, $t-3\text{h}$, $t-6\text{h}$, $t-12\text{h}$, and $t-24\text{h}$.
- **PM2.5 Rolling Means**: Moving window averages over $3\text{h}$, $6\text{h}$, $12\text{h}$, and $24\text{h}$ (shifted to exclude time $t+k$ where $k \ge 1$).
- **Multi-variable Inputs**: `pm10`, `no2`, `co`, `so2`, `o3`, `temp`, `rh`, `wind`, `rain`.

Total engineered predictor variables: **29 features**.

---

## 5. Chronological Train / Validation / Test Split

To preserve temporal structure and avoid data leakage across time:

- **Train Set (~70%)**: `2015-01-02 00:00:00` to `2022-01-01 04:00:00` (61,349 rows)
- **Validation Set (~15%)**: `2022-01-01 05:00:00` to `2023-07-02 22:00:00` (13,146 rows)
- **Test Set (~15%)**: `2023-07-02 23:00:00` to `2024-12-31 17:00:00` (13,147 rows)

---

## 6. Model Comparison & Results

Four candidate models were evaluated on the validation set:

| Model | MAE (µg/m³) | RMSE (µg/m³) | $R^2$ | MAPE (%) |
| :--- | :---: | :---: | :---: | :---: |
| Persistence Baseline ($\text{PM2.5}_{t+6} = \text{PM2.5}_t$) | 24.2751 | 37.5991 | 0.0599 | 63.55% |
| Random Forest Regressor | 16.6005 | 25.5983 | 0.5642 | 48.89% |
| HistGradientBoosting Regressor | 16.2161 | 24.9899 | 0.5847 | 47.16% |
| **XGBoost Regressor (Selected)** | **16.2092** | **24.7408** | **0.5929** | **47.74%** |

### Final Test Set Performance (XGBoost)

Selected based on top validation $R^2$ and lowest MAE/RMSE:

- **MAE**: **17.3525 µg/m³**
- **RMSE**: **28.4428 µg/m³**
- **$R^2$**: **0.5456**
- **MAPE**: **49.05%**

Saved model artifact location: `models/pm25_forecaster.joblib`

---

## 7. How to Retrain & Run Predictions

### Retrain the Model
To re-run data downloading, cleaning, feature engineering, model training, evaluation, plot generation, and artifact saving:

```bash
python train.py
```

### Make a Prediction
To load the trained model artifact and predict PM2.5 for $t+6$ hours given recent observations:

```bash
python predict.py
```

Or programmatically in Python / FastAPI backend:

```python
from src.predict import predict_pm25_6h
import pandas as pd

recent_data = pd.read_csv("recent_observations.csv")  # Requires >= 25 hours history
result = predict_pm25_6h(recent_data)

print(result)
# Output:
# {
#   'latest_observation_time': '2024-12-31 23:00:00',
#   'latest_observed_pm25_ugm3': 127.73,
#   'forecast_target_time': '2025-01-01 05:00:00',
#   'forecast_horizon_hours': 6,
#   'predicted_pm25_ugm3_t6': 124.85,
#   'model_used': 'XGBoost'
# }
```

### Run Tests
```bash
PYTHONPATH=. pytest
```

---

## 8. Visual Evaluation Artifacts

Generated under `reports/`:
1. `reports/actual_vs_predicted.png`: Ground truth vs predicted PM2.5 values.
2. `reports/error_distribution.png`: Histogram of prediction residuals.
3. `reports/feature_importance.png`: Feature importance rankings for XGBoost.
4. `reports/timeseries_forecast.png`: Time-series forecast vs ground truth across test snapshot.
5. `reports/evaluation_report.json`: JSON report containing metric metrics and dataset metadata.

---

## 9. Scientific Distinction & Limitations

- **MEASURED DATA vs MODEL PREDICTIONS**: Observations up to time $t$ represent ground-truth physical sensor measurements. Outputs for $t+6$ are statistical ML forecasts.
- **Causation Disclaimer**: Feature importances indicate correlation and predictive relevance in tree splits; they do NOT prove physical causality between specific pollutants or emission sources.
- **Forecast Horizon**: Valid strictly for a 6-hour forecast window (`t + 6 hours`).
- **Single Station Context**: Trained on long-term data for Kolkata, West Bengal, India. Generalizing to other geographical locations requires local calibration or fine-tuning.
