from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from math import asin, cos, radians, sin, sqrt
from difflib import SequenceMatcher
import unicodedata
from app.database import get_db
from app.models import User, Avaliacao
from app.schemas import ProfissionalOut, EstadoAtendimentoUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/profissionais", tags=["Profissionais"])

SINONIMOS = {
    "electricidade": ["electricidade", "eletricidade", "elétrica", "eletrica", "serviços elétricos", "servicos electricos", "serviços electricos", "eletricista", "electricista", "eletrotécnica", "eletrotecnica", "iluminação", "iluminacao"],
    "canalização": ["canalização", "canalizacao", "canalizador", "pipo", "hidráulica", "hidraulica", "fugas de água", "fugas de agua", "esgotos"],
    "climatização": ["climatização", "climatizacao", "ac", "ar condicionado", "frigorista", "ventilação", "ventilacao"],
    "mecânica": ["mecânica", "mecanica", "mecânico", "mecanico", "oficina", "auto", "automóvel", "automovel", "shock absorbers", "reboque", "pneus"],
    "construção": ["construção", "construcao", "construção civil", "construcao civil", "obras", "pedreiro", "cimento", "reabilitação", "reabilitacao", "pintura"],
    "transporte": ["transporte", "transporte de passageiros", "logística", "logistica", "mudanças", "mudancas", "cargas", "fretes"],
    "informática": ["informática", "informatica", "tecnologia", "informático", "informatico", "computadores", "software", "redes", "assistência técnica", "assistencia tecnica", "reparação de computadores", "reparacao de computadores"],
    "saúde": ["saúde", "saude", "medico", "médico", "enfermagem", "clínica", "clinica", "fisioterapia", "cuidados"],
    "segurança": ["segurança", "seguranca", "vigilância", "vigilancia", "cctv", "alarmes", "segurança eletrónica", "seguranca electronica"],
    "limpeza": ["limpeza", "higienização", "higienizacao", "limpadora", "jardinagem"],
    "eletrónica": ["eletrónica", "electronica", "electrónica", "telemóveis", "telefones"],
    "alimentação": ["alimentação", "alimentacao", "restauração", "restauracao", "comida", "catering"],
    "educação": ["educação", "educacao", "ensino", "professor", "explicador", "aulas", "formação", "formacao", "centro de estudos", "centro de estudos"],
    "mudanças": ["mudanças", "mudancas", "mudança de residência", "mudanca de residencia", "remoção", "remocao", "transporte de mobílias", "transporte de mobilias"],
    "construção civil": ["construção civil", "construcao civil"],
    "jardinagem": ["jardinagem", "jardim", "paisagismo"],
    "pintura": ["pintura", "pintor"],
}
_CANONICA = {}
for canon, lista in SINONIMOS.items():
    for item in lista:
        _CANONICA[item] = canon


def canonizar(texto: str) -> str:
    if not texto:
        return ""
    return _CANONICA.get(texto.strip().lower(), texto.strip().lower())


def _normalizar(texto: str) -> str:
    """Minúsculas, sem acentos e sem pontuação — base para comparação difusa."""
    if not texto:
        return ""
    texto = unicodedata.normalize("NFKD", texto.lower())
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return "".join(c if c.isalnum() or c.isspace() else " " for c in texto).strip()


def _tokens(texto: str) -> List[str]:
    return [t for t in _normalizar(texto).split() if len(t) >= 2]


def _similaridade(a: str, b: str) -> float:
    """Rácio de semelhança entre duas cadeias (0..1), já normalizadas."""
    a, b = _normalizar(a), _normalizar(b)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    if a in b or b in a:
        return 0.92
    ratio = SequenceMatcher(None, a, b).ratio()
    # Semelhança por token: "eletricista" vs "eletrecidade" -> tokens próximos
    toks_a, toks_b = set(a.split()), set(b.split())
    if toks_a and toks_b:
        inter = toks_a & toks_b
        if inter:
            ratio = max(ratio, 0.85 + 0.15 * (len(inter) / max(len(toks_a), len(toks_b))))
        else:
            melhor = max(
                (SequenceMatcher(None, ta, tb).ratio() for ta in toks_a for tb in toks_b),
                default=0.0,
            )
            ratio = max(ratio, melhor * 0.9)
    return ratio


def _expandir_termo(termo: str) -> List[str]:
    """Devolve o termo e sinónimos canónicos relacionados (tolerante a erros)."""
    norm = _normalizar(termo)
    if not norm:
        return []
    variantes = {norm}
    for item, canon in _CANONICA.items():
        item_n = _normalizar(item)
        if item_n == norm:
            variantes.add(_normalizar(canon))
            variantes.update(_normalizar(v) for v in SINONIMOS.get(canon, []))
        elif _similaridade(item_n, norm) >= 0.82:
            # erro de escrita: "eletrecista" ~ "eletricista"
            variantes.add(item_n)
            variantes.add(_normalizar(canon))
    return [v for v in variantes if v]


