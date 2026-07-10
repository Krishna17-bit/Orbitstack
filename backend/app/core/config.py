from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./orbitstack.db"
    SECRET_KEY: str = "orbitstack_super_secret_reliability_key"
    PROJECT_NAME: str = "OrbitStack API"
    SEED_DEMO_DATA: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
