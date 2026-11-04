from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
import os
import uuid
import aiofiles

from app.config import get_settings
from app.database import get_db
from app.models import User
from app.auth import get_current_user
from app.schemas import UserOut

router = APIRouter(tags=["Upload de imagens"])

ALLOWED_EXT = {"jpg", "jpeg", "png", "webp", "gif"}
ALLOWED_MIME_PREFIX = "image/"


def _validate(file: UploadFile) -> str:
    """Valida tipo/tamanho e devolve a extensão normalizada."""
    settings = get_settings()

    if not file.content_type or not file.content_type.startswith(ALLOWED_MIME_PREFIX):
        raise HTTPException(status_code=400, detail="Apenas ficheiros de imagem são permitidos")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED_EXT:
        ext = "jpg" if file.content_type == "image/jpeg" else file.content_type.split("/")[-1]
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Formato de imagem não suportado")

    if file.size and file.size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Imagem demasiado grande (máx. 10 MB)")
    return ext


async def _save(file: UploadFile, pasta: str) -> str:
    """Grava a imagem em disco com nome aleatório e devolve a URL pública."""
    settings = get_settings()
    ext = _validate(file)

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Imagem demasiado grande (máx. 10 MB)")
    if not content:
        raise HTTPException(status_code=400, detail="Ficheiro vazio")

    target_dir = os.path.join(settings.UPLOAD_DIR, pasta)
    os.makedirs(target_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex[:16]}.{ext}"
    async with aiofiles.open(os.path.join(target_dir, filename), "wb") as f:
        await f.write(content)

    return f"/uploads/{pasta}/{filename}"


@router.post("/upload/imagem", status_code=201)
async def upload_imagem_publica(file: UploadFile = File(...)):
    """Upload de imagem sem sessão (usado no registo: logótipo e fotografia de capa)."""
    url = await _save(file, "gerais")
    return {"url": url}


@router.post("/auth/foto-perfil", status_code=201)
async def upload_foto_perfil(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Envia a fotografia de perfil do utilizizador autenticado."""
    url = await _save(file, f"perfis/{current_user.id}")
    current_user.foto_perfil = url
    await db.commit()
    await db.refresh(current_user)
    return {"url": url, "user": UserOut.model_validate(current_user)}
