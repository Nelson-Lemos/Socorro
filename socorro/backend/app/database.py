import asyncio
import logging

from sqlalchemy import text
from sqlalchemy.exc import InterfaceError, OperationalError, SQLAlchemyError
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

logger = logging.getLogger("socorro.database")

settings = get_settings()

# Prepara para compatibilidade com Neon pooler (pgBouncer mode) desativando
# prepared statement cache. O Neon é serverless: as ligações podem ser
# suspensas/recicladas e o DNS pode falhar de forma transitória, por isso
# definimos pool_recycle, timeouts e fazemos retry com backoff.
_connect_args: dict = {
    "statement_cache_size": 0,
    "max_cacheable_statement_size": 0,
    "timeout": 15,          # timeout de ligação (segundos)
    "command_timeout": 30,  # timeout de comandos
}
if settings.DATABASE_SSL:
    # Neon (e a maioria dos Postgres geridos) exige SSL.
    _connect_args["ssl"] = True

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=180,          # recicla ligações antes de o Neon as suspender
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    connect_args=_connect_args,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

try:
    from asyncpg.exceptions import (
        CannotConnectNowError,
        ConnectionDoesNotExistError,
        TooManyConnectionsError,
    )
except Exception:  # pragma: no cover - asyncpg sempre presente com este driver
    CannotConnectNowError = ConnectionDoesNotExistError = TooManyConnectionsError = ()  # type: ignore


class Base(DeclarativeBase):
    pass


def _nome_erro(exc: BaseException) -> str:
    """Extrai o erro subjacente real (ex.: asyncpg) para logs legíveis."""
    orig = getattr(exc, "orig", None)
    if orig is not None:
        return f"{type(orig).__name__}: {orig}"
    return f"{type(exc).__name__}: {exc}"


def _erro_transitorio(exc: BaseException) -> bool:
    """Detecta falhas transitórias de ligação (DNS, rede, ligação morta)."""
    if isinstance(exc, asyncio.TimeoutError):
        return True
    if isinstance(exc, (OperationalError, InterfaceError, OSError, TimeoutError)):
        return True
    if isinstance(exc, SQLAlchemyError):
        orig = getattr(exc, "orig", None)
        if isinstance(orig, (OSError, TimeoutError, CannotConnectNowError,
                             ConnectionDoesNotExistError, TooManyConnectionsError)):
            return True
    nome = getattr(getattr(exc, "orig", None), "__class__", type(exc)).__name__
    if nome in {
        "ConnectionDoesNotExistError",
        "ConnectionResetError",
        "CannotConnectNowError",
        "gaierror",
        "TooManyConnectionsError",
    }:
        return True
    return isinstance(getattr(exc, "orig", None), OSError)


def _pedido_cancelado(exc: BaseException) -> bool:
    return isinstance(exc, (asyncio.CancelledError, KeyboardInterrupt, GeneratorExit))


async def verificar_ligacao(db: AsyncSession | None = None) -> dict:
    """Executa um SELECT 1 para confirmar que o banco está acessível."""
    try:
        if db is not None:
            await db.execute(text("SELECT 1"))
        else:
            async with async_session() as sessao:
                await sessao.execute(text("SELECT 1"))
        return {"database": "ok"}
    except Exception as exc:  # noqa: BLE001 - reportado de forma controlada
        logger.warning("Falha ao verificar ligação à base de dados: %s", _nome_erro(exc))
        return {"database": "indisponivel", "erro": _nome_erro(exc)}


# Orçamento de retry: absorve blips de DNS/rede de vários segundos.
_MAX_TENTATIVAS = 5
_ESPERA_BASE = 0.5      # segundos
_ESPERA_MAX = 4.0       # teto por tentativa


async def get_db():
    """Dependência de base de dados com retry em falhas transitórias.

    Apenas a validação inicial da ligação (SELECT 1) é repetida. Depois de a
    sessão ser entregue ao endpoint, qualquer exceção (incluindo HTTPException
    403/404/400) é propagada tal como está, nunca mascarada por um 503.
    """
    from fastapi import HTTPException

    # 1) Adquire uma sessão válida, com retry apenas na ligação.
    session = None
    ultima_exc: Exception | None = None
    for tentativa in range(_MAX_TENTATIVAS):
        candidata = async_session()
        try:
            # Valida que a ligação está viva antes de a entregar ao endpoint.
            await candidata.execute(text("SELECT 1"))
            session = candidata
            break
        except Exception as exc:  # noqa: BLE001
            if _pedido_cancelado(exc):
                await candidata.close()
                raise
            await candidata.close()
            ultima_exc = exc
            if not _erro_transitorio(exc) or tentativa == _MAX_TENTATIVAS - 1:
                break
            espera = min(_ESPERA_BASE * (2 ** tentativa), _ESPERA_MAX)
            logger.warning(
                "Ligação à base de dados falhou (tentativa %d/%d): %s. Nova tentativa em %.1fs",
                tentativa + 1, _MAX_TENTATIVAS, _nome_erro(exc), espera,
            )
            await asyncio.sleep(espera)

    if session is None:
        logger.error("Base de dados indisponível: %s",
                     _nome_erro(ultima_exc) if ultima_exc else "desconhecido")
        raise HTTPException(
            status_code=503,
            detail="Serviço temporariamente indisponível. Tenta novamente em instantes.",
        )

    # 2) Entrega a sessão. Exceções do endpoint propagam-se sem serem tocadas.
    try:
        yield session
    finally:
        await session.close()
