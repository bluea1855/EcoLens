import logging
from typing import Dict, Any, List
import groq
from app.core.config import settings
from app.services.air_service import fetch_current_air_quality
from app.services.ml_service import run_pm25_forecast
from app.services.footprint_service import get_user_footprint_summary

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are EcoPilot, an intelligent, empathetic, and scientifically grounded environmental assistant for EcoLens.

DATA SAFETY & SCIENTIFIC DISCIPLINE INSTRUCTIONS:
1. DO NOT fabricate or invent environmental measurements, pollution metrics, weather parameters, or historical readings.
2. DO NOT fabricate or invent ML forecasts.
3. CLEARLY DISTINGUISH between:
   - Measured observations (real-time air quality metrics provided in context)
   - ML model predictions (XGBoost 6-hour forecast values provided in context)
   - Derived index values (calculated AQI)
   - AI recommendations (your advice)
4. Use the backend-provided environmental context to answer user questions concisely, clearly, and accurately.
5. If user asks about carbon footprint or recommendations, refer to their specific category breakdown.
"""


async def get_ecopilot_response(prompt: str, user_id: str = "default_user", location: str = "Bhopal, India") -> Dict[str, Any]:
    # Fetch real application context from backend services
    current_air = await fetch_current_air_quality(location)
    pm25_forecast = run_pm25_forecast(current_pm25=current_air["pm25"])
    footprint = await get_user_footprint_summary(user_id)

    context_summary = (
        f"Location: {location}\n"
        f"Current Air Quality: AQI={current_air['aqi']} ({current_air['airStatus']}), "
        f"PM2.5={current_air['pm25']} µg/m³, PM10={current_air['pm10']} µg/m³.\n"
        f"6-Hour PM2.5 Forecast (XGBoost): Predicted PM2.5(t+6) = {pm25_forecast['predicted_pm25_ugm3_t6']} µg/m³.\n"
        f"User Carbon Footprint: Total = {footprint['footprint']} kg CO2e. "
        f"Top category = Transport ({footprint['categories'][0]['value']} kg CO2e).\n"
    )

    sources = ["Current air data", "PM2.5 forecast", "Your footprint"]

    # Check if Groq API key is available
    if settings.GROQ_API_KEY and len(settings.GROQ_API_KEY.strip()) > 5:
        try:
            client = groq.AsyncGroq(api_key=settings.GROQ_API_KEY)
            response = await client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Context:\n{context_summary}\n\nUser Question: {prompt}"}
                ],
                temperature=0.4,
                max_tokens=350
            )
            reply = response.choices[0].message.content.strip()
            return {
                "reply": reply,
                "sources": sources,
                "is_live_ai": True
            }
        except Exception as e:
            logger.error(f"Error calling Groq API: {e}")

    # Intelligent deterministic response fallback based on prompt content & real backend context
    normalized = prompt.lower()

    if "footprint" in normalized or "emission" in normalized or "reduce" in normalized:
        reply = (
            f"Based on your footprint record, Transport is your largest emission source at "
            f"{footprint['categories'][0]['value']} kg CO2e this month (total footprint: {footprint['footprint']} kg CO2e). "
            f"Replacing two short car trips per week with metro or electric bus could reduce your emissions by roughly 18 kg CO2e."
        )
    elif "forecast" in normalized or "tomorrow" in normalized or "predict" in normalized:
        reply = (
            f"Our XGBoost 6-hour PM2.5 forecasting model predicts PM2.5 will reach "
            f"{pm25_forecast['predicted_pm25_ugm3_t6']} µg/m³ 6 hours from now (currently measured at {current_air['pm25']} µg/m³). "
            f"This is an ML statistical forecast based on historical lag and rolling features."
        )
    elif "pollution" in normalized or "why" in normalized or "air" in normalized:
        reply = (
            f"Measured PM2.5 in {location} is currently {current_air['pm25']} µg/m³ with an AQI of {current_air['aqi']} ({current_air['airStatus']}). "
            f"Elevated levels are typically driven by vehicular emissions, industrial PM output, and stagnant atmospheric conditions. "
            f"Our 6-hour forecast indicates PM2.5 will trend towards {pm25_forecast['predicted_pm25_ugm3_t6']} µg/m³."
        )
    else:
        reply = (
            f"In {location}, measured PM2.5 is currently {current_air['pm25']} µg/m³ ({current_air['airStatus']}). "
            f"The 6-hour XGBoost forecast predicts {pm25_forecast['predicted_pm25_ugm3_t6']} µg/m³. "
            f"Your current monthly carbon footprint is {footprint['footprint']} kg CO2e. "
            f"How else can I assist with your environmental impact today?"
        )

    return {
        "reply": reply,
        "sources": sources,
        "is_live_ai": False
    }