def _pontuar_utilizador(user: User, termo: str, variantes: List[str]) -> float:
    """Pontuação de proximidade do utilizador com o termo pesquisado (0..~1+)."""
    norm_termo = _normalizar(termo)
    if not norm_termo:
        return 0.0

    campos = [
        (user.nome, 1.0),
        (user.nome_comercial, 1.0),
        (user.area_atuacao, 0.95),
        (user.categorias_servico, 0.85),
        (user.especialidades, 0.8),
        (user.competencias, 0.75),
        (user.descricao, 0.45),
        (user.bairro, 0.4),
        (user.municipio, 0.4),
        (user.localizacao, 0.35),
    ]

    melhor = 0.0
    for valor, peso in campos:
        if not valor:
            continue
        norm_valor = _normalizar(valor)
        if not norm_valor:
            continue
        # Correspondência direta
        if norm_termo in norm_valor:
            melhor = max(melhor, peso)
            continue
        # Correspondência com variantes/sinónimos
        if any(v in norm_valor for v in variantes):
            melhor = max(melhor, peso * 0.9)
            continue
        # Proximidade difusa nos tokens
        for token in _tokens(valor):
            if _similaridade(token, norm_termo) >= 0.72:
                melhor = max(melhor, peso * 0.75)
                break
    return melhor


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


async def _avaliacoes_map(db: AsyncSession, user_ids: List[str]) -> dict:
    if not user_ids:
        return {}
    result = await db.execute(
        select(
            Avaliacao.avaliado_id,
            func.avg(Avaliacao.estrelas).label("media"),
            func.count(Avaliacao.id).label("total"),
        )
        .where(Avaliacao.avaliado_id.in_(user_ids))
        .group_by(Avaliacao.avaliado_id)
    )
    return {str(r[0]): (float(r[1]), int(r[2])) for r in result.all()}


def _out(user: User, rating, dist: Optional[float], match_score: Optional[float] = None) -> ProfissionalOut:
    media, total = (None, 0) if rating is None else rating
    # A categoria que aparece na pesquisa: para empresas, usa as categorias de serviço
    area = user.area_atuacao or (user.categorias_servico or "").split(",")[0].strip() or None
    return ProfissionalOut(
        id=user.id,
        nome=user.nome,
        nome_comercial=user.nome_comercial,
        logo=user.logo,
        tipo_conta=user.tipo_conta,
        foto_perfil=user.foto_perfil,
        descricao=user.descricao,
        area_atuacao=area,
        categorias_servico=user.categorias_servico,
        atendimento_24h=user.atendimento_24h,
        areas_atendidas=user.areas_atendidas,
        atendimento_estabelecimento=user.atende_estabelecimento,
        atendimento_domicilio=user.atende_domicilio,
        telefone_whatsapp=user.telefone_whatsapp,
        website=user.website,
        provincia=user.provincia,
        municipio=user.municipio,
        bairro=user.bairro,
        competencias=user.competencias,
        especialidades=user.especialidades,
        anos_experiencia=user.anos_experiencia,
        localizacao=user.localizacao,
        latitude=user.latitude,
        longitude=user.longitude,
        raio_atuacao=user.raio_atuacao,
        verificado=user.verificado,
        status_atendimento=user.status_atendimento or "offline",
        dist_km=round(dist, 1) if dist is not None else None,
        avaliacao_media=round(media, 1) if media is not None else None,
        total_avaliacoes=total,
        match_score=round(match_score, 3) if match_score is not None else None,
    )


