// Gerador de Prompt — chamadas de IA para os modos da aba "Gerador de Prompt".
//
// Reproduz, como forms preenchíveis dentro do app, os 5 templates de prompt
// que a Karen já usava manualmente colados no chat (Personalidade, Disruptivo,
// Linguagem, Ranqueamento, Legenda) e um gerador de títulos a partir das 100
// fórmulas de referência (ver data/promptGenTemplates.js). Mesmo padrão de
// chamada usado pela aba "Criar" (UnifiedCreator): endpoint /api/ai?action=openai,
// filtro de autenticidade injetado no system, e varredura+correção anti-clichê
// (lib/clicheSweep) rodando sobre o resultado antes de devolver pra tela.

import { ANTI_AI_FILTER } from './antiAIFilter'
import { withManualOperacional } from './manualOperacional'
import { extractJsonArray, extractJsonObject, assertNotTruncated } from '../utils/aiJson'
import { sweepAndFixPaths } from './clicheSweep'
import { buildVoiceContext } from '../utils/voiceContext'
import { TITULO_CATEGORIES, LANGUAGE_STYLES } from '../data/promptGenTemplates'

async function callGemini(apiKey, { system, prompt, maxTokens = 2000 }) {
  if (!apiKey?.trim()) throw new Error('Configure sua API key em Analytics > Configurações.')

  const res = await fetch('/api/ai?action=openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      model: 'gpt-5.6-terra',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erro ${res.status}`)
  }
  const data = await res.json()
  assertNotTruncated(data)
  return data.content?.find((b) => b.type === 'text')?.text || ''
}

function buildSystem(specificSystem, voiceCtx) {
  return withManualOperacional(`${ANTI_AI_FILTER}\n\n---\n\n${specificSystem}${voiceCtx || ''}`)
}

const PERSONAL_PROMPT_CONTEXT = `

## STUDIO PESSOAL — DO LADO DE CÁ
Este conteúdo mostra Karen como pessoa física, fora do campo profissional. O objetivo é criar conexão por meio de cenas, gostos, contradições e pequenas vivências, sem expor intimidade.

Territórios editoriais permitidos:
- Vida com Naomi
- A vida dentro de casa
- Fé na vida real
- Achados que valem a pena
- Meu repertório particular
- Ser adulta é isso?

Regras obrigatórias:
- Naomi é a bulldog de Karen. Nunca a trate como filha, criança ou pessoa.
- Naomi só aparece quando o tema a menciona ou pertence claramente ao território Vida com Naomi.
- Use primeira pessoa, detalhe observável e linguagem de conversa.
- Preserve limites de intimidade: nada de conflitos familiares, relacionamento, saúde, localização, rotina de segurança ou informação privada não fornecida.
- Nunca invente memória, hábito, compra, fala, emoção, horário ou episódio da vida de Karen. Quando faltar um detalhe indispensável, escreva [Karen: inserir detalhe real].
- Evite tom corporativo, aula, autoridade profissional, produtividade, venda e lição de vida.
- Humor pode ser seco e afetuoso, sem humanização açucarada de Naomi.
- A saída deve soar publicável no Instagram pessoal e nascer de uma cena concreta, não de uma reflexão genérica.`

function personalContext(voiceOpts) {
  return voiceOpts?.persona === 'pessoal' ? PERSONAL_PROMPT_CONTEXT : ''
}

function voiceContextFor(voiceOpts) {
  return `${buildVoiceContext(voiceOpts.brandVoice, voiceOpts.dislikedContent, voiceOpts.bannedWords, voiceOpts.posicionamento)}${personalContext(voiceOpts)}`
}

/** Paths de linhas curtas de um array simples (ex.: result.diretos[0]). */
function shortArrayPaths(result, field) {
  const list = Array.isArray(result?.[field]) ? result[field] : []
  return list.map((_, i) => ({ path: [field, i], isClosing: false, short: true, label: `${field} ${i + 1}` }))
}

/** Paths de textos longos de um array (ex.: 5 versões de legenda). */
function longArrayPaths(result, field) {
  const list = Array.isArray(result?.[field]) ? result[field] : []
  return list.map((_, i) => ({ path: [field, i], isClosing: true, short: false, label: `${field} ${i + 1}` }))
}

