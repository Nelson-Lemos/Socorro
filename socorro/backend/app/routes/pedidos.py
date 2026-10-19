from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
import uuid
import os
import aiofiles
from math import asin, cos, radians, sin, sqrt, ceil
from app.database import get_db
from app.models import User, Pedido, StatusPedido
from app.schemas import (
    PedidoCreate, PedidoUpdate, PedidoOut,
    PedidoStatusUpdate, TrackingOut, PrestadorPosicao,
    OrcamentoCreate,
)
from app.auth import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])

# Transições permitidas entre estados
TRANSICOES = {
    "aberto": {"procurando", "cancelado"},
    "procurando": {"a_caminho", "cancelado"},
    "a_caminho": {"chegou", "em_andamento", "concluido", "cancelado"},
    "chegou": {"em_andamento", "concluido", "cancelado"},
    "em_andamento": {"concluido", "cancelado"},
}


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


def pedido_to_out(pedido: Pedido) -> PedidoOut:
    return PedidoOut(
        id=pedido.id,
        titulo=pedido.titulo,
        categoria=pedido.categoria,
        descricao=pedido.descricao,
        localizacao=pedido.localizacao,
        referencia=pedido.referencia,
        latitude=pedido.latitude,
        longitude=pedido.longitude,
        urgencia=pedido.urgencia,
        status=pedido.status,
        fotos=pedido.fotos,
        criado_por_id=pedido.criado_por_id,
        prestador_id=pedido.prestador_id,
        valor=pedido.valor,
        valor_acordado=pedido.valor_acordado,
        orcamento_status=pedido.orcamento_status,
        orcamento_itens=pedido.orcamento_itens,
        orcamento_nota=pedido.orcamento_nota,
        orcamento_enviado_em=pedido.orcamento_enviado_em,
        orcamento_aprovado_em=pedido.orcamento_aprovado_em,
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
        Pedido.status.in_([StatusPedido.ABERTO, StatusPedido.PROCURANDO]),
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
        referencia=pedido_data.referencia,
        latitude=pedido_data.latitude,
        longitude=pedido_data.longitude,
        urgencia=pedido_data.urgencia,
        fotos=pedido_data.fotos,
        criado_por_id=current_user.id,
        prestador_id=pedido_data.prestador_id,
        status=StatusPedido.PROCURANDO,
    )
    db.add(pedido)
    await db.commit()

    result = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.criador), selectinload(Pedido.prestador))
        .where(Pedido.id == pedido.id)
        .execution_options(populate_existing=True)
    )
    pedido = result.scalar_one()
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

    if pedido.status not in (StatusPedido.ABERTO, StatusPedido.PROCURANDO):
        raise HTTPException(status_code=400, detail="Pedido já não está aberto")

    if pedido.criado_por_id == current_user.id:
        raise HTTPException(status_code=400, detail="Não podes aceitar o teu próprio pedido")

    pedido.prestador_id = current_user.id
    pedido.status = StatusPedido.A_CAMINHO
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

    if pedido.status not in (StatusPedido.A_CAMINHO, StatusPedido.CHEGOU, StatusPedido.EM_ANDAMENTO):
        raise HTTPException(status_code=400, detail="Pedido ainda não está em serviço")

    pedido.status = StatusPedido.CONCLUIDO
    pedido.concluido_em = datetime.utcnow()

    await db.commit()
    await db.refresh(pedido)
    return pedido_to_out(pedido)


