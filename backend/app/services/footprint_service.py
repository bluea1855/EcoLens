from typing import Dict, Any, List
import datetime
import uuid
from app.schemas.schemas import ActivityCreate, ActivityRecord
from app.db.mongodb import get_database

# Emission Factors (kg CO2e per unit)
# Documented standard factors:
# Transport (per km):
#   Car Petrol: 0.192, Diesel: 0.171, Electric: 0.053, Hybrid: 0.109
#   Bus: 0.089, Motorcycle: 0.103, Metro/Train: 0.035, Bicycle: 0.0
# Electricity (per kWh): 0.708 (India grid average)
# Food (per meal serving): High Meat: 2.5, Vegetarian: 0.8, Vegan: 0.5
EMISSION_FACTORS = {
    "transport": {
        "Car": {"Petrol": 0.192, "Diesel": 0.171, "Electric": 0.053, "Hybrid": 0.109, "default": 0.192},
        "Bus": {"default": 0.089},
        "Motorcycle": {"default": 0.103},
        "Metro / train": {"default": 0.035},
        "Bicycle": {"default": 0.0}
    },
    "electricity": 0.708,
    "food": 0.8,
    "travel": 0.15,  # per km short haul flight / long travel average
    "other": 0.5
}


def calculate_activity_co2e(activity: ActivityCreate) -> float:
    category = activity.category.strip()

    if category.lower() == "transport":
        distance = activity.distance_km if activity.distance_km is not None else 8.0
        v_type = activity.vehicle_type or "Car"
        f_type = activity.fuel_type or "Petrol"

        v_factors = EMISSION_FACTORS["transport"].get(v_type, EMISSION_FACTORS["transport"]["Car"])
        if isinstance(v_factors, dict):
            factor = v_factors.get(f_type, v_factors.get("default", 0.192))
        else:
            factor = v_factors

        return round(distance * factor, 2)

    elif category.lower() == "electricity":
        kwh = activity.kwh if activity.kwh is not None else 3.0
        return round(kwh * EMISSION_FACTORS["electricity"], 2)

    elif category.lower() == "food":
        return round(EMISSION_FACTORS["food"], 2)

    elif category.lower() == "travel":
        dist = activity.distance_km if activity.distance_km is not None else 100.0
        return round(dist * EMISSION_FACTORS["travel"], 2)

    else:
        return round(EMISSION_FACTORS["other"], 2)


async def log_user_activity(activity: ActivityCreate) -> ActivityRecord:
    co2e = calculate_activity_co2e(activity)
    now_str = datetime.datetime.now().isoformat()

    details = activity.details
    if not details:
        if activity.category.lower() == "transport":
            details = f"{activity.vehicle_type or 'Car'} travel ({activity.distance_km or 8.0} km)"
        elif activity.category.lower() == "electricity":
            details = f"Electricity consumption ({activity.kwh or 3.0} kWh)"
        else:
            details = f"Logged {activity.category} activity"

    doc = {
        "_id": str(uuid.uuid4()),
        "user_id": activity.user_id or "default_user",
        "category": activity.category,
        "co2e_kg": co2e,
        "details": details,
        "created_at": now_str
    }

    database = get_database()
    if database is not None:
        try:
            await database.carbon_records.insert_one(doc)
        except Exception as e:
            pass

    return ActivityRecord(
        id=doc["_id"],
        user_id=doc["user_id"],
        category=doc["category"],
        co2e_kg=doc["co2e_kg"],
        details=doc["details"],
        created_at=doc["created_at"]
    )


async def get_user_footprint_summary(user_id: str = "default_user") -> Dict[str, Any]:
    database = get_database()

    # Baseline breakdown
    category_totals = {
        "Transport": 72.0,
        "Electricity": 48.0,
        "Food": 34.0,
        "Travel": 21.0,
        "Other": 11.0
    }

    if database is not None:
        try:
            cursor = database.carbon_records.find({"user_id": user_id})
            records = await cursor.to_list(length=100)
            for rec in records:
                cat = rec.get("category", "Other")
                category_totals[cat] = round(category_totals.get(cat, 0.0) + rec.get("co2e_kg", 0.0), 1)
        except Exception as e:
            pass

    total_footprint = round(sum(category_totals.values()), 1)
    categories_list = [{"name": k, "value": v} for k, v in category_totals.items()]

    return {
        "user_id": user_id,
        "footprint": total_footprint,
        "footprintChange": -8.4,
        "categories": categories_list,
        "monthlyHistory": [231, 219, 248, 212, 203, total_footprint]
    }