@router.get("", response_model=List[ProfissionalOut])
async def pesquisar_profissionais(
    q: Optional[str] = Query(None, description="Pesquisa por nome, especialidade, serviço, área"),
    categoria: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None, description="profissional | empresa"),
    disponivel: Optional[bool] = Query(None, description="Apenas disponíveis agora"),
    verificado: Optional[bool] = Query(None),
    min_avaliacao: Optional[float] = Query(None, ge=0, le=5),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    raio: Optional[float] = Query(None, description="Raio de busca em km"),
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(User).where(User.id != current_user.id, User.ativo.is_(True))

    profissional_cond = or_(
        User.tipo_conta == "empresa",
        User.area_atuacao.isnot(None),
        User.competencias.isnot(None),
    )
    query = query.where(profissional_cond)

    if tipo == "empresa":
        query = query.where(User.tipo_conta == "empresa")
    elif tipo == "profissional":
        query = query.where(User.tipo_conta == "cidadao")

    if verificado:
        query = query.where(User.verificado.is_(True))

    if categoria:
        canon = canonizar(categoria)
        query = query.where(
            or_(
                func.lower(User.area_atuacao) == canon,
                User.area_atuacao.ilike(f"%{categoria.strip().lower()}%"),
                User.categorias_servico.ilike(f"%{categoria.strip().lower()}%"),
                User.competencias.ilike(f"%{categoria.strip().lower()}%"),
            )
        )

    # Guarda a query sem filtro de texto, para fallback em caso de erro de escrita
    query_sem_texto = query

    if q and q.strip():
        termo = _normalizar(q)
        bruto = q.strip().lower()
        # Filtro SQL amplo — inclui a forma acentuada (como está na BD) e a
        # normalizada, além dos sinónimos. O ranking difuso é feito em Python,
        # para que erros de escrita como "eletrecista" encontrem "eletricista".
        termos_sql = {termo, bruto}
        for v in _expandir_termo(q)[:8]:
            termos_sql.add(v)
        # Sinónimos canónicos na forma original (acentuada) — "canalização"
        for canon in {canonizar(q), canonizar(termo)}:
            if canon:
                termos_sql.add(canon.lower())
                for s in SINONIMOS.get(canon, []):
                    termos_sql.add(s.lower())
        # Tokens individuais ajudam em nomes compostos ("canaliza luanda")
        for tok in _tokens(q):
            if len(tok) >= 4:
                termos_sql.add(tok)

        condicoes = []
        for t in termos_sql:
            condicoes.extend([
                User.nome.ilike(f"%{t}%"),
                User.nome_comercial.ilike(f"%{t}%"),
                User.area_atuacao.ilike(f"%{t}%"),
                User.categorias_servico.ilike(f"%{t}%"),
                User.competencias.ilike(f"%{t}%"),
                User.especialidades.ilike(f"%{t}%"),
                User.localizacao.ilike(f"%{t}%"),
                User.descricao.ilike(f"%{t}%"),
            ])
        query = query.where(or_(*condicoes))

    result = await db.execute(query)
    users = result.scalars().all()

    # Fallback tolerante a erros de escrita em nomes: se o filtro estrito não
    # devolveu nada, procura numa amostra ampla e deixa o ranking difuso decidir.
    if (q and q.strip()) and not users:
        ampla = query_sem_texto.order_by(User.criado_em.desc()).limit(max(limit * 6, 120))
        result = await db.execute(ampla)
        users = result.scalars().all()

    ids = [str(u.id) for u in users]
    ratings = await _avaliacoes_map(db, ids)

    variantes = _expandir_termo(q) if q and q.strip() else []
    tem_termo = bool(q and q.strip())

    profissionais: List[Tuple[User, float, int, Optional[float], float]] = []
    for u in users:
        dist = None
        if lat is not None and lon is not None and u.latitude is not None and u.longitude is not None:
            dist = haversine(lat, lon, u.latitude, u.longitude)
            if raio is not None and dist > raio:
                continue
            # Respeitar a área de atendimento do profissional
            if u.raio_atuacao and dist > float(u.raio_atuacao):
                continue
        elif raio is not None and (u.latitude is None or u.longitude is None):
            continue

        if disponivel and (u.status_atendimento or "offline") != "online":
            continue

        media, total = ratings.get(str(u.id), (None, 0))
        if min_avaliacao is not None:
            if media is None or media < min_avaliacao:
                continue

        score = _pontuar_utilizador(u, q, variantes) if tem_termo else 0.0
        # Com termo de pesquisa, descarta resultados sem qualquer proximidade real
        if tem_termo and score < 0.30:
            continue

        profissionais.append((u, media, total, dist, score))

    # Ordenação: proximidade ao termo, categoria, disponibilidade, distância, reputação
    def chave(item):
        u, media, total, dist, score = item
        s = score * 100  # peso dominante para a semelhança do termo
        if categoria:
            canon = canonizar(categoria)
            if canonizar(u.area_atuacao) == canon:
                s += 12
            elif u.competencias and canon in u.competencias.lower():
                s += 8
        if (u.status_atendimento or "offline") == "online":
            s += 5
        if u.verificado:
            s += 2
        if media:
            s += media * 2
        s -= (dist or 10000) / 10
        return -s

    profissionais.sort(key=chave)
    return [
        _out(u, ratings.get(str(u.id)), d, score)
        for u, _m, _t, d, score in profissionais
    ][skip : skip + limit]


@router.get("/{user_id}", response_model=ProfissionalOut)
async def obter_profissional(
    user_id: str,
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == user_id, User.ativo.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Profissional não encontrado")

    ratings = await _avaliacoes_map(db, [str(user.id)])

    dist = None
    if lat is not None and lon is not None and user.latitude is not None and user.longitude is not None:
        dist = haversine(lat, lon, user.latitude, user.longitude)

    return _out(user, ratings.get(str(user.id)), dist)


@router.get("/{user_id}/avaliacoes")
async def avaliacoes_profissional(
    user_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Avaliacao)
        .options(selectinload(Avaliacao.avaliador))
        .where(Avaliacao.avaliado_id == user_id)
        .order_by(Avaliacao.criado_em.desc())
        .limit(limit)
    )
    avals = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "estrelas": a.estrelas,
            "comentario": a.comentario,
            "criado_em": a.criado_em.isoformat() if a.criado_em else None,
            "avaliador_nome": a.avaliador.nome if a.avaliador else None,
        }
        for a in avals
    ]


@router.post("/estado", response_model=ProfissionalOut)
async def atualizar_estado(
    data: EstadoAtendimentoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.estado not in ("online", "offline", "ocupado"):
        raise HTTPException(status_code=400, detail="Estado inválido. Use online, offline ou ocupado")

    current_user.status_atendimento = data.estado
    await db.commit()
    await db.refresh(current_user)

    ratings = await _avaliacoes_map(db, [str(current_user.id)])
    return _out(current_user, ratings.get(str(current_user.id)), None)