from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import get_settings
from app.routes import auth, pedidos, documentos, chat, pagamentos, avaliacoes
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
app.include_router(documentos.router)
app.include_router(chat.router)
app.include_router(pagamentos.router)
app.include_router(avaliacoes.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Socorro! API", "version": "2.0.0"}


@app.get("/")
async def root():
    return {
        "name": "Socorro! API",
        "version": "2.0.0",
        "docs": "/docs",
    }
