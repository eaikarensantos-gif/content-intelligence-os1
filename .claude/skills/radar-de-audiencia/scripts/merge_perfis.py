#!/usr/bin/env python3
"""
Merge de perfis por URL, preservando o engajamento editado pela Karen.

    python3 scripts/merge_perfis.py data/novos.json data/perfis.json

Regras:
  - chave = URL normalizada
  - campos coletados são sobrescritos pelo arquivo novo
  - `eng` do arquivo existente sempre vence (é o único eixo manual)
  - perfil que só existe no arquivo antigo permanece
  - `score` nunca é gravado: é derivado, calculado na interface
"""

import json
import re
import sys
from datetime import date
from pathlib import Path

CAMPOS = [
    "url", "origem", "nome", "handle", "cargo", "empresa", "setor",
    "seguidores", "decisor", "fit", "alcance", "eng", "tipo",
    "porque", "evidencia", "abordagem", "coletado_em", "status_coleta",
]
TIPOS = {"Cliente potencial", "Parceiro", "Amplificador",
         "Par sênior", "Audiência", "Fora do perfil"}
STATUS = {"ok", "privado", "nao_encontrado", "falhou", "manual"}


def norm_url(u):
    u = (u or "").strip()
    if not u:
        return ""
    if u.startswith("@"):
        return "https://www.instagram.com/%s/" % u[1:].lower()
    if not u.startswith("http"):
        u = "https://" + u
    m = re.search(r"linkedin\.com/(in|company)/([^/?#]+)", u, re.I)
    if m:
        return "https://www.linkedin.com/%s/%s/" % (m.group(1).lower(), m.group(2).lower())
    m = re.search(r"instagram\.com/([^/?#]+)", u, re.I)
    if m and m.group(1).lower() not in {"p", "reel", "reels", "explore", "stories"}:
        return "https://www.instagram.com/%s/" % m.group(1).lower()
    return u.rstrip("/").lower() + "/"


def clamp(v, lo=0, hi=10, dflt=3):
    try:
        n = float(v)
    except (TypeError, ValueError):
        return dflt
    if n != n:  # NaN
        return dflt
    return max(lo, min(hi, n))


def limpar(p, avisos):
    """Normaliza um perfil e registra o que teve de ser corrigido."""
    out = {k: p.get(k) for k in CAMPOS}
    out["url"] = norm_url(p.get("url"))

    for eixo in ("decisor", "fit", "alcance"):
        antes = out.get(eixo)
        out[eixo] = clamp(antes)
        if antes is not None and out[eixo] != antes:
            avisos.append("%s: %s fora da faixa (%r), ajustado para %s"
                          % (out["url"], eixo, antes, out[eixo]))

    e = out.get("eng")
    out["eng"] = int(e) if isinstance(e, (int, float)) and 0 <= e <= 3 else 1

    s = out.get("seguidores")
    if isinstance(s, str):
        t = s.lower().replace(".", "").replace(",", ".").strip()
        m = re.match(r"([\d.]+)\s*(k|mil|m|mi)?", t)
        if m:
            try:
                v = float(m.group(1))
                mult = {"k": 1e3, "mil": 1e3, "m": 1e6, "mi": 1e6}.get(m.group(2), 1)
                s = int(v * mult)
                avisos.append("%s: seguidores veio como string, convertido para %d" % (out["url"], s))
            except ValueError:
                s = None
        else:
            s = None
    out["seguidores"] = int(s) if isinstance(s, (int, float)) else None

    if out.get("tipo") not in TIPOS:
        if out.get("tipo"):
            avisos.append("%s: tipo inválido (%r), virou Audiência" % (out["url"], out["tipo"]))
        out["tipo"] = "Audiência"

    if out.get("status_coleta") not in STATUS:
        # default pessimista de propósito: status desconhecido não pode
        # passar por coleta bem-sucedida e sumir dos filtros de problema
        if out.get("status_coleta"):
            avisos.append("%s: status_coleta inválido (%r), virou falhou"
                          % (out["url"], out["status_coleta"]))
        out["status_coleta"] = "falhou" if out.get("status_coleta") else "ok"

    for k in ("nome", "handle", "cargo", "empresa", "setor",
              "porque", "evidencia", "abordagem", "origem", "coletado_em"):
        out[k] = str(out.get(k) or "")

    if not out["origem"]:
        out["origem"] = "LI" if "linkedin.com" in out["url"] else ("IG" if "instagram.com" in out["url"] else "—")
    if not out["coletado_em"]:
        out["coletado_em"] = date.today().isoformat()

    p.pop("score", None)
    return out


def carregar(path):
    f = Path(path)
    if not f.exists():
        return []
    d = json.loads(f.read_text(encoding="utf-8"))
    return d if isinstance(d, list) else d.get("perfis", [])


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1

    novos_path, base_path = sys.argv[1], sys.argv[2]
    avisos = []

    base = {}
    ordem = []
    for p in carregar(base_path):
        c = limpar(p, avisos)
        if c["url"] not in base:
            ordem.append(c["url"])
        base[c["url"]] = c

    add = upd = eng_mantido = 0
    for p in carregar(novos_path):
        c = limpar(p, avisos)
        u = c["url"]
        if not u:
            avisos.append("perfil sem url descartado: %r" % p.get("nome"))
            continue
        if u in base:
            # eng é da Karen: o valor que já existe sempre vence
            if "eng" not in p or not isinstance(p.get("eng"), (int, float)):
                if base[u]["eng"] != c["eng"]:
                    eng_mantido += 1
                c["eng"] = base[u]["eng"]
            base[u] = c
            upd += 1
        else:
            base[u] = c
            ordem.append(u)
            add += 1

    saida = {
        "versao": 2,
        "gerado_em": date.today().isoformat(),
        "perfis": [base[u] for u in ordem],
    }
    Path(base_path).parent.mkdir(parents=True, exist_ok=True)
    Path(base_path).write_text(
        json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")

    por_status = {}
    for p in saida["perfis"]:
        por_status[p["status_coleta"]] = por_status.get(p["status_coleta"], 0) + 1

    print("%d novo(s), %d atualizado(s), %d total" % (add, upd, len(saida["perfis"])))
    if eng_mantido:
        print("%d ajuste(s) manual de engajamento preservado(s)" % eng_mantido)
    print("status: " + ", ".join("%s=%d" % kv for kv in sorted(por_status.items())))
    if avisos:
        print("\n%d aviso(s):" % len(avisos))
        for a in avisos[:20]:
            print("  - " + a)
        if len(avisos) > 20:
            print("  ... e mais %d" % (len(avisos) - 20))
    return 0


if __name__ == "__main__":
    sys.exit(main())
