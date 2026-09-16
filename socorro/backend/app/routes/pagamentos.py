from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime
from app.database import get_db
from app.models import User, Pedido, Pagamento, StatusPagamento
from app.schemas import PagamentoCreate, PagamentoOut
from app.auth import get_current_user

router = APIRouter(prefix="/pagamentos", tags=["Pagamentos"])

TAXA_PLATAFORMA = 0.25  # 25%


def generate_rup() -> str:
    return f"SOC-{uuid.uuid4().hex[:8].upper()}-{datetime.utcnow().strftime('%Y%m%d')}"


@router.post("/{pedido_id}", response_model=PagamentoOut, status_code=201)
async def criar_pagamento(
    pedido_id: str,
    pag_data: PagamentoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Pedido).where(Pedido.id == pedido_id))
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.criado_por_id != current_user.id:
        raise HTTPException(status_code=403, detail="Apenas o cliente pode efetuar o pagamento")

    existing = await db.execute(select(Pagamento).where(Pagamento.pedido_id == pedido_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Pagamento já existe para este pedido")

    valor = pag_data.valor or pedido.valor_acordado or 0
    if valor <= 0:
        raise HTTPException(status_code=400, detail="Valor inválido")

    taxa = round(valor * TAXA_PLATAFORMA, 2)
    valor_prestador = round(valor - taxa, 2)

    pagamento = Pagamento(
        pedido_id=pedido_id,
        metodo=pag_data.metodo,
        valor_total=valor,
        taxa_plataforma=taxa,
        valor_prestador=valor_prestador,
        rup=generate_rup(),
        status=StatusPagamento.PENDENTE,
    )
    db.add(pagamento)
    pedido.valor = valor
    await db.commit()
    await db.refresh(pagamento)
    return pagamento


@router.get("/{pedido_id}", response_model=PagamentoOut)
async def obter_pagamento(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Pagamento).join(Pedido).where(Pagamento.pedido_id == pedido_id)
    )
    pagamento = result.scalar_one_or_none()
    if not pagamento:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    return pagamento


@router.post("/{pedido_id}/confirmar-pagamento", response_model=PagamentoOut)
async def confirmar_pagamento(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Simula a confirmação de pagamento (em produção, seria webhook do gateway)"""
    result = await db.execute(
        select(Pagamento).where(Pagamento.pedido_id == pedido_id)
    )
    pagamento = result.scalar_one_or_none()
    if not pagamento:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    pagamento.status = StatusPagamento.RETIDO
    pagamento.pago_em = datetime.utcnow()
    await db.commit()
    await db.refresh(pagamento)
    return pagamento


@router.post("/{pedido_id}/libertar", response_model=PagamentoOut)
async def libertar_pagamento(
    pedido_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liberta o pagamento após confirmação de conclusão por ambas as partes"""
    result = await db.execute(
        select(Pagamento).where(Pagamento.pedido_id == pedido_id)
    )
    pagamento = result.scalar_one_or_none()
    if not pagamento:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    result_pedido = await db.execute(select(Pedido).where(Pedido.id == pedido_id))
    pedido = result_pedido.scalar_one_or_none()

    # Ambas as partes devem confirmar conclusao
    if pedido.status != "concluido":
        raise HTTPException(status_code=400, detail="Pedido ainda não foi concluído")

    if pagamento.status != "retido":
        raise HTTPException(status_code=400, detail="Pagamento não está retido")

    # Verificar se ambas as partes confirmaram (simplificado - em produção seria mais complexo)
    pagamento.status = StatusPagamento.LIBERTADO
    pagamento.libertado_em = datetime.utcnow()
    await db.commit()
    await db.refresh(pagamento)
    return pagamento
