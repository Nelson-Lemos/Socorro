from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import get_settings
from app.database import verificar_ligacao
from app.routes import auth, pedidos, chat, pagamentos, avaliacoes, profissionais, uploads
import os

settings = get_settings()

app = FastAPI(
    title="Socorro! API",
    description="Plataforma de ajuda mútua para Angola",
    version="2.0.0",
)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routes
app.include_router(auth.router)
app.include_router(pedidos.router)
app.include_router(chat.router)
app.include_router(pagamentos.router)
app.include_router(avaliacoes.router)
app.include_router(profissionais.router)
app.include_router(uploads.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Socorro! API", "version": "2.0.0"}


@app.get("/health/db")
async def health_db():
    estado = await verificar_ligacao()
    ok = estado.get("database") == "ok"
    return {"status": "ok" if ok else "degradado", **estado}


@app.get("/")
async def root():
    return {
        "name": "Socorro! API",
        "version": "2.0.0",
        "docs": "/docs",
    }
