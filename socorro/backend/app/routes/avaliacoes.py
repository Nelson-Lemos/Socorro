from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, Pedido, Avaliacao
from app.schemas import AvaliacaoCreate, AvaliacaoOut
from app.auth import get_current_user

router = APIRouter(prefix="/avaliacoes", tags=["Avaliações"])


@router.get("/{user_id}", response_model=list[AvaliacaoOut])
async def listar_avaliacoes_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Avaliacao)
        .where(Avaliacao.avaliado_id == user_id)
        .order_by(Avaliacao.criado_em.desc())
    )
    avaliacoes = result.scalars().all()
    out = []
    for a in avaliacoes:
        out.append(AvaliacaoOut(
            id=a.id,
            pedido_id=a.pedido_id,
            avaliador_id=a.avaliador_id,
            avaliado_id=a.avaliado_id,
            estrelas=a.estrelas,
            comentario=a.comentario,
            criado_em=a.criado_em,
            avaliador_nome=a.avaliador.nome if a.avaliador else None,
        ))
    return out


@router.post("/{pedido_id}", response_model=AvaliacaoOut, status_code=201)
async def criar_avaliacao(
    pedido_id: str,
    aval_data: AvaliacaoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Pedido).where(Pedido.id == pedido_id))
    pedido = result.scalar_one_or_none()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.status != "concluido":
        raise HTTPException(status_code=400, detail="Só pode avaliar pedidos concluídos")

    # Determine who is being evaluated
    if pedido.criado_por_id == current_user.id:
        avaliado_id = pedido.prestador_id
    elif pedido.prestador_id == current_user.id:
        avaliado_id = pedido.criado_por_id
    else:
        raise HTTPException(status_code=403, detail="Não participa neste pedido")

    if not avaliado_id:
        raise HTTPException(status_code=400, detail="Pedido não tem prestador atribuído")

    # Check if already evaluated
    existing = await db.execute(
        select(Avaliacao).where(
            Avaliacao.pedido_id == pedido_id,
            Avaliacao.avaliador_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Já avaliou este pedido")

    aval = Avaliacao(
        pedido_id=pedido_id,
        avaliador_id=current_user.id,
        avaliado_id=avaliado_id,
        estrelas=aval_data.estrelas,
        comentario=aval_data.comentario,
    )
    db.add(aval)
    await db.commit()
    await db.refresh(aval)

    return AvaliacaoOut(
        id=aval.id,
        pedido_id=aval.pedido_id,
        avaliador_id=aval.avaliador_id,
        avaliado_id=aval.avaliado_id,
        estrelas=aval.estrelas,
        comentario=aval.comentario,
        criado_em=aval.criado_em,
        avaliador_nome=current_user.nome,
    )
