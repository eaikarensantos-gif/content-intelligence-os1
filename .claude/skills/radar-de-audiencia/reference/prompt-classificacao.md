# Prompt de classificação — Etapa 2

Aplique a cada texto bruto de `data/raw/`, em lotes de 10 perfis. Leia `criterios.md` junto, ele tem a rubrica completa.

---

## Prompt

> Você analisa perfis de seguidores de Karen Santos, designer sênior e consultora de IA aplicada a negócios. Ela vende consultoria, mentoria e projetos para empresas — não vende curso de massa.
>
> Recebe o texto bruto de páginas de perfil do LinkedIn ou Instagram. Devolve **somente** um array JSON válido, um objeto por perfil, na mesma ordem da entrada. Sem markdown, sem cerca de código, sem texto antes ou depois.
>
> **Campos:**
>
> - `url` (string) — a URL que veio na primeira linha do texto bruto, sem alterar
> - `origem` (string) — `"IG"` ou `"LI"`
> - `nome` (string) — nome da pessoa, limpo de emoji e cargo
> - `handle` (string) — `@` se houver, senão vazio
> - `cargo` (string) — cargo atual, curto. Vazio se não estiver escrito.
> - `empresa` (string) — empresa atual. Vazio se não estiver escrito.
> - `setor` (string) — nicho em 1 a 3 palavras. Vazio se não der pra saber.
> - `seguidores` (número ou null) — número absoluto. `"4,2 mil"` vira `4200`. Sem informação vira `null`.
> - `decisor` (número 0-10) — poder de decisão de compra, pela rubrica
> - `fit` (número 0-10) — fit de nicho, pela rubrica
> - `alcance` (número 0-10) — alcance, pela rubrica
> - `tipo` (string) — exatamente um de: `Cliente potencial`, `Parceiro`, `Amplificador`, `Par sênior`, `Audiência`, `Fora do perfil`
> - `porque` (string) — máx. 18 palavras. O sinal concreto que sustenta as notas. Direto, sem adjetivo de venda.
> - `evidencia` (string) — trecho **literal** do perfil que sustenta a nota. Vazio se não houver.
> - `abordagem` (string) — máx. 14 palavras. Gancho concreto de primeira mensagem. Vazio se `tipo` for `Fora do perfil`.
> - `status_coleta` (string) — `ok`, `privado`, `nao_encontrado` ou `falhou`
>
> **Não escreva o campo `eng`.** Ele é preenchido pela Karen na interface.
>
> **Rubrica resumida:**
>
> `decisor`: fundador/sócio/dono/CEO = 10. C-level/diretor/VP/head = 9. Gerente com orçamento = 7. Coordenador/consultor autônomo = 5-6. Especialista sem gestão = 3-4. Analista/júnior/estudante = 1-2. Sem informação = 3.
>
> `fit`: empresa com operação repetitiva, volume de dados ou processo documentado (indústria, logística, saúde, jurídico, SaaS B2B, financeiro) = 9-10. Agência, consultoria, e-commerce, educação, serviço com equipe = 7-8. Serviço pequeno, criador com produto e time = 5-6. Criador solo, profissional liberal sem equipe = 3-4. Estudante, hobbyista = 1-2. Sem informação = 3. Problema e orçamento são critérios conjuntos: dor grande sem orçamento não passa de 5.
>
> `alcance`: 50k+ = 10. 10-50k = 8. 3-10k = 6. 800-3k = 4. Abaixo de 800 = 2. Sem informação = 3. No LinkedIn, se só houver conexões, use e registre em `evidencia` que é conexão.
>
> **Regra dura:** não invente cargo, empresa, setor ou número que não esteja no texto. Falta de informação vira campo vazio e nota 3 no eixo afetado, nunca uma suposição otimista. Um lead inventado custa mais caro que um lead perdido.
>
> Perfil privado, inacessível ou vazio: preencha `status_coleta` com o motivo, notas 3/3/3, `tipo` = `Audiência`, e `porque` = "Perfil sem conteúdo legível."
>
> Devolva exatamente um objeto por perfil de entrada.

---

## Formato do texto bruto

Cada arquivo `data/raw/<slug>.txt` começa com a URL:

```
https://www.linkedin.com/in/ana-ribeiro/
---
Ana Ribeiro
Head de Operações na Rede Sul Alimentos
Liderando a padronização de processos em 40 lojas
São Paulo, Brasil · 4.212 seguidores · 500+ conexões
[...]
```

---

## Validação depois de cada lote

Antes de gravar, cheque:

1. Todo objeto tem `url` e ela bate com a entrada
2. `decisor`, `fit` e `alcance` são número entre 0 e 10
3. `seguidores` é número ou `null`, nunca string
4. Nenhum objeto tem `eng`
5. `tipo` está na lista fechada
6. `porque` cabe em 18 palavras, `abordagem` em 14

Objeto que falhar na checagem: reprocesse só ele. Não descarte, não preencha no chute.

---

## Erro mais comum

Inferir seniority pelo tom da bio em vez do cargo escrito. Bio confiante de analista júnior não é cargo de diretor. Se o cargo não está escrito, `cargo` fica vazio e `decisor` é 3 — mesmo que a pessoa escreva bonito.
