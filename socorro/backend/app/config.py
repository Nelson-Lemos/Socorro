from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine.url import make_url

# socorro/backend
BASE_DIR = Path(__file__).resolve().parent.parent
# raiz do repositório (socorro-platform)
REPO_ROOT = BASE_DIR.parent.parent


class Settings(BaseSettings):
    # --- Banco de dados ---
    # Aceita a URL tal como é copiada do painel do Neon. A normalização para
    # o driver asyncpg (e a remoção de parâmetros que o asyncpg não entende)
    # é feita em _normalizar_database_url.
    DATABASE_URL: str = "postgresql+asyncpg://socorro:socorro123@localhost:5432/socorro_db"
    # None = deteta automaticamente (Neon/sslmode=require => True).
    DATABASE_SSL: bool | None = None

    # --- JWT ---
    SECRET_KEY: str = "socorro-secret-key-angola-2026-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # --- CORS / frontend ---
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://localhost:3000,"
        "https://socorro-phi.vercel.app"
    )
    FRONTEND_URL: str = "https://socorro-phi.vercel.app"

    # --- Upload ---
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10485760

    # --- Integrações ---
    REDIS_URL: str = ""
    MULTICAIXA_API_KEY: str = ""
    MULTICAIXA_SECRET: str = ""
    UNITEL_MONEY_API_KEY: str = ""
    AFRIMONEY_API_KEY: str = ""
    AT_API_KEY: str = ""
    AT_USERNAME: str = ""
    AT_SENDER_ID: str = ""

    model_config = SettingsConfigDict(
        # O .env da raiz serve o docker-compose; o de backend/ tem prioridade.
        env_file=(str(REPO_ROOT / ".env"), str(BASE_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def _normalizar_database_url(self) -> "Settings":
        """Normaliza a URL do PostgreSQL para o driver asyncpg.

        O painel do Neon entrega algo como:
            postgresql://user:pass@host/db?sslmode=require&channel_binding=require

        O SQLAlchemy+asyncpg não aceita ``sslmode`` nem ``channel_binding``
        como argumentos de ligação, por isso removemos esses parâmetros e
        guardamos a necessidade de SSL em ``DATABASE_SSL``.
        """
        url = make_url(self.DATABASE_URL)

        if url.drivername.startswith("postgres") and url.drivername != "postgresql+asyncpg":
            url = url.set(drivername="postgresql+asyncpg")

        query = dict(url.query)
        sslmode = str(query.pop("sslmode", "")).lower()
        ssl_flag = str(query.pop("ssl", "")).lower()
        query.pop("channel_binding", None)

        if query != dict(url.query):
            url = url.set(query=query)

        self.DATABASE_URL = url.render_as_string(hide_password=False)

        if self.DATABASE_SSL is None:
            host = (url.host or "").lower()
            self.DATABASE_SSL = (
                host.endswith(".neon.tech")
                or sslmode in {"require", "verify-ca", "verify-full"}
                or ssl_flag in {"true", "1", "require"}
            )

        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()