// ─── 1. Prompt Personalidade — 30 ganchos provocativos ───────────────────────

export async function generatePersonalityHooks(apiKey, { ideia, publicoAlvo }, voiceOpts = {}) {
  const voiceCtx = voiceContextFor(voiceOpts)
  const isPessoal = voiceOpts.persona === 'pessoal'
  const system = buildSystem(
    isPessoal
      ? `Você cria aberturas para Reels pessoais que parecem o começo espontâneo de uma história real. Gere 3 grupos de 10:\n- "diretos": começam pela cena ou constatação concreta.\n- "storytelling": começam por uma lembrança, hábito ou pequena tensão ainda sem moral.\n- "impactante": frases curtas com personalidade e humor contido, sem parecer slogan.\n\nVarie os mecanismos, não apenas sinônimos. Nenhuma abertura pode presumir um fato que Karen não forneceu.`
      : `Você cria ganchos (hooks) de abertura extremamente provocativos e com personalidade para vídeos/reels, mantendo uma opinião real — não neutra — sobre o tema. Gere 3 grupos de 10 ganchos:\n- "diretos": ganchos diretos, que prendem a atenção logo na primeira frase.\n- "storytelling": ganchos com storytelling e reflexão pessoal.\n- "impactante": ganchos em formato de frase de impacto curta.\n\nCada gancho deve ser autocontido (funciona sem contexto adicional) e específico ao público informado.`,
    voiceCtx
  )
  const prompt = `Ideia do vídeo: ${ideia}\n${isPessoal ? 'Quem pode se identificar' : 'Público-alvo'}: ${publicoAlvo || 'pessoas que reconhecem essa vivência'}\n\nResponda APENAS com um JSON no formato:\n{"diretos": ["...", ...10 itens], "storytelling": ["...", ...10 itens], "impactante": ["...", ...10 itens]}`

  const raw = await callGemini(apiKey, { system, prompt, maxTokens: 3000 })
  const result = extractJsonObject(raw)

  const sweep = await sweepAndFixPaths(
    apiKey,
    result,
    (o) => [...shortArrayPaths(o, 'diretos'), ...shortArrayPaths(o, 'storytelling'), ...shortArrayPaths(o, 'impactante')],
    voiceOpts.bannedWords
  )
  return { result, sweep }
}

// ─── 2. Prompt Disruptivo — reformular copy pra gerar discussão ──────────────

export async function generateDisruptiveCopy(apiKey, { textoOriginal, publicoAlvo }, voiceOpts = {}) {
  const voiceCtx = voiceContextFor(voiceOpts)
  const isPessoal = voiceOpts.persona === 'pessoal'
  const system = buildSystem(
    isPessoal
      ? `Você tira a aparência genérica de um texto pessoal. Preserve o fato narrado e acrescente recorte, cadência oral e personalidade apenas com informações já fornecidas. A versão deve criar identificação, não polêmica. Não intensifique emoção, não invente vulnerabilidade e não transforme a cena em lição.`
      : `Você reformula copy de reels/posts para ser disruptiva e gerar discussão real nos comentários — uma opinião que uma parte do público concorda e outra discorda, sustentada com um argumento verdadeiro (não uma provocação vazia). Nunca cai em falta de consenso genérica só pra causar polêmica: a opinião precisa ser defensável.`,
    voiceCtx
  )
  const prompt = `Copy original:\n${textoOriginal}\n\nPúblico-alvo que vamos atingir: ${publicoAlvo}\n\nResponda APENAS com um JSON no formato:\n{"versao": "copy reformulada completa"}`

  const raw = await callGemini(apiKey, { system, prompt, maxTokens: 1500 })
  const result = extractJsonObject(raw)

  const sweep = await sweepAndFixPaths(
    apiKey,
    result,
    (o) => (typeof o.versao === 'string' ? [{ path: ['versao'], isClosing: true, short: false, label: 'Versão disruptiva' }] : []),
    voiceOpts.bannedWords
  )
  return { result, sweep }
}

// ─── 3. Prompt Linguagem — 5 versões de legenda num estilo de linguagem ──────

export function languageStyleLabel(estiloId) {
  return LANGUAGE_STYLES.find((s) => s.id === estiloId)?.label || estiloId
}

