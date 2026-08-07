---
name: radar-de-audiencia
description: Classifica e pontua seguidores de Instagram e LinkedIn a partir de links de perfil. Abre cada perfil no Chrome logado, lê a bio, atribui notas em quatro eixos (poder de decisão, fit de nicho, engajamento, alcance) e ordena quem merece contato. Use sempre que Karen colar links de perfil, mandar uma lista de seguidores, ou disser "classifica esses perfis", "quem vale contatar", "pontua meus seguidores", "radar de audiência", "analisa esses links", "quem são essas pessoas". Também use quando ela pedir pra reprocessar a base com pesos diferentes ou quiser ver quem está no tier A.
---

# Radar de Audiência

Pipeline de três etapas: coleta pelo Chrome, classificação, visualização em HTML.

## Antes de rodar

Confirme com a Karen se ela quer **coletar** (abrir os perfis, é lento) ou apenas **reclassificar** o que já está em `data/raw/`. Reclassificar não abre navegador e leva segundos.

Se a lista tiver mais de 60 perfis, avise e divida em sessões. Ver limites abaixo.

---

## Etapa 1 — Coleta

Entrada: URLs coladas no chat ou o arquivo `data/perfis-fila.txt`.

### Normalizar antes de abrir

```
linkedin.com/in/<slug>        →  https://www.linkedin.com/in/<slug>/
instagram.com/<handle>        →  https://www.instagram.com/<handle>/
@handle                       →  https://www.instagram.com/<handle>/
```

Descarte URLs de post, reel ou story. Remova duplicados pela URL normalizada. Compare com `data/perfis.json`: perfil já coletado nos últimos 30 dias só recoleta se a Karen pedir.

### Loop de coleta

Ferramentas: `mcp__claude-in-chrome__navigate` e `mcp__claude-in-chrome__get_page_text`.

Para cada perfil:

1. `navigate` para a URL
2. `get_page_text`
3. Salvar em `data/raw/<slug>.txt` com a URL na primeira linha
4. Registrar o status

`WebFetch` não serve aqui. Instagram e LinkedIn renderizam por JavaScript e o fetch cru devolve casca vazia.

### Limites — não negocie com eles

- **5 perfis por lote**, pausa de 20 a 40 segundos entre lotes
- **Teto de 60 perfis por sessão**
- **3 falhas seguidas = parar.** Reporte e espere instrução. Insistir num bloqueio piora o bloqueio.
- Uma aba por vez

O que está em jogo é a conta pessoal da Karen no LinkedIn, não um IP descartável. Quando estiver em dúvida entre rápido e seguro, seguro.

### Classificar o status

| Status | Quando |
|---|---|
| `ok` | página carregou com conteúdo de perfil |
| `privado` | perfil existe mas o conteúdo está fechado |
| `nao_encontrado` | 404 ou perfil removido |
| `falhou` | timeout, redirect pra login, captcha, qualquer outra coisa |

Perfil com problema **entra no JSON assim mesmo**, com notas 3/3/3. Nunca omita em silêncio — sumir com o perfil é pior que pontuá-lo baixo, porque a Karen não fica sabendo que aquela pessoa existiu.

---

## Etapa 2 — Classificação

Leia `reference/criterios.md` e `reference/prompt-classificacao.md`. Aplique o prompt a cada texto de `data/raw/`, em lotes de 10.

Saída: um objeto por perfil, no contrato de `reference/criterios.md`.

**A regra que importa:** não inventar. Cargo, empresa, número de seguidores — se não está no texto coletado, campo vazio e nota 3 no eixo afetado. Falta de informação não é sinal negativo nem positivo, é falta de informação, e o score baixo comunica exatamente isso.

Não preencha `eng`. Esse eixo é da Karen, ela edita na tela. Ao fazer merge, preserve o valor que já estiver lá.

Grave com `scripts/merge_perfis.py`:

```bash
python3 scripts/merge_perfis.py data/novos.json data/perfis.json
```

O script casa por URL, atualiza os campos coletados e preserva `eng`.

---

## Etapa 3 — Visualização

```bash
python3 -m http.server 8765
# abre http://localhost:8765/assets/radar.html
```

Servido por HTTP, o HTML carrega `data/perfis.json` sozinho. Aberto como `file://`, a Karen arrasta o JSON pra tela.

Na interface ela ajusta pesos e cortes de tier. Isso recalcula tudo no cliente, sem tocar em IA nem em rede — dá pra testar cenário de prospecção diferente na mesma base coletada.

---

## Ao terminar

Relate em quatro linhas, sem rodeio:

1. Quantos coletados, quantos com problema
2. Distribuição por tier: A / B / C / D
3. Os 3 primeiros do tier A, com o motivo em uma linha
4. Qualquer padrão que apareceu na base e que ela não pediu (concentração de setor, tier A todo de uma origem só, algo assim)

Não escreva parabéns nem "espero que ajude". Termine no dado.

---

## Reclassificar sem coletar

Quando a Karen mudar critério ou quiser recalibrar:

1. Editar `reference/criterios.md`
2. Rodar a Etapa 2 sobre todo o `data/raw/` já existente
3. Regravar `data/perfis.json` pelo merge

Zero navegador, zero risco de conta. É por isso que o `raw` fica guardado.

---

## Limites conhecidos

- **Engajamento** o sistema não coleta. É o único eixo 100% manual e o pipeline não tem como saber quem responde os stories dela.
- **Seguidores do LinkedIn** frequentemente não aparecem no texto da página. O eixo `alcance` vai ter buraco em parte da base.
- **Instagram sem bio** cai em D. Um decisor real com bio vazia vira falso negativo. É comportamento esperado, não bug.
- **Os limites de rate** são estimativa conservadora, sem número oficial de nenhuma das plataformas.
- O LinkedIn restringe coleta automatizada nos termos de uso. É risco de conta, e a Karen precisa saber disso antes de rodar lote grande.
