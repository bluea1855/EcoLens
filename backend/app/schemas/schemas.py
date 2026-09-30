from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class PollutantReading(BaseModel):
    label: str
    value: float
    unit: str


class AirQualityCurrentResponse(BaseModel):
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    aqi: int
    airStatus: str
    pm25: float
    pm10: float
    pollutants: List[PollutantReading]
    timestamp: str


class AirQualityHistoryResponse(BaseModel):
    location: str
    pmHistory: List[float]
    timestamps: List[str]


class PM25ForecastResponse(BaseModel):
    latest_observation_time: str
    latest_observed_pm25_ugm3: float
    forecast_target_time: str
    forecast_horizon_hours: int
    predicted_pm25_ugm3_t6: float
    model_used: str
    forecast_curve: List[float]


class ActivityCreate(BaseModel):
    category: str  # Transport, Electricity, Food, Travel, Other
    user_id: Optional[str] = "default_user"
    distance_km: Optional[float] = None
    vehicle_type: Optional[str] = None  # Car, Bus, Motorcycle, Metro / train, Bicycle
    fuel_type: Optional[str] = None  # Petrol, Diesel, Electric, Hybrid
    kwh: Optional[float] = None
    details: Optional[str] = None


class ActivityRecord(BaseModel):
    id: Optional[str] = None
    user_id: str
    category: str
    co2e_kg: float
    details: str
    created_at: str


class FootprintResponse(BaseModel):
    user_id: str
    footprint: float
    footprintChange: float
    categories: List[dict]
    monthlyHistory: List[float]


class EcoPilotChatRequest(BaseModel):
    prompt: str
    user_id: Optional[str] = "default_user"
    location: Optional[str] = "Bhopal, India"


class EcoPilotChatResponse(BaseModel):
    reply: str
    sources: List[str]
    is_live_ai: bool


class AlertItem(BaseModel):
    title: str
    detail: str
    time: str
    tone: str