@router.patch("/{pedido_id}/status", response_model=PedidoOut)
async def atualizar_status_pedido(
    pedido_id: str,
    status_data: PedidoStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Avançar o pedido para o próximo estado (procurando → a_caminho → chegou → em_andamento → concluido)"""
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

    novo = status_data.status
    atual = pedido.status

    if novo not in TRANSICOES.get(atual, set()):
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível passar de '{atual}' para '{novo}'",
        )

    # Cancelamento apenas pelo criador
    if novo == "cancelado" and pedido.criado_por_id != current_user.id:
        raise HTTPException(status_code=403, detail="Apenas o criador pode cancelar")

    pedido.status = novo

    if novo == "a_caminho" and pedido.prestador_id is None:
        pedido.prestador_id = current_user.id

    if novo == "a_caminho" and pedido.aceito_em is None:
        pedido.aceito_em = datetime.utcnow()

    if novo in ("em_andamento", "chegou") and pedido.aceito_em is None:
        pedido.aceito_em = datetime.utcnow()

    if novo == "concluido":
        pedido.status = StatusPedido.CONCLUIDO
        pedido.concluido_em = datetime.utcnow()

    await db.commit()
    await db.refresh(pedido)
    return pedido_to_out(pedido)


@router.post("/{pedido_id}/orcamento", response_model=PedidoOut)
async def enviar_orcamento(
    pedido_id: str,
    orcamento_data: OrcamentoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """O prestador envia um orçamento ao cliente (diagnóstico + proposta)"""
    result = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.criador), selectinload(Pedido.prestador))
        .where(Pedido.id == pedido_id)
    )
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.prestador_id != current_user.id:
        raise HTTPException(status_code=403, detail="Apenas o profissional do pedido pode enviar orçamento")

    if pedido.status not in (StatusPedido.CHEGOU, StatusPedido.EM_ANDAMENTO):
        raise HTTPException(status_code=400, detail="Ainda não é possível enviar orçamento para este pedido")

    if orcamento_data.total <= 0:
        raise HTTPException(status_code=400, detail="O total do orçamento deve ser superior a zero")

    pedido.valor = orcamento_data.total
    pedido.orcamento_itens = (
        [it.model_dump() for it in orcamento_data.itens] if orcamento_data.itens else None
    )
    pedido.orcamento_nota = orcamento_data.nota
    pedido.orcamento_status = "enviado"
    pedido.orcamento_enviado_em = datetime.utcnow()

    await db.commit()
    await db.refresh(pedido)
    return pedido_to_out(pedido)


@router.post("/{pedido_id}/orcamento/aprovar", response_model=PedidoOut)
async def aprovar_orcamento(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """O cliente aprova o orçamento recebido"""
    result = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.criador), selectinload(Pedido.prestador))
        .where(Pedido.id == pedido_id)
    )
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.criado_por_id != current_user.id:
        raise HTTPException(status_code=403, detail="Apenas o cliente pode aprovar o orçamento")

    if pedido.orcamento_status != "enviado":
        raise HTTPException(status_code=400, detail="Não existe orçamento para aprovar")

    pedido.valor_acordado = pedido.valor
    pedido.orcamento_status = "aprovado"
    pedido.orcamento_aprovado_em = datetime.utcnow()

    await db.commit()
    await db.refresh(pedido)
    return pedido_to_out(pedido)


@router.post("/{pedido_id}/orcamento/rejeitar", response_model=PedidoOut)
async def rejeitar_orcamento(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """O cliente rejeita o orçamento recebido; o profissional pode reenviar uma nova proposta"""
    result = await db.execute(
        select(Pedido)
        .options(selectinload(Pedido.criador), selectinload(Pedido.prestador))
        .where(Pedido.id == pedido_id)
    )
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.criado_por_id != current_user.id:
        raise HTTPException(status_code=403, detail="Apenas o cliente pode rejeitar o orçamento")

    if pedido.orcamento_status != "enviado":
        raise HTTPException(status_code=400, detail="Não existe orçamento para rejeitar")

    pedido.orcamento_status = "rejeitado"

    await db.commit()
    await db.refresh(pedido)
    return pedido_to_out(pedido)


@router.get("/{pedido_id}/tracking", response_model=TrackingOut)
async def tracking_pedido(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Posição atual do prestador em relação ao local de atendimento"""
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

    prestador = None
    dist = None
    eta = None

    if pedido.prestador:
        prestador = PrestadorPosicao(
            id=pedido.prestador.id,
            nome=pedido.prestador.nome,
            foto_perfil=pedido.prestador.foto_perfil,
            latitude=pedido.prestador.latitude,
            longitude=pedido.prestador.longitude,
            atualizado_em=pedido.prestador.atualizado_em,
        )
        if (
            pedido.latitude is not None and pedido.longitude is not None
            and pedido.prestador.latitude is not None and pedido.prestador.longitude is not None
        ):
            dist = haversine(
                pedido.latitude, pedido.longitude,
                pedido.prestador.latitude, pedido.prestador.longitude,
            )
            # assume 30 km/h em zona urbana
            eta = max(1, ceil(dist / 30 * 60))

    return TrackingOut(
        pedido=pedido_to_out(pedido),
        status=pedido.status,
        prestador=prestador,
        distancia_km=round(dist, 1) if dist is not None else None,
        eta_min=eta,
    )


@router.post("/{pedido_id}/fotos", status_code=201)
async def upload_foto_pedido(
    pedido_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Envia fotografia do problema para o pedido"""
    result = await db.execute(select(Pedido).where(Pedido.id == pedido_id))
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.criado_por_id != current_user.id:
        raise HTTPException(status_code=403, detail="Apenas o criador pode adicionar fotos")

    settings = get_settings()
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Ficheiro demasiado grande")
    await file.seek(0)

    upload_dir = os.path.join(settings.UPLOAD_DIR, "pedidos", str(pedido.id))
    os.makedirs(upload_dir, exist_ok=True)

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"foto_{uuid.uuid4().hex[:12]}.{ext}"
    async with aiofiles.open(os.path.join(upload_dir, filename), "wb") as f:
        await f.write(content)

    url = f"/uploads/pedidos/{pedido.id}/{filename}"
    fotos = list(pedido.fotos or [])
    fotos.append(url)
    pedido.fotos = fotos

    await db.commit()
    return {"url": url, "nome": filename, "total": len(fotos)}


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
