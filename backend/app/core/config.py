from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "EcoLens Backend"
    API_V1_STR: str = "/api/v1"

    # MongoDB
    MONGODB_URI: Optional[str] = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "ecolens_db"

    # Groq AI
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Air Quality External API (optional)
    AIR_QUALITY_API_KEY: Optional[str] = None

    # ML Model Path
    ML_MODEL_PATH: str = "ML/models/pm25_forecaster.joblib"

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
