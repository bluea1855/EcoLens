# EcoLens Backend

FastAPI backend service for EcoLens:
- Integrates MongoDB for carbon footprint activity logs, user context, and alerts
- Integrates physical XGBoost ML forecaster (`ML/models/pm25_forecaster.joblib`) for 6-hour PM2.5 predictions
- Integrates Open-Meteo Air Quality API for real-time pollutant measurements & EPA AQI calculation
- Integrates Groq LLM API for EcoPilot AI environmental assistant

## API Endpoints (`/api/v1`)
- `GET /api/v1/air/current` — Current air quality & EPA AQI for location
- `GET /api/v1/air/history` — Historical PM2.5 readings
- `GET /api/v1/air/forecast` — 6-hour PM2.5 prediction using XGBoost ML model
- `GET /api/v1/footprint` — User carbon footprint summary & category breakdown
- `POST /api/v1/footprint/activity` — Log activity & compute deterministic CO2e impact
- `GET /api/v1/footprint/trend` — Historical monthly footprint trend
- `POST /api/v1/ecopilot/chat` — Groq-powered EcoPilot AI response with data safety guardrails
- `GET /api/v1/alerts` — Environmental alerts & notifications

## Setup & Running

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
