"""Teste ponta-a-ponta: registo de empresa, upload de imagem, edição de perfil."""
import asyncio
import io
import os
import sys
import uuid
import httpx

BASE = "http://127.0.0.1:8011"
EMAIL = f"empresa_{uuid.uuid4().hex[:8]}@teste.ao"


def png_bytes() -> bytes:
    # PNG 1x1 válido
    return bytes.fromhex(
        "89504e470d0a1a0a0000000d494844520000000100000001080600000"
        "01f15c4890000000a49444154789c6360000002000154a24f5f000000"
        "0049454e44ae426082"
    )


async def main() -> int:
    async with httpx.AsyncClient(base_url=BASE, timeout=40.0) as c:
        r = await c.get("/health")
        assert r.status_code == 200, r.text
        print("[1] health OK")

        payload = {
            "nome": "Mecanica Kianda Lda",
            "email": EMAIL,
            "telefone": f"+2449{uuid.uuid4().int % 100000000:08d}",
            "password": "segredo123",
            "tipo_conta": "empresa",
            "nome_comercial": "Mecanica Kianda",
            "nif": "5417000000",
            "tipo_entidade": "oficina",
            "categorias_servico": "Mecanica,Transporte",
            "area_atuacao": "Mecanica",
            "endereco": "Rua 1, Nº 22",
            "bairro": "Benfica",
            "municipio": "Talatona",
            "provincia": "Luanda",
            "telefone_whatsapp": "+244923111222",
            "website": "https://kianda.ao",
            "atende_domicilio": True,
            "atendimento_24h": True,
            "raio_atuacao": 25,
            "representante_nome": "Joao Kianda",
            "representante_cargo": "Gerente",
            "representante_telefone": "+244923111333",
        }
        r = await c.post("/auth/register", json=payload)
        assert r.status_code == 201, f"{r.status_code} {r.text}"
        data = r.json()
        token = data["access_token"]
        user = data["user"]
        assert user["nome_comercial"] == "Mecanica Kianda"
        assert user["tipo_entidade"] == "oficina"
        assert user["categorias_servico"] == "Mecanica,Transporte"
        assert user["atendimento_24h"] is True
        assert user["raio_atuacao"] == 25
        print("[2] registo empresa OK — campos comerciais persistidos")

        # Login
        r = await c.post("/auth/login", data={"username": EMAIL, "password": "segredo123"})
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        print("[3] login OK")

        H = {"Authorization": f"Bearer {token}"}

        # Upload público (registo)
        r = await c.post("/upload/imagem", files={"file": ("logo.png", png_bytes(), "image/png")})
        assert r.status_code == 201, f"{r.status_code} {r.text}"
        logo_url = r.json()["url"]
        print("[4] upload público OK ->", logo_url)

        # Rejeição de ficheiro não-imagem
        r = await c.post("/upload/imagem", files={"file": ("nota.txt", b"ola", "text/plain")})
        assert r.status_code == 400, r.text
        print("[5] rejeita ficheiro não-imagem OK")

        # Upload autenticado de foto de perfil
        r = await c.post("/auth/foto-perfil", files={"file": ("eu.png", png_bytes(), "image/png")}, headers=H)
        assert r.status_code == 201, f"{r.status_code} {r.text}"
        foto_url = r.json()["url"]
        assert r.json()["user"]["foto_perfil"] == foto_url
        print("[6] upload foto de perfil OK ->", foto_url)

        # Ficheiro realmente servido
        r = await c.get(foto_url)
        assert r.status_code == 200 and r.content, r.status_code
        print("[7] imagem servida em /uploads OK")

        # Edição completa do perfil
        upd = {
            "nome": "Mecanica Kianda Lda",
            "nome_comercial": "Kianda Motors",
            "descricao": "Oficina especializada em motores diesel.",
            "anos_experiencia": 12,
            "especialidades": "Mecanica,Transporte",
            "telefone_whatsapp": "+244923999888",
            "website": "https://kianadamotors.ao",
            "logo": logo_url,
            "foto_capa": logo_url,
            "atende_estabelecimento": True,
            "atende_domicilio": False,
            "atendimento_24h": False,
            "raio_atuacao": 40,
            "status_atendimento": "ocupado",
        }
        r = await c.put("/auth/me", json=upd, headers=H)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        u = r.json()
        for k, v in [("nome_comercial", "Kianda Motors"), ("foto_capa", logo_url),
                     ("raio_atuacao", 40), ("status_atendimento", "ocupado"),
                     ("anos_experiencia", 12), ("telefone_whatsapp", "+244923999888")]:
            assert u[k] == v, f"{k}: esperado {v!r}, obtido {u[k]!r}"
        print("[8] edição de perfil (todos os campos) OK")

        # Perfil público expõe dados da empresa
        r = await c.get(f"/profissionais/{user['id']}", headers=H)
        assert r.status_code == 200, r.text
        pro = r.json()
        assert pro["nome_comercial"] == "Kianda Motors"
        assert pro["categorias_servico"] == "Mecanica,Transporte"
        print("[9] perfil público com dados de empresa OK")

        # Login com password errada
        r = await c.post("/auth/login", data={"username": EMAIL, "password": "errada"})
        assert r.status_code == 401, r.text
        print("[10] credenciais inválidas rejeitadas OK")

        # Email duplicado
        r = await c.post("/auth/register", json=payload)
        assert r.status_code == 400, r.text
        print("[11] email duplicado rejeitado OK")

    print("\n>>> TODOS OS TESTES PASSARAM")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
