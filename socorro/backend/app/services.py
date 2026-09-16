import random
import string
from datetime import datetime, timedelta
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
            print(f"[WARN] Redis indisponivel ({e}). Funcionalidades de token/OTP desativadas.")
            _redis_failed = True
            return None
    return redis_client


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def store_otp(telefone: str, otp: str, ttl: int = 300) -> None:
    r = await get_redis()
    if r:
        await r.setex(f"otp:{telefone}", ttl, otp)


async def verify_otp(telefone: str, otp: str) -> bool:
    r = await get_redis()
    if not r:
        return False
    stored = await r.get(f"otp:{telefone}")
    if stored and stored == otp:
        await r.delete(f"otp:{telefone}")
        return True
    return False


async def store_email_token(user_id: str, token: str, ttl: int = 86400) -> None:
    r = await get_redis()
    if r:
        await r.setex(f"email_verify:{token}", ttl, user_id)


async def verify_email_token(token: str) -> Optional[str]:
    r = await get_redis()
    if not r:
        return None
    user_id = await r.get(f"email_verify:{token}")
    if user_id:
        await r.delete(f"email_verify:{token}")
        return user_id
    return None


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


async def send_sms_otp(telefone: str, otp: str) -> bool:
    """Send OTP via SMS using Africa's Talking (or log in dev)"""
    if not settings.AT_API_KEY or not settings.AT_USERNAME:
        print(f"[DEV MODE] OTP para {telefone}: {otp}")
        return True

    try:
        import requests
        url = "https://api.africastalking.com/version1/messaging"
        headers = {
            "ApiKey": settings.AT_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {
            "username": settings.AT_USERNAME,
            "to": telefone,
            "message": f"O seu codigo de verificacao Socorro! e: {otp}. Valido por 5 minutos.",
        }
        if settings.AT_SENDER_ID:
            data["from"] = settings.AT_SENDER_ID

        response = requests.post(url, headers=headers, data=data, timeout=10)
        return response.status_code == 201
    except Exception as e:
        print(f"Erro ao enviar SMS: {e}")
        return False


async def send_verification_email(email: str, token: str) -> bool:
    """Send verification email (placeholder - integrate with SMTP/SendGrid)"""
    print(f"[DEV MODE] Email de verificacao para {email}: http://localhost:5173/verificar-email?token={token}")
    return True
