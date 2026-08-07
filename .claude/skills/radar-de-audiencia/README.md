# Radar de Audiência

Classifica e pontua seguidores de Instagram e LinkedIn a partir de links de perfil.

Três etapas desacopladas: o Claude Code abre cada perfil no Chrome logado, lê a bio, classifica em quatro eixos, e uma tela HTML ordena quem merece contato.

## Instalar

Copie a pasta para `.claude/skills/radar-de-audiencia/` no seu projeto, ou instale o `.skill`.

## Usar

Cole os links no Claude Code:

```
Roda o radar-de-audiencia nesses perfis:

https://www.linkedin.com/in/fulano/
https://www.instagram.com/beltrana/
```

Ele coleta em lotes de 5, grava `data/perfis.json` e reporta a distribuição por tier.

Para ver a tabela:

```bash
python3 -m http.server 8765
# http://localhost:8765/assets/radar.html
```

Ou abra `assets/radar.html` direto e arraste o `data/perfis.json` pra tela.

## Os quatro eixos

| Eixo | Peso padrão | Quem preenche |
|---|---|---|
| Poder de decisão | 35% | IA, pela bio |
| Fit de nicho | 30% | IA, pela bio |
| Engajamento com você | 20% | **Você, na tela** |
| Alcance | 15% | IA, pelos seguidores |

Score de 0 a 100. Tiers: A ≥75 contatar, B 55-74 aquecer, C 35-54 observar, D <35 arquivo.

Mover os sliders reordena a tabela na hora, sem chamar IA nem rede. Dá pra testar cenários de prospecção diferentes na mesma base coletada.

## Estrutura

```
SKILL.md                       fluxo e comandos
reference/criterios.md         rubrica dos eixos — edite aqui pra recalibrar
reference/prompt-classificacao.md
scripts/merge_perfis.py        merge por URL preservando engajamento manual
assets/radar.html              interface, arquivo único, sem build
exemplos/                      raw e JSON de exemplo pra testar sem navegador
data/                          fila, raw coletado e perfis.json
```

## Recalibrar sem recoletar

O texto bruto fica em `data/raw/`. Edite `reference/criterios.md`, peça pra reclassificar, e nenhum navegador abre. É a razão de o raw ser guardado.

## Limites conhecidos

- **Engajamento não é coletável.** É o único eixo manual e o pipeline não tem como saber quem responde seus stories.
- **Seguidores do LinkedIn** frequentemente não aparecem no texto da página. O eixo alcance vai ter buraco em parte da base.
- **Instagram sem bio cai em D.** Um decisor real com bio vazia vira falso negativo. Comportamento esperado, não bug.
- **Limites de rate são estimativa conservadora** (5 por lote, 60 por sessão, para com 3 falhas seguidas). Não há número oficial de nenhuma das plataformas.
- O LinkedIn restringe coleta automatizada nos termos de uso. É risco de conta, não questão técnica.

## Requisitos

- Claude Code com a extensão Claude in Chrome ativa
- Chrome logado no Instagram e no LinkedIn
- Python 3 para o merge
