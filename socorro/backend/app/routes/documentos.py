from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import os
import uuid
import aiofiles
from app.database import get_db
from app.models import User, Documento
from app.schemas import DocumentoOut
from app.auth import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/documentos", tags=["Documentos"])

ALLOWED_TYPES = {
    "bi_frente": ["image/jpeg", "image/png", "image/webp"],
    "bi_verso": ["image/jpeg", "image/png", "image/webp"],
    "alvara": ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    "certidao": ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    "nif": ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    "selfie": ["image/jpeg", "image/png", "image/webp"],
    "comprovativo_residencia": ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    "curriculum": ["application/pdf"],
    "certificado": ["application/pdf", "image/jpeg", "image/png"],
    "escritura": ["application/pdf", "image/jpeg", "image/png"],
}

# Required documents per account type
REQUIRED_DOCS = {
    "cidadao": ["bi_frente", "bi_verso"],
    "empresa": ["alvara", "certidao", "nif", "bi_frente", "bi_verso"],
}


@router.get("", response_model=List[DocumentoOut])
async def listar_documentos(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Documento).where(Documento.user_id == current_user.id).order_by(Documento.criado_em.desc())
    )
    return result.scalars().all()


@router.get("/status-verificacao")
async def status_verificacao(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check which required documents are uploaded and their status"""
    result = await db.execute(
        select(Documento).where(Documento.user_id == current_user.id)
    )
    docs = {d.tipo: d.status for d in result.scalars().all()}

    required = REQUIRED_DOCS.get(current_user.tipo_conta, [])
    missing = [tipo for tipo in required if tipo not in docs]
    pendentes = [tipo for tipo, status in docs.items() if status == "pendente" and tipo in required]
    aprovados = [tipo for tipo, status in docs.items() if status == "aprovado" and tipo in required]

    all_required_uploaded = len(missing) == 0
    all_required_approved = len(aprovados) == len(required)

    return {
        "tipo_conta": current_user.tipo_conta,
        "documentos_requeridos": required,
        "documentos_enviados": list(docs.keys()),
        "documentos_faltantes": missing,
        "documentos_pendentes": pendentes,
        "documentos_aprovados": aprovados,
        "todos_enviados": all_required_uploaded,
        "todos_aprovados": all_required_approved,
        "verificavel": all_required_uploaded,
    }


@router.post("/{tipo}", response_model=DocumentoOut, status_code=201)
async def upload_documento(
    tipo: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = get_settings()

    if tipo not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo inválido. Tipos aceites: {', '.join(ALLOWED_TYPES.keys())}"
        )

    if file.content_type not in ALLOWED_TYPES[tipo]:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de ficheiro não aceite para {tipo}. Aceites: {', '.join(ALLOWED_TYPES[tipo])}"
        )

    # Validate file size (max 10MB)
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Ficheiro demasiado grande. Máximo: {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
        )

    # Reset file position
    await file.seek(0)

    # Create upload directory
    upload_dir = os.path.join(settings.UPLOAD_DIR, str(current_user.id))
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{tipo}_{uuid.uuid4().hex[:12]}.{ext}"
    filepath = os.path.join(upload_dir, filename)

    # Write file
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    # Check if document of this type already exists
    existing = await db.execute(
        select(Documento).where(
            Documento.user_id == current_user.id,
            Documento.tipo == tipo,
        )
    )
    existing_doc = existing.scalar_one_or_none()

    if existing_doc:
        # Delete old file
        old_path = os.path.join(settings.UPLOAD_DIR, str(current_user.id), existing_doc.nome_ficheiro)
        if os.path.exists(old_path):
            os.remove(old_path)
        existing_doc.nome_ficheiro = filename
        existing_doc.caminho = filepath
        existing_doc.status = "pendente"
        existing_doc.motivo_rejeicao = None
        await db.commit()
        await db.refresh(existing_doc)
        return existing_doc

    doc = Documento(
        user_id=current_user.id,
        tipo=tipo,
        nome_ficheiro=filename,
        caminho=filepath,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{documento_id}/download")
async def download_documento(
    documento_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get download URL for a document"""
    result = await db.execute(
        select(Documento).where(
            Documento.id == documento_id,
            Documento.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    return {
        "url": f"/uploads/{current_user.id}/{doc.nome_ficheiro}",
        "tipo": doc.tipo,
        "nome": doc.nome_ficheiro,
    }


@router.delete("/{documento_id}", status_code=204)
async def eliminar_documento(
    documento_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Documento).where(
            Documento.id == documento_id,
            Documento.user_id == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    settings = get_settings()
    filepath = os.path.join(settings.UPLOAD_DIR, str(current_user.id), doc.nome_ficheiro)
    if os.path.exists(filepath):
        os.remove(filepath)

    await db.delete(doc)
    await db.commit()
