from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import uuid

app = FastAPI(title="Socorro! API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Configurações JWT ---
SECRET_KEY = "socorro-secret-key-angola-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# --- Base de dados em memória (simulada) ---
db_users: dict = {}
db_pedidos: dict = {}

# --- Schemas ---
class UserBase(BaseModel):
    nome: str
    email: str
    telefone: Optional[str] = None
    tipo_conta: str  # "cidadao" | "empresa"
    localizacao: Optional[str] = None

class UserCreate(UserBase):
    password: str
    # Cidadão
    idade: Optional[int] = None
    genero: Optional[str] = None
    competencias: Optional[str] = None
    # Empresa
    nif: Optional[str] = None
    area_atuacao: Optional[str] = None

class UserOut(UserBase):
    id: str
    foto_perfil: Optional[str] = None
    descricao: Optional[str] = None
    disponibilidade: Optional[str] = None
    raio_atuacao: Optional[int] = None
    verificado: bool = False
    criado_em: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class PedidoCreate(BaseModel):
    titulo: str
    categoria: str
    descricao: str
    localizacao: str
    urgencia: str  # "urgente" | "moderada" | "planeada"

class PedidoOut(BaseModel):
    id: str
    titulo: str
    categoria: str
    descricao: str
    localizacao: str
    urgencia: str
    status: str
    criado_por: str
    criado_em: str
    valor: Optional[float] = None

# --- Helpers ---
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None or user_id not in db_users:
            raise HTTPException(status_code=401, detail="Token inválido")
        return db_users[user_id]
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# --- Rotas de Autenticação ---
@app.post("/auth/register", response_model=Token, status_code=201)
def register(user: UserCreate):
    # Verificar se email já existe
    for u in db_users.values():
        if u["email"] == user.email:
            raise HTTPException(status_code=400, detail="Email já registado")

    user_id = str(uuid.uuid4())
    user_data = {
        "id": user_id,
        "nome": user.nome,
        "email": user.email,
        "telefone": user.telefone,
        "tipo_conta": user.tipo_conta,
        "localizacao": user.localizacao,
        "password_hash": hash_password(user.password),
        "idade": user.idade,
        "genero": user.genero,
        "competencias": user.competencias,
        "nif": user.nif,
        "area_atuacao": user.area_atuacao,
        "foto_perfil": None,
        "descricao": None,
        "disponibilidade": None,
        "raio_atuacao": 10,
        "verificado": False,
        "criado_em": datetime.utcnow().isoformat(),
    }
    db_users[user_id] = user_data

    token = create_token({"sub": user_id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserOut(**{k: v for k, v in user_data.items() if k != "password_hash"})
    }

@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends()):
    user = None
    for u in db_users.values():
        if u["email"] == form.username:
            user = u
            break
    if not user or not verify_password(form.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou palavra-passe incorretos")

    token = create_token({"sub": user["id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserOut(**{k: v for k, v in user.items() if k != "password_hash"})
    }

@app.get("/auth/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserOut(**{k: v for k, v in current_user.items() if k != "password_hash"})

# --- Rotas de Pedidos ---
@app.get("/pedidos", response_model=List[PedidoOut])
def listar_pedidos(current_user: dict = Depends(get_current_user)):
    return list(db_pedidos.values())

@app.post("/pedidos", response_model=PedidoOut, status_code=201)
def criar_pedido(pedido: PedidoCreate, current_user: dict = Depends(get_current_user)):
    pedido_id = str(uuid.uuid4())
    pedido_data = {
        "id": pedido_id,
        "titulo": pedido.titulo,
        "categoria": pedido.categoria,
        "descricao": pedido.descricao,
        "localizacao": pedido.localizacao,
        "urgencia": pedido.urgencia,
        "status": "aberto",
        "criado_por": current_user["nome"],
        "criado_em": datetime.utcnow().isoformat(),
        "valor": None,
    }
    db_pedidos[pedido_id] = pedido_data
    return pedido_data

@app.get("/pedidos/{pedido_id}", response_model=PedidoOut)
def obter_pedido(pedido_id: str, current_user: dict = Depends(get_current_user)):
    if pedido_id not in db_pedidos:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return db_pedidos[pedido_id]

@app.get("/health")
def health():
    return {"status": "ok", "service": "Socorro! API"}
