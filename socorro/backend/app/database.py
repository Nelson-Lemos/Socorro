from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Prepara para compatibilidade com Neon pooler (pgBouncer mode) desativando
# prepared statement cache
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args={
        "ssl": True,
        "statement_cache_size": 0,
        "max_cacheable_statement_size": 0,
    },
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
