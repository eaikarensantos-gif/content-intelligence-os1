# Critérios de classificação

Rubrica dos quatro eixos e contrato de saída. Este é o arquivo pra editar quando a calibragem estiver errada.

## Contexto do negócio

Karen Santos, designer sênior (10+ anos) e consultora de IA aplicada a negócios. Vende consultoria, mentoria e projetos para empresas. Não vende curso de massa, não vende template.

Isso define o que é um bom lead: **alguém com problema operacional real e poder de contratar**. Audiência grande sem poder de decisão vale como amplificação, não como pipeline, e os dois não devem ser confundidos no mesmo número.

---

## Eixo 1 — Poder de decisão (peso padrão 35%)

Quem assina o contrato.

| Nota | Perfil |
|---|---|
| 10 | Fundador, sócio, dono de negócio, CEO |
| 9 | C-level, diretor, VP, head de área |
| 7 | Gerente com orçamento próprio |
| 5-6 | Coordenador, consultor autônomo, freelancer sênior |
| 3-4 | Especialista sem gestão, PJ individual |
| 1-2 | Analista, júnior, estagiário, estudante |
| 3 | **Sem informação** |

Nota de calibragem: consultor autônomo fica no meio porque decide rápido, mas o ticket costuma ser baixo. Se a Karen quiser priorizar volume de projeto pequeno, sobe pra 7.

---

## Eixo 2 — Fit de nicho (peso padrão 30%)

O negócio dessa pessoa tem problema que IA aplicada resolve, **e** orçamento plausível.

| Nota | Perfil |
|---|---|
| 9-10 | Empresa com operação repetitiva, volume de dados ou processo documentado. Indústria, logística, saúde, jurídico, SaaS B2B, financeiro. |
| 7-8 | Agência, consultoria, e-commerce, educação, serviço profissional com equipe |
| 5-6 | Negócio de serviço pequeno, criador com produto próprio e time |
| 3-4 | Criador solo, profissional liberal sem equipe |
| 1-2 | Estudante, hobbyista, alguém explicitamente fora de contexto de negócio |
| 3 | **Sem informação** |

Os dois critérios são conjuntos. Uma ONG com processo pesadíssimo e zero orçamento não é 10, é 5.

Este é o eixo mais sensível a calibragem. Espere revisar as faixas depois dos primeiros 30 perfis reais.

---

## Eixo 3 — Engajamento com a Karen (peso padrão 20%)

**Não é coletável.** Só a Karen sabe. Escala curta de 4 pontos, porque ninguém consegue distinguir 6 de 7 de memória.

| Valor | Mapeia pra | Significado |
|---|---|---|
| 0 | 0 | Nunca interagiu |
| 1 | 3 | Passivo, só segue. **Default.** |
| 2 | 6.5 | Curte com frequência, vê stories |
| 3 | 10 | Comenta, responde story, já mandou DM |

O pipeline nunca escreve esse campo. No merge, o valor existente sempre vence.

---

## Eixo 4 — Alcance (peso padrão 15%)

Audiência e poder de indicação, mesmo que a pessoa nunca compre.

| Nota | Seguidores |
|---|---|
| 10 | 50k+ |
| 8 | 10k a 50k |
| 6 | 3k a 10k |
| 4 | 800 a 3k |
| 2 | Abaixo de 800 |
| 3 | **Sem informação** |

No LinkedIn, se só houver contagem de conexões, use ela e registre em `evidencia` que é conexão e não seguidor. Conexão limita em 30k, então a escala satura — não trate 30k conexões como 30k seguidores.

---

## Score

```
score = round( (decisor×Pd + fit×Pf + eng_mapeado×Pe + alcance×Pa) / (Pd+Pf+Pe+Pa) × 10 )
```

Escala 0-100. **Nunca persista o score no JSON.** É derivado, calculado no render, e é isso que permite mudar peso sem reprocessar nada.

### Tiers

| Tier | Corte | Ação |
|---|---|---|
| A | ≥ 75 | Contatar agora |
| B | 55-74 | Aquecer antes: comentar, responder story, aparecer |
| C | 35-54 | Observar, sem ação |
| D | < 35 | Arquivo |

---

## Tipos de perfil

Rótulo qualitativo, independente do score. Serve pra separar coisas que o número junta.

| Tipo | Quem é |
|---|---|
| `Cliente potencial` | Decide e tem o problema. Pipeline direto. |
| `Parceiro` | Vende pro mesmo cliente sem competir. Agência, consultoria complementar. |
| `Amplificador` | Audiência grande, poder de indicação, provavelmente não compra |
| `Par sênior` | Mesmo nível técnico. Troca, não venda. |
| `Audiência` | Segue, aprende, sem sinal comercial |
| `Fora do perfil` | Nada a ver com o que ela faz |

Uma pessoa pode ter score 80 e ser `Amplificador`. Isso não é contradição: o score diz que vale contato, o tipo diz que a conversa não é de venda.

---

## Contrato de saída

```json
{
  "url": "https://www.linkedin.com/in/ana-ribeiro/",
  "origem": "LI",
  "nome": "Ana Ribeiro",
  "handle": "",
  "cargo": "Head de Operações",
  "empresa": "Rede Sul Alimentos",
  "setor": "varejo alimentar",
  "seguidores": 4200,
  "decisor": 9,
  "fit": 8,
  "alcance": 6,
  "eng": 1,
  "tipo": "Cliente potencial",
  "porque": "Head de operações em rede de 40 lojas, dor de processo explícita no headline.",
  "evidencia": "Liderando a padronização de processos em 40 lojas",
  "abordagem": "Padronização de 40 lojas sem inflar o time",
  "coletado_em": "2026-08-07",
  "status_coleta": "ok"
}
```

- `seguidores` — número absoluto ou `null`. Nunca `"4k"`.
- `porque` — máx. 18 palavras. O sinal concreto que sustenta a nota. Sem adjetivo de venda.
- `evidencia` — trecho literal do perfil. Vazio se não houver. É o que permite auditar a nota depois.
- `abordagem` — máx. 14 palavras. Gancho de primeira mensagem. Vazio se `tipo` for `Fora do perfil`.

## A regra que não se quebra

Não inventar cargo, empresa ou número que não esteja no texto coletado.

Falta de informação vira campo vazio e nota 3. Nunca uma suposição otimista. O sistema serve pra Karen decidir onde gastar tempo, e um lead inventado custa mais caro que um lead perdido.
