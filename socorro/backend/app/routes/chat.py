from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict
import json
from app.database import get_db, async_session
from app.models import User, Pedido, Mensagem
from app.schemas import MensagemCreate, MensagemOut
from app.auth import get_current_user, create_access_token
from jose import JWTError, jwt
from app.config import get_settings

router = APIRouter(prefix="/chat", tags=["Chat"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, pedido_id: str):
        await websocket.accept()
        if pedido_id not in self.active_connections:
            self.active_connections[pedido_id] = []
        self.active_connections[pedido_id].append(websocket)

    def disconnect(self, websocket: WebSocket, pedido_id: str):
        if pedido_id in self.active_connections:
            self.active_connections[pedido_id].remove(websocket)
            if not self.active_connections[pedido_id]:
                del self.active_connections[pedido_id]

    async def broadcast(self, pedido_id: str, message: dict):
        if pedido_id in self.active_connections:
            for connection in self.active_connections[pedido_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()


@router.get("/{pedido_id}/mensagens", response_model=List[MensagemOut])
async def listar_mensagens(
    pedido_id: str,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify user is part of this pedido
    result = await db.execute(select(Pedido).where(Pedido.id == pedido_id))
    pedido = result.scalar_one_or_none()
    if not pedido:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if pedido.criado_por_id != current_user.id and pedido.prestador_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Sem permissão")

    result = await db.execute(
        select(Mensagem)
        .where(Mensagem.pedido_id == pedido_id)
        .order_by(Mensagem.criado_em.desc())
        .offset(skip)
        .limit(limit)
    )
    mensagens = result.scalars().all()
    return list(reversed(mensagens))


@router.post("/{pedido_id}/mensagens", response_model=MensagemOut, status_code=201)
async def enviar_mensagem(
    pedido_id: str,
    msg_data: MensagemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Pedido).where(Pedido.id == pedido_id))
    pedido = result.scalar_one_or_none()
    if not pedido:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if pedido.criado_por_id != current_user.id and pedido.prestador_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Sem permissão")

    msg = Mensagem(
        pedido_id=pedido_id,
        remetente_id=current_user.id,
        conteudo=msg_data.conteudo,
        tipo=msg_data.tipo,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    # Broadcast via WebSocket
    await manager.broadcast(pedido_id, {
        "id": str(msg.id),
        "pedido_id": pedido_id,
        "remetente_id": str(current_user.id),
        "remetente_nome": current_user.nome,
        "conteudo": msg.conteudo,
        "tipo": msg.tipo,
        "lida": False,
        "criado_em": msg.criado_em.isoformat(),
    })

    return MensagemOut(
        id=msg.id,
        pedido_id=msg.pedido_id,
        remetente_id=msg.remetente_id,
        conteudo=msg.conteudo,
        tipo=msg.tipo,
        lida=msg.lida,
        criado_em=msg.criado_em,
        remetente_nome=current_user.nome,
    )


@router.websocket("/{pedido_id}/ws")
async def websocket_endpoint(websocket: WebSocket, pedido_id: str, token: str = None):
    settings = get_settings()

    # Authenticate via query param token
    if not token:
        await websocket.close(code=4001)
        return

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    # Verify user is part of pedido
    async with async_session() as db:
        result = await db.execute(select(Pedido).where(Pedido.id == pedido_id))
        pedido = result.scalar_one_or_none()
        if not pedido or (str(pedido.criado_por_id) != user_id and str(pedido.prestador_id) != user_id):
            await websocket.close(code=4003)
            return

    await manager.connect(websocket, pedido_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle ping/pong or other messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, pedido_id)
