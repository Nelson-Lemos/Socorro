from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import User, Pedido, StatusPedido
from app.schemas import PedidoCreate, PedidoUpdate, PedidoOut
from app.auth import get_current_user

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


def pedido_to_out(pedido: Pedido) -> PedidoOut:
    return PedidoOut(
        id=pedido.id,
        titulo=pedido.titulo,
        categoria=pedido.categoria,
        descricao=pedido.descricao,
        localizacao=pedido.localizacao,
        latitude=pedido.latitude,
        longitude=pedido.longitude,
        urgencia=pedido.urgencia,
        status=pedido.status,
        fotos=pedido.fotos,
        criado_por_id=pedido.criado_por_id,
        prestador_id=pedido.prestador_id,
        valor=pedido.valor,
        valor_acordado=pedido.valor_acordado,
        criado_em=pedido.criado_em,
        aceito_em=pedido.aceito_em,
        concluido_em=pedido.concluido_em,
        criador_nome=pedido.criador.nome if pedido.criador else None,
        criador_foto=pedido.criador.foto_perfil if pedido.criador else None,
        criador_avaliacao_media=None,
        prestador_nome=pedido.prestador.nome if pedido.prestador else None,
        prestador_foto=pedido.prestador.foto_perfil if pedido.prestador else None,
    )


@router.get("", response_model=List[PedidoOut])
async def listar_pedidos(
    urgencia: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    meu: Optional[bool] = Query(None, description="Apenas meus pedidos (criados ou aceites)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Pedido).options(
        selectinload(Pedido.criador),
        selectinload(Pedido.prestador),
    )

    if meu:
        query = query.where(
            or_(
                Pedido.criado_por_id == current_user.id,
                Pedido.prestador_id == current_user.id,
            )
        )
    else:
        # Non-owners see only open pedidos; owners see all
        pass

    if urgencia:
        query = query.where(Pedido.urgencia == urgencia)
    if categoria:
        query = query.where(Pedido.categoria == categoria)
    if status:
        query = query.where(Pedido.status == status)

    query = query.order_by(Pedido.criado_em.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    pedidos = result.scalars().all()
    return [pedido_to_out(p) for p in pedidos]


@router.get("/matching", response_model=List[PedidoOut])
async def pedidos_matching(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Find open pedidos that match the current user's competencias and location"""
    query = select(Pedido).options(
        selectinload(Pedido.criador),
        selectinload(Pedido.prestador),
    ).where(
        Pedido.status == StatusPedido.ABERTO,
        Pedido.criado_por_id != current_user.id,
    )

    result = await db.execute(query)
    pedidos = result.scalars().all()

    # Score and sort by relevance
    scored = []
    for p in pedidos:
        score = 0
        # Category match with competencias
        if current_user.competencias and p.categoria.lower() in current_user.competencias.lower():
            score += 10
        # Urgency boost
        if p.urgencia == "urgente":
            score += 5
        elif p.urgencia == "moderada":
            score += 2
        # Location proximity (simplified)
        if p.latitude and p.longitude and current_user.latitude and current_user.longitude:
            dist = ((p.latitude - current_user.latitude) ** 2 + (p.longitude - current_user.longitude) ** 2) ** 0.5
            if dist < 0.1:  # ~10km
                score += 3
            elif dist < 0.5:
                score += 1
        scored.append((score, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [pedido_to_out(p) for _, p in scored]


@router.post("", response_model=PedidoOut, status_code=201)
async def criar_pedido(
    pedido_data: PedidoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pedido = Pedido(
        titulo=pedido_data.titulo,
        categoria=pedido_data.categoria,
        descricao=pedido_data.descricao,
        localizacao=pedido_data.localizacao,
        latitude=pedido_data.latitude,
        longitude=pedido_data.longitude,
        urgencia=pedido_data.urgencia,
        fotos=pedido_data.fotos,
        criado_por_id=current_user.id,
    )
    db.add(pedido)
    await db.commit()
    await db.refresh(pedido, ["criador"])
    return pedido_to_out(pedido)


@router.get("/{pedido_id}", response_model=PedidoOut)
async def obter_pedido(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.criador), selectinload(Pedido.prestador))
        .where(Pedido.id == pedido_id)
    )
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return pedido_to_out(pedido)


@router.put("/{pedido_id}", response_model=PedidoOut)
async def atualizar_pedido(
    pedido_id: str,
    update_data: PedidoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.criador), selectinload(Pedido.prestador))
        .where(Pedido.id == pedido_id)
    )
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.criado_por_id != current_user.id and pedido.prestador_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão")

    update_dict = update_data.model_dump(exclude_unset=True)

    if "prestador_id" in update_dict and update_dict["prestador_id"]:
        pedido.prestador_id = update_dict["prestador_id"]
        pedido.status = StatusPedido.EM_ANDAMENTO
        pedido.aceito_em = datetime.utcnow()
        del update_dict["prestador_id"]
        if "status" in update_dict:
            del update_dict["status"]

    if "status" in update_dict and update_dict["status"] == "concluido":
        pedido.status = StatusPedido.CONCLUIDO
        pedido.concluido_em = datetime.utcnow()
        del update_dict["status"]

    for field, value in update_dict.items():
        setattr(pedido, field, value)

    await db.commit()
    await db.refresh(pedido)
    return pedido_to_out(pedido)


@router.post("/{pedido_id}/aceitar", response_model=PedidoOut)
async def aceitar_pedido(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Prestador aceita um pedido"""
    result = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.criador), selectinload(Pedido.prestador))
        .where(Pedido.id == pedido_id)
    )
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.status != StatusPedido.ABERTO:
        raise HTTPException(status_code=400, detail="Pedido já não está aberto")

    if pedido.criado_por_id == current_user.id:
        raise HTTPException(status_code=400, detail="Não podes aceitar o teu próprio pedido")

    pedido.prestador_id = current_user.id
    pedido.status = StatusPedido.EM_ANDAMENTO
    pedido.aceito_em = datetime.utcnow()

    await db.commit()
    await db.refresh(pedido)
    return pedido_to_out(pedido)


@router.post("/{pedido_id}/concluir", response_model=PedidoOut)
async def concluir_pedido(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Criador ou prestador marca pedido como concluído"""
    result = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.criador), selectinload(Pedido.prestador))
        .where(Pedido.id == pedido_id)
    )
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.criado_por_id != current_user.id and pedido.prestador_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão")

    if pedido.status != StatusPedido.EM_ANDAMENTO:
        raise HTTPException(status_code=400, detail="Pedido não está em andamento")

    pedido.status = StatusPedido.CONCLUIDO
    pedido.concluido_em = datetime.utcnow()

    await db.commit()
    await db.refresh(pedido)
    return pedido_to_out(pedido)


@router.post("/{pedido_id}/cancelar", response_model=PedidoOut)
async def cancelar_pedido(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Criador cancela um pedido"""
    result = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.criador), selectinload(Pedido.prestador))
        .where(Pedido.id == pedido_id)
    )
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.criado_por_id != current_user.id:
        raise HTTPException(status_code=403, detail="Apenas o criador pode cancelar")

    if pedido.status == StatusPedido.CONCLUIDO:
        raise HTTPException(status_code=400, detail="Não é possível cancelar um pedido concluído")

    pedido.status = StatusPedido.CANCELADO

    await db.commit()
    await db.refresh(pedido)
    return pedido_to_out(pedido)


@router.delete("/{pedido_id}", status_code=204)
async def eliminar_pedido(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Pedido).where(Pedido.id == pedido_id))
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if pedido.criado_por_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão")
    await db.delete(pedido)
    await db.commit()
