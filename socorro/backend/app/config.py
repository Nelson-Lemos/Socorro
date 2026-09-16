from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://socorro:socorro123@localhost:5432/socorro_db"
    SECRET_KEY: str = "socorro-secret-key-angola-2026-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10485760
    REDIS_URL: str = ""

    MULTICAIXA_API_KEY: str = ""
    MULTICAIXA_SECRET: str = ""
    UNITEL_MONEY_API_KEY: str = ""
    AFRIMONEY_API_KEY: str = ""

    AT_API_KEY: str = ""
    AT_USERNAME: str = ""
    AT_SENDER_ID: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
