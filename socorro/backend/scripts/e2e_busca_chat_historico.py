"""Teste ponta-a-ponta: pesquisa difusa, conversas e histórico."""
import asyncio
import sys
import uuid
import httpx

BASE = "http://127.0.0.1:8011"


def uniq() -> str:
    return uuid.uuid4().hex[:8]


async def main() -> int:
    async with httpx.AsyncClient(base_url=BASE, timeout=60.0) as c:
        r = await c.get("/health")
        assert r.status_code == 200, r.text
        print("[1] health OK")

        # --- Cria um cliente e duas empresas com áreas próximas ---
        cli_email = f"cliente_{uniq()}@teste.ao"
        r = await c.post("/auth/register", json={
            "nome": "Cliente Teste",
            "email": cli_email,
            "password": "segredo123",
            "tipo_conta": "cidadao",
            "localizacao": "Benfica, Luanda",
        })
        assert r.status_code == 201, r.text
        cli_token = r.json()["access_token"]
        cli_id = r.json()["user"]["id"]
        print("[2] cliente registado")

        empresas = []
        for nome_com, area, cats in [
            ("Electro Kianda", "Electricidade", "Electricidade,Climatização"),
            ("Canaliza Luanda", "Canalização", "Canalização"),
        ]:
            email = f"emp_{uniq()}@teste.ao"
            r = await c.post("/auth/register", json={
                "nome": nome_com + " Lda",
                "nome_comercial": nome_com,
                "email": email,
                "password": "segredo123",
                "tipo_conta": "empresa",
                "area_atuacao": area,
                "categorias_servico": cats,
                "localizacao": "Benfica, Luanda",
                "latitude": -8.9,
                "longitude": 13.2,
                "raio_atuacao": 30,
                "status_atendimento": "online",
            })
            assert r.status_code == 201, r.text
            empresas.append((r.json()["user"]["id"], r.json()["access_token"], nome_com))
        print("[3] empresas registadas")

        Hc = {"Authorization": f"Bearer {cli_token}"}
        H0 = {"Authorization": f"Bearer {empresas[0][1]}"}

        # --- Pesquisa com erro de escrita: "eletrecista" deve encontrar "Electricidade" ---
        r = await c.get("/profissionais", params={"q": "eletrecista"}, headers=Hc)
        assert r.status_code == 200, r.text
        res = r.json()
        nomes = [x["nome_comercial"] or x["nome"] for x in res]
        assert any("Electro" in n for n in nomes), f"fuzzy falhou: {nomes}"
        assert any(x.get("match_score") is not None for x in res), "match_score ausente"
        print("[4] pesquisa difusa 'eletrecista' ->", nomes)

        # --- Pesquisa por área (com acentos na BD): "canalizacao" ---
        r = await c.get("/profissionais", params={"q": "canalizacao", "limit": 60}, headers=Hc)
        assert r.status_code == 200, r.text
        nomes2 = [x["nome_comercial"] or x["nome"] for x in r.json()]
        assert any("Canaliza" in n for n in nomes2), nomes2
        print("[5] pesquisa por área 'canalizacao' ->", nomes2[:6])

        # --- Pesquisa por nome exato de empresa criada ---
        r = await c.get("/profissionais", params={"q": "Canaliza Luanda", "limit": 20}, headers=Hc)
        assert r.status_code == 200, r.text
        nomes2b = [x["nome_comercial"] or x["nome"] for x in r.json()]
        assert any("Canaliza Luanda" in n for n in nomes2b), nomes2b
        print("[5b] pesquisa por nome 'Canaliza Luanda' ->", nomes2b[:5])

        # --- Pesquisa por nome de empresa com erro: "electroo" ---
        r = await c.get("/profissionais", params={"q": "electroo"}, headers=Hc)
        assert r.status_code == 200, r.text
        nomes3 = [x["nome_comercial"] or x["nome"] for x in r.json()]
        assert any("Electro" in n for n in nomes3), f"fuzzy nome falhou: {nomes3}"
        print("[6] pesquisa difusa por nome 'electroo' ->", nomes3)

        # --- Cria um pedido como cliente ---
        r = await c.post("/pedidos", json={
            "titulo": "Falta de energia em casa",
            "categoria": "Electricidade",
            "descricao": "O quadro desliga sozinho.",
            "localizacao": "Benfica, Luanda",
            "latitude": -8.9,
            "longitude": 13.2,
            "urgencia": "urgente",
        }, headers=Hc)
        assert r.status_code == 201, r.text
        pedido_id = r.json()["id"]
        print("[7] pedido criado", pedido_id)

        # --- Empresa aceita ---
        r = await c.post(f"/pedidos/{pedido_id}/aceitar", headers=H0)
        assert r.status_code == 200, r.text
        print("[8] empresa aceitou o pedido")

        # --- Chat: mensagens ---
        r = await c.post(f"/chat/{pedido_id}/mensagens", json={"conteudo": "Boa tarde, estou a caminho.", "tipo": "texto"}, headers=H0)
        assert r.status_code == 201, r.text
        r = await c.post(f"/chat/{pedido_id}/mensagens", json={"conteudo": "Obrigado, a porta é a azul.", "tipo": "texto"}, headers=Hc)
        assert r.status_code == 201, r.text

        r = await c.get(f"/chat/{pedido_id}/mensagens", headers=Hc)
        assert r.status_code == 200, r.text
        assert len(r.json()) >= 2, r.json()
        print("[9] mensagens do chat OK")

        # --- Conversas listadas para ambos ---
        for H, quem in [(Hc, "cliente"), (H0, "empresa")]:
            r = await c.get("/chat/conversas", headers=H)
            assert r.status_code == 200, r.text
            convs = r.json()
            assert any(x["pedido_id"] == pedido_id for x in convs), f"{quem}: {convs}"
            alvo = next(x for x in convs if x["pedido_id"] == pedido_id)
            assert alvo["total_mensagens"] >= 2
            assert alvo["ultima_mensagem"]
        print("[10] lista de conversas OK (cliente e empresa)")

        # --- Histórico ---
        r = await c.get("/pedidos/historico", headers=Hc)
        assert r.status_code == 200, r.text
        hist = r.json()
        assert hist["resumo"]["criados"] >= 1, hist["resumo"]
        assert any(e["tipo"] == "pedido_criado" for e in hist["eventos"]), hist["eventos"]
        assert any(e["tipo"] == "aceite" for e in hist["eventos"]), hist["eventos"]
        print("[11] histórico do cliente OK:", hist["resumo"])

        r = await c.get("/pedidos/historico", headers=H0)
        assert r.status_code == 200, r.text
        hist2 = r.json()
        assert hist2["resumo"]["prestados"] >= 1, hist2["resumo"]
        print("[12] histórico da empresa OK:", hist2["resumo"])

        # --- Não participante não vê mensagens de outro pedido ---
        email3 = f"intruso_{uniq()}@teste.ao"
        r = await c.post("/auth/register", json={
            "nome": "Intruso", "email": email3, "password": "segredo123", "tipo_conta": "cidadao",
        })
        H3 = {"Authorization": f"Bearer {r.json()['access_token']}"}
        r = await c.get(f"/chat/{pedido_id}/mensagens", headers=H3)
        assert r.status_code == 403, r.text
        print("[13] acesso de não-participante negado OK")

    print("\n>>> TODOS OS TESTES DE PESQUISA/CHAT/HISTÓRICO PASSARAM")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
