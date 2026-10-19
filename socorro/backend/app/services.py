from typing import Optional
import redis.asyncio as redis
from app.config import get_settings

settings = get_settings()

redis_client: Optional[redis.Redis] = None
_redis_failed = False


async def get_redis() -> Optional[redis.Redis]:
    global redis_client, _redis_failed
    if _redis_failed:
        return None
    if redis_client is None:
        try:
            redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            await redis_client.ping()
        except Exception as e:
            print(f"[WARN] Redis indisponivel ({e}). Funcionalidades de token desativadas.")
            _redis_failed = True
            return None
    return redis_client


async def store_password_reset(user_id: str, token: str, ttl: int = 3600) -> None:
    r = await get_redis()
    if r:
        await r.setex(f"pwd_reset:{token}", ttl, user_id)


async def verify_password_reset(token: str) -> Optional[str]:
    r = await get_redis()
    if not r:
        return None
    user_id = await r.get(f"pwd_reset:{token}")
    if user_id:
        await r.delete(f"pwd_reset:{token}")
        return user_id
    return None
