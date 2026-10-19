from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Optional
import json
from app.database import get_db, async_session
from app.models import User, Pedido, Mensagem
from app.schemas import MensagemCreate, MensagemOut
from app.auth import get_current_user
from jose import JWTError, jwt
from app.config import get_settings

router = APIRouter(prefix="/chat", tags=["Chat"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, pedido_id: str):
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


# --- Chamadas de voz (WebRTC signaling relay) ---
class CallManager:
    """Relay de sinalização WebRTC entre os dois participantes de um pedido."""

    def __init__(self):
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, pedido_id: str, user_id: str, ws: WebSocket):
        self.rooms.setdefault(pedido_id, {})[user_id] = ws

    def disconnect(self, pedido_id: str, user_id: str, ws: WebSocket):
        room = self.rooms.get(pedido_id)
        if room and room.get(user_id) is ws:
            del room[user_id]
        if room and not room:
            del self.rooms[pedido_id]

    async def send_to_peer(self, pedido_id: str, user_id: str, message: dict) -> bool:
        room = self.rooms.get(pedido_id)
        if not room:
            return False
        for uid, ws in room.items():
            if uid != user_id:
                try:
                    await ws.send_json(message)
                    return True
                except Exception:
                    pass
        return False


call_manager = CallManager()


async def _accept_and_authorize(websocket: WebSocket, pedido_id: str, token: str) -> Optional[str]:
    """Aceita o handshake e valida o token/participação.
    Devolve user_id ou None (envia um erro JSON e fecha com código próprio)."""
    await websocket.accept()
    settings = get_settings()

    user_id = None
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
        except JWTError:
            user_id = None

    if not user_id:
        try:
            await websocket.send_json({"type": "error", "code": "token_invalido", "detail": "Token inválido ou em falta."})
        except Exception:
            pass
        await websocket.close(code=4001)
        return None

    async with async_session() as db:
        result = await db.execute(select(Pedido).where(Pedido.id == pedido_id))
        pedido = result.scalar_one_or_none()
        if not pedido or (str(pedido.criado_por_id) != user_id and str(pedido.prestador_id) != user_id):
            try:
                await websocket.send_json({"type": "error", "code": "nao_participante", "detail": "Não é participante deste pedido."})
            except Exception:
                pass
            await websocket.close(code=4003)
            return None
    return user_id


@router.websocket("/{pedido_id}/call/ws")
async def call_websocket_endpoint(websocket: WebSocket, pedido_id: str, token: str = None):
    user_id = await _accept_and_authorize(websocket, pedido_id, token)
    if user_id is None:
        return

    await call_manager.connect(pedido_id, user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                continue
            if not isinstance(data, dict):
                continue
            data["from_id"] = user_id
            # Converter "call-start" em "incoming-call" e "call-accept" em "call-accepted"
            if data.get("type") in ("call-start", "call-accept"):
                peer_message = {
                    "type": "incoming-call" if data.get("type") == "call-start" else "call-accepted",
                    "from_id": user_id,
                    "from_name": data.get("from_name", ""),
                }
                delivered = await call_manager.send_to_peer(pedido_id, user_id, peer_message)
            else:
                delivered = await call_manager.send_to_peer(pedido_id, user_id, data)
            # Avisar o chamador se o outro lado não estiver ligado
            if not delivered and data.get("type") == "call-start":
                try:
                    await websocket.send_json(
                        {"type": "peer-unavailable", "from_id": user_id,
                         "detail": "A outra pessoa está offline neste momento"}
                    )
                except Exception:
                    pass
    except WebSocketDisconnect:
        call_manager.disconnect(pedido_id, user_id, websocket)
        await call_manager.send_to_peer(
            pedido_id, user_id,
            {"type": "peer-left", "from_id": user_id},
        )


@router.websocket("/{pedido_id}/ws")
async def websocket_endpoint(websocket: WebSocket, pedido_id: str, token: str = None):
    user_id = await _accept_and_authorize(websocket, pedido_id, token)
    if user_id is None:
        return

    await manager.connect(websocket, pedido_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle ping/pong or other messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, pedido_id)


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
        .options(selectinload(Mensagem.remetente))
        .where(Mensagem.pedido_id == pedido_id)
        .order_by(Mensagem.criado_em.desc())
        .offset(skip)
        .limit(limit)
    )
    mensagens = result.scalars().all()
    return [
        MensagemOut(
            id=m.id,
            pedido_id=m.pedido_id,
            remetente_id=m.remetente_id,
            conteudo=m.conteudo,
            tipo=m.tipo,
            lida=m.lida,
            criado_em=m.criado_em,
            remetente_nome=m.remetente.nome if m.remetente else None,
        )
        for m in reversed(mensagens)
    ]


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
