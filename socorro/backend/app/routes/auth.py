from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime
from app.database import get_db
from app.models import User
from app.schemas import (
    UserCreate, UserOut, Token, UserUpdate,
    PasswordResetRequest, PasswordReset,
)
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.services import (
    store_password_reset, verify_password_reset,
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/register", response_model=Token, status_code=201)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Verificar email duplicado
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email já registado")

    # Verificar telefone duplicado
    if user_data.telefone:
        result = await db.execute(select(User).where(User.telefone == user_data.telefone))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Número de telefone já registado")

    user = User(
        nome=user_data.nome,
        email=user_data.email,
        telefone=user_data.telefone,
        password_hash=hash_password(user_data.password),
        tipo_conta=user_data.tipo_conta,
        localizacao=user_data.localizacao,
        latitude=user_data.latitude,
        longitude=user_data.longitude,
        idade=user_data.idade,
        genero=user_data.genero,
        competencias=user_data.competencias,
        nif=user_data.nif,
        area_atuacao=user_data.area_atuacao,
        especialidades=user_data.especialidades,
        anos_experiencia=user_data.anos_experiencia,
        descricao=user_data.descricao,
        disponibilidade=user_data.disponibilidade,
        raio_atuacao=user_data.raio_atuacao,
        # Empresa — identidade comercial
        nome_comercial=user_data.nome_comercial,
        tipo_entidade=user_data.tipo_entidade,
        logo=user_data.logo,
        foto_capa=user_data.foto_capa,
        telefone_whatsapp=user_data.telefone_whatsapp,
        website=user_data.website,
        redes_sociais=user_data.redes_sociais,
        # Localização desagregada
        provincia=user_data.provincia,
        municipio=user_data.municipio,
        bairro=user_data.bairro,
        endereco=user_data.endereco,
        ponto_referencia=user_data.ponto_referencia,
        # Serviços e área de atendimento
        categorias_servico=user_data.categorias_servico,
        atende_estabelecimento=user_data.atende_estabelecimento,
        atende_domicilio=user_data.atende_domicilio,
        areas_atendidas=user_data.areas_atendidas,
        horario_atendimento=user_data.horario_atendimento,
        atendimento_24h=user_data.atendimento_24h,
        # Verificação / representante
        representante_nome=user_data.representante_nome,
        representante_cargo=user_data.representante_cargo,
        representante_telefone=user_data.representante_telefone,
        certidao_comercial_url=user_data.certidao_comercial_url,
        doc_representante_url=user_data.doc_representante_url,
        licenca_url=user_data.licenca_url,
        status_verificacao=user_data.status_verificacao,
        status_atendimento="online" if user_data.tipo_conta == "empresa" else "offline",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou palavra-passe incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.ativo:
        raise HTTPException(status_code=403, detail="Conta desativada")

    token = create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.put("/me", response_model=UserOut)
async def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)


# --- Password Reset ---
@router.post("/esqueci-password")
async def esqueci_password(data: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    if user:
        reset_token = uuid.uuid4().hex
        await store_password_reset(str(user.id), reset_token)
        print(f"[DEV MODE] Password reset para {data.email}: http://localhost:5173/redefinir-password?token={reset_token}")

    return {"message": "Se o email existir, receberás um link de redefinição"}


@router.post("/redefinir-password")
async def redefinir_password(data: PasswordReset, db: AsyncSession = Depends(get_db)):
    user_id = await verify_password_reset(data.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")

    user.password_hash = hash_password(data.nova_password)
    await db.commit()

    return {"message": "Palavra-passe redefinida com sucesso"}


# --- Change Password (logged in) ---
@router.post("/alterar-password")
async def alterar_password(
    current_password: str = Query(...),
    nova_password: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Palavra-passe atual incorreta")

    if len(nova_password) < 6:
        raise HTTPException(status_code=400, detail="Nova palavra-passe deve ter pelo menos 6 caracteres")

    current_user.password_hash = hash_password(nova_password)
    await db.commit()

    return {"message": "Palavra-passe alterada com sucesso"}
