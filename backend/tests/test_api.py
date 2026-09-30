import pytest
import os
import sys
from fastapi.testclient import TestClient

# Add repo root and backend to path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, REPO_ROOT)
sys.path.insert(0, os.path.join(REPO_ROOT, "backend"))

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_get_air_current():
    response = client.get("/api/v1/air/current?location=Bhopal,%20India")
    assert response.status_code == 200
    data = response.json()
    assert data["location"] == "Bhopal, India"
    assert "aqi" in data
    assert "pm25" in data
    assert len(data["pollutants"]) > 0


def test_get_air_forecast():
    response = client.get("/api/v1/air/forecast?location=Bhopal,%20India")
    assert response.status_code == 200
    data = response.json()
    assert data["forecast_horizon_hours"] == 6
    assert "predicted_pm25_ugm3_t6" in data
    assert len(data["forecast_curve"]) == 7


def test_footprint_endpoints():
    response = client.get("/api/v1/footprint")
    assert response.status_code == 200
    data = response.json()
    assert "footprint" in data
    assert len(data["categories"]) > 0

    post_resp = client.post("/api/v1/footprint/activity", json={
        "category": "Transport",
        "vehicle_type": "Car",
        "distance_km": 10.0,
        "fuel_type": "Petrol"
    })
    assert post_resp.status_code == 200
    act_data = post_resp.json()
    assert act_data["co2e_kg"] == 1.92


def test_ecopilot_chat():
    response = client.post("/api/v1/ecopilot/chat", json={
        "prompt": "Why is pollution high in my area?",
        "location": "Bhopal, India"
    })
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 10