export async function generateLanguageVariants(apiKey, { textoBase, estiloId, objetivo, publicoAlvo }, voiceOpts = {}) {
  const voiceCtx = voiceContextFor(voiceOpts)
  const estiloLabel = languageStyleLabel(estiloId)
  const system = buildSystem(
    `Você reformula legendas de reels em um estilo de linguagem específico, sem soar forçado — o estilo tem que parecer natural pra quem fala assim, não uma caricatura. Gere exatamente 5 versões diferentes entre si (ângulos ou aberturas diferentes), todas no mesmo estilo de linguagem e com o mesmo objetivo.`,
    voiceCtx
  )
  const prompt = `Texto base da legenda:\n${textoBase}\n\nEstilo de linguagem: ${estiloLabel}\nObjetivo: ${objetivo}\nPúblico-alvo: ${publicoAlvo}\n\nResponda APENAS com um JSON no formato:\n{"versoes": ["versão 1", "versão 2", "versão 3", "versão 4", "versão 5"]}`

  const raw = await callGemini(apiKey, { system, prompt, maxTokens: 2500 })
  const result = extractJsonObject(raw)

  const sweep = await sweepAndFixPaths(apiKey, result, (o) => longArrayPaths(o, 'versoes'), voiceOpts.bannedWords)
  return { result, sweep }
}

// ─── 4. Prompt Ranqueamento — hashtags por volume ────────────────────────────
// Não passa pela varredura anti-clichê: hashtags são palavras-chave, não prosa.

export async function generateHashtagRanking(apiKey, { palavrasChave }, voiceOpts = {}) {
  const system = withManualOperacional(
    `Você é especialista em SEO de Instagram. A partir de uma lista de palavras-chave de nicho, gera hashtags brasileiras segmentadas por volume de uso estimado e hashtags internacionais ("gringas") virais relacionadas.${personalContext(voiceOpts)}`
  )
  const prompt = `Palavras-chave do perfil:\n${palavrasChave}\n\nListe:\n- "baixo": 2 hashtags brasileiras por palavra-chave com uso médio de ~10 mil posts\n- "medio": 2 hashtags brasileiras por palavra-chave com uso médio de 100-500 mil posts\n- "viral": 3 hashtags brasileiras por palavra-chave com mais de 1 milhão de usos\n- "gringas": 5 hashtags internacionais virais (mais de 1 milhão de usos) relacionadas ao nicho\n\nResponda APENAS com um JSON no formato:\n{"baixo": ["#..."], "medio": ["#..."], "viral": ["#..."], "gringas": ["#..."]}`

  const raw = await callGemini(apiKey, { system, prompt, maxTokens: 1500 })
  return { result: extractJsonObject(raw) }
}

// ─── 5. Prompt Legenda — estrutura de venda em 6 passos ──────────────────────

export async function generateSalesCaption(apiKey, { publicoAlvo, objetivo, produto }, voiceOpts = {}) {
  const voiceCtx = voiceContextFor(voiceOpts)
  const isPessoal = voiceOpts.persona === 'pessoal'
  const system = buildSystem(
    isPessoal
      ? `Você escreve uma legenda pessoal em 5 movimentos invisíveis:\n1. Abra dentro de uma cena ou constatação concreta.\n2. Mostre o detalhe que tornou aquilo reconhecível para Karen.\n3. Diga o que ela percebeu, sem universalizar.\n4. Preserve alguma ambiguidade ou humor da vida real.\n5. Feche com observação seca ou convite específico à identificação.\nSem venda, conselho, exercício, superação ou moral. Use [Karen: inserir detalhe real] se a experiência fornecida não sustentar o texto.`
      : `Você escreve legendas de venda para Instagram seguindo esta estrutura de 6 movimentos, sem nomear as etapas no texto final:\n1. Introdução impactante com pergunta ou afirmação direta\n2. Identificação do problema e aumento de consciência\n3. Conexão e empatia genuína (sem invadir o sentimento do leitor, sem "você se sente...")\n4. Transformação — exemplo ou caso real concreto, sem depoimento genérico\n5. Apresentação da solução de forma sutil, quando fizer sentido pro objetivo\n6. Fechamento com urgência ou desejo real, sem pergunta retórica e sem reticências de convite à reflexão`,
    voiceCtx
  )
  const prompt = `${isPessoal ? 'Quem pode se identificar' : 'Público-alvo'}: ${publicoAlvo}\n${isPessoal ? 'Vivência que Karen quer dividir' : 'Objetivo principal'}: ${objetivo}${produto ? `\n${isPessoal ? 'Detalhe real fornecido' : 'Produto/serviço'}: ${produto}` : ''}\n\nResponda APENAS com um JSON no formato:\n{"legenda": "texto completo da legenda"}`

  const raw = await callGemini(apiKey, { system, prompt, maxTokens: 1500 })
  const result = extractJsonObject(raw)

  const sweep = await sweepAndFixPaths(
    apiKey,
    result,
    (o) => (typeof o.legenda === 'string' ? [{ path: ['legenda'], isClosing: true, short: false, label: 'Legenda' }] : []),
    voiceOpts.bannedWords
  )
  return { result, sweep }
}

