from fastapi import APIRouter, Query, HTTPException
from typing import List

from app.schemas.schemas import (
    AirQualityCurrentResponse,
    AirQualityHistoryResponse,
    PM25ForecastResponse,
    ActivityCreate,
    ActivityRecord,
    FootprintResponse,
    EcoPilotChatRequest,
    EcoPilotChatResponse,
    AlertItem
)
from app.services.air_service import fetch_current_air_quality, fetch_air_history
from app.services.ml_service import run_pm25_forecast
from app.services.footprint_service import log_user_activity, get_user_footprint_summary
from app.services.ecopilot_service import get_ecopilot_response

router = APIRouter()


@router.get("/air/current", response_model=AirQualityCurrentResponse)
async def get_current_air(location: str = Query("Bhopal, India")):
    return await fetch_current_air_quality(location=location)


@router.get("/air/history", response_model=AirQualityHistoryResponse)
async def get_air_history_route(location: str = Query("Bhopal, India")):
    return await fetch_air_history(location=location)


@router.get("/air/forecast", response_model=PM25ForecastResponse)
async def get_pm25_forecast_route(location: str = Query("Bhopal, India")):
    air_data = await fetch_current_air_quality(location=location)
    return run_pm25_forecast(current_pm25=air_data["pm25"])


@router.get("/footprint", response_model=FootprintResponse)
async def get_footprint_route(user_id: str = Query("default_user")):
    return await get_user_footprint_summary(user_id=user_id)


@router.post("/footprint/activity", response_model=ActivityRecord)
async def post_activity_route(activity: ActivityCreate):
    return await log_user_activity(activity)


@router.get("/footprint/trend")
async def get_footprint_trend_route(user_id: str = Query("default_user")):
    summary = await get_user_footprint_summary(user_id=user_id)
    return {"user_id": user_id, "monthlyHistory": summary["monthlyHistory"]}


@router.post("/ecopilot/chat", response_model=EcoPilotChatResponse)
async def post_ecopilot_chat(req: EcoPilotChatRequest):
    return await get_ecopilot_response(
        prompt=req.prompt,
        user_id=req.user_id or "default_user",
        location=req.location or "Bhopal, India"
    )


@router.get("/alerts", response_model=List[AlertItem])
async def get_alerts_route(location: str = Query("Bhopal, India")):
    return [
        {
            "title": "PM2.5 6-hour forecast elevated",
            "detail": "Model forecasts PM2.5 levels to remain elevated over the next 6 hours.",
            "time": "12 min ago",
            "tone": "amber"
        },
        {
            "title": "Your monthly footprint is lower",
            "detail": "You are down 8.4% compared with last month.",
            "time": "Today",
            "tone": "teal"
        },
        {
            "title": "New environmental insight ready",
            "detail": f"See what is shaping air quality conditions in {location}.",
            "time": "Yesterday",
            "tone": "blue"
        }
    ]
