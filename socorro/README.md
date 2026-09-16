# Socorro! - Plataforma de Ajuda Mútua

Plataforma que liga quem precisa de ajuda a quem pode ajudar, feita para Angola.

## Tecnologias

- **Backend:** Python 3.13 + FastAPI + SQLAlchemy + PostgreSQL
- **Frontend:** React 19 + TypeScript + Vite
- **Infraestrutura:** Docker + Redis

## Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento local sem Docker)

## Início Rápido

```bash
# Copiar variáveis de ambiente
cp .env.example .env

# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## URLs de Desenvolvimento

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| pgAdmin | http://localhost:5050 |
| Redis | localhost:6379 |

## Credenciais pgAdmin

- Email: admin@socorro.ao
- Password: admin123
- Host do banco: db
- Porta: 5432
- User: socorro
- Password: socorro123
- Database: socorro_db

## Estrutura do Projeto

```
socorro-platform/
├── docker-compose.yml
├── .env
├── .env.example
├── socorro/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py          # FastAPI app
│   │   │   ├── config.py        # Settings (env vars)
│   │   │   ├── database.py      # SQLAlchemy async setup
│   │   │   ├── models.py        # ORM models
│   │   │   ├── schemas.py       # Pydantic schemas
│   │   │   ├── auth.py          # JWT + password helpers
│   │   │   └── routes/
│   │   │       ├── auth.py      # Register, login, profile
│   │   │       ├── pedidos.py   # Help requests CRUD
│   │   │       ├── documentos.py # Document upload
│   │   │       ├── chat.py      # WebSocket + messages
│   │   │       ├── pagamentos.py # Payment system
│   │   │       └── avaliacoes.py # Ratings
│   │   ├── alembic/             # Database migrations
│   │   ├── uploads/             # Uploaded files
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── frontend/
│       ├── src/
│       │   ├── api/             # API client
│       │   ├── context/         # React contexts
│       │   ├── pages/           # Page components
│       │   └── App.tsx
│       ├── Dockerfile
│       └── package.json
```

## API Endpoints

### Autenticação
- `POST /auth/register` - Criar conta
- `POST /auth/login` - Entrar
- `GET /auth/me` - Obter perfil
- `PUT /auth/me` - Atualizar perfil

### Pedidos
- `GET /pedidos` - Listar pedidos
- `POST /pedidos` - Criar pedido
- `GET /pedidos/{id}` - Obter pedido
- `PUT /pedidos/{id}` - Atualizar pedido
- `DELETE /pedidos/{id}` - Eliminar pedido

### Chat
- `GET /chat/{pedido_id}/mensagens` - Listar mensagens
- `POST /chat/{pedido_id}/mensagens` - Enviar mensagem
- `WS /chat/{pedido_id}/ws` - WebSocket

### Pagamentos
- `POST /pagamentos/{pedido_id}` - Criar pagamento
- `GET /pagamentos/{pedido_id}` - Obter pagamento
- `POST /pagamentos/{pedido_id}/confirmar-pagamento`
- `POST /pagamentos/{pedido_id}/libertar`

### Documentos
- `GET /documentos` - Listar documentos
- `POST /documentos/{tipo}` - Upload documento
- `DELETE /documentos/{id}` - Eliminar documento

### Avaliações
- `GET /avaliacoes/{user_id}` - Listar avaliações
- `POST /avaliacoes/{pedido_id}` - Criar avaliação