// ─── 6. Prompt Legenda complementar — variações de um texto dado ─────────────

export async function generateComplementaryCaption(apiKey, { textoBase, estiloId, palavraChave }, voiceOpts = {}) {
  const voiceCtx = voiceContextFor(voiceOpts)
  const estiloLabel = languageStyleLabel(estiloId)
  const system = buildSystem(
    `Você gera variações de uma legenda mantendo o mesmo estilo de linguagem, favorecendo naturalmente a palavra-chave de SEO informada (sem forçar repetição robótica). Gere exatamente 5 versões.`,
    voiceCtx
  )
  const prompt = `Texto base:\n${textoBase}\n\nEstilo de linguagem: ${estiloLabel}\nPalavra-chave a favorecer: ${palavraChave}\n\nResponda APENAS com um JSON no formato:\n{"versoes": ["versão 1", "versão 2", "versão 3", "versão 4", "versão 5"]}`

  const raw = await callGemini(apiKey, { system, prompt, maxTokens: 2500 })
  const result = extractJsonObject(raw)

  const sweep = await sweepAndFixPaths(apiKey, result, (o) => longArrayPaths(o, 'versoes'), voiceOpts.bannedWords)
  return { result, sweep }
}

// ─── 7. Títulos Poderosos — preenche as 100 fórmulas de referência ───────────

export function titleCategoryLabel(categoriaId) {
  return TITULO_CATEGORIES.find((c) => c.id === categoriaId)?.label || categoriaId
}

export async function generatePowerfulTitles(apiKey, { tema, categoriaId, count = 10 }, voiceOpts = {}) {
  const voiceCtx = voiceContextFor(voiceOpts)
  const isPessoal = voiceOpts.persona === 'pessoal'
  const categoria = TITULO_CATEGORIES.find((c) => c.id === categoriaId) || TITULO_CATEGORIES[0]
  const system = buildSystem(
    `Você gera títulos/ganchos de post a partir de fórmulas de referência de copywriting. As fórmulas abaixo são só INSPIRAÇÃO DE ESTRUTURA (o tipo de gancho: ${categoria.label.toLowerCase()}) — nunca copie o tom de clickbait, extremismo ("NUNCA", "SEMPRE") ou urgência de medo delas. Reescreva cada estrutura como uma afirmação direta e honesta, ${isPessoal ? 'com voz pessoal, detalhe cotidiano e curiosidade natural' : 'no tom sênior e observacional exigido pelo filtro de autenticidade acima'}, mantendo só a INTENÇÃO da fórmula, preenchida com o tema informado.${isPessoal ? ' O título deve parecer uma frase que Karen diria, nunca uma promessa, conselho ou manchete de especialista.' : ''}\n\nFÓRMULAS DE REFERÊNCIA (estrutura, não o texto final):\n${categoria.formulas.join('\n')}`,
    voiceCtx
  )
  const prompt = `Tema/nicho/produto: ${tema}\n\nGere ${count} títulos inspirados nas fórmulas de "${categoria.label}", preenchendo com o tema acima. Responda APENAS com um array JSON de ${count} strings.`

  const raw = await callGemini(apiKey, { system, prompt, maxTokens: 2000 })
  const result = { titulos: extractJsonArray(raw) }

  const sweep = await sweepAndFixPaths(apiKey, result, (o) => shortArrayPaths(o, 'titulos'), voiceOpts.bannedWords)
  return { result, sweep }
}
