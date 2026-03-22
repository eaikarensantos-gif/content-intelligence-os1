const TEMPLATES = [
  {
    hook_type: 'lista',
    title: (topic, n) => `${n} Estratégias de ${topic} Que Realmente Funcionam em 2025`,
    description: (topic) => `Um detalhamento das melhores estratégias de ${topic}, classificadas por impacto. Inclui exemplos reais, dados e próximos passos acionáveis para cada uma.`,
    formats: ['carrossel', 'thread'],
    platforms: ['linkedin', 'twitter'],
  },
  {
    hook_type: 'contrario',
    title: (topic) => `Por Que a Maioria dos Conselhos Sobre ${topic} Está Errada`,
    description: (topic) => `Uma perspectiva contrária que desafia o senso comum sobre ${topic}. Baseada em dados e experiência prática, este post vira suposições de cabeça para baixo.`,
    formats: ['thread', 'video'],
    platforms: ['twitter', 'youtube'],
  },
  {
    hook_type: 'historia',
    title: (topic) => `Passei 6 Meses Dominando ${topic} — Aqui Está Tudo Que Aprendi`,
    description: (topic) => `Uma jornada pessoal documentando lições, fracassos e vitórias de mergulhar fundo em ${topic}. Autêntico, relacionável e cheio de aprendizados.`,
    formats: ['video', 'artigo'],
    platforms: ['youtube', 'linkedin'],
  },
  {
    hook_type: 'dados',
    title: (topic) => `Os Dados Sobre ${topic} Que Ninguém Está Mostrando`,
    description: (topic) => `Uma análise de estatísticas subreportadas e tendências em ${topic}. Insights baseados em dados que desafiam suposições e oferecem vantagem competitiva.`,
    formats: ['carrossel', 'thread'],
    platforms: ['linkedin', 'twitter'],
  },
  {
    hook_type: 'problema',
    title: (topic) => `O Erro #1 Que as Pessoas Cometem Com ${topic} (E Como Corrigir)`,
    description: (topic) => `Um mergulho profundo no equívoco mais comum e custoso em ${topic}, por que ele acontece e um caminho claro passo a passo para corrigi-lo.`,
    formats: ['reel', 'carrossel'],
    platforms: ['instagram', 'tiktok'],
  },
  {
    hook_type: 'pergunta',
    title: (topic) => `Vale a Pena Investir em ${topic}? Uma Resposta Honesta`,
    description: (topic) => `Uma resposta imparcial e baseada em evidências para a pergunta que todos pensam mas poucos fazem sobre ${topic}. Corta o hype para entregar perspectiva real.`,
    formats: ['video', 'artigo'],
    platforms: ['youtube', 'linkedin'],
  },
]

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Cultural signal–based idea generation ────────────────────────────────────
export async function generateSignalBasedIdeas(apiKey, { niche, audience, insights, trendResults }) {
  const insightsCtx = insights?.length
    ? `\nCREATOR DATA:\n${insights.slice(0, 6).map((i) => `- ${i.title}`).join('\n')}`
    : ''
  const trendCtx = trendResults
    ? `\nTREND CONTEXT: "${trendResults.topic}" — ${(trendResults.opportunities || []).slice(0, 3).map((o) => o.title).join(', ')}`
    : ''

  const prompt = `You are a thoughtful Brazilian content creator who observes real cultural patterns and transforms them into authentic, reflective content. Your job is to detect REAL cultural tensions in the "${niche || 'criação de conteúdo digital'}" space and transform them into content ideas that feel like genuine conversations happening RIGHT NOW.

TARGET AUDIENCE: ${audience || 'criadores digitais e empreendedores brasileiros'}${insightsCtx}${trendCtx}

WRITING STYLE RULES (CRITICAL — FOLLOW EXACTLY):
- NEVER use these phrases or variations: "isso vai mudar tudo", "o erro que 90% cometem", "ninguém te conta isso", "a verdade é que", "o segredo de...", "X dicas para...", "como fazer em 5 passos"
- PREFER this style of language: "Tenho notado uma coisa curiosa...", "Depois de um tempo você percebe...", "Talvez o problema não seja...", "Existe um padrão que pouca gente observa...", "O que me incomoda nessa conversa é..."
- Write in Brazilian Portuguese with natural, conversational, observational tone
- Content must feel human, reflective, and culturally natural — NOT like AI-generated marketing copy
- Avoid motivational speech, exaggerated hooks, and clickbait patterns

STRICT RULES — FOLLOW EXACTLY:
1. NO generic evergreen content (no "how to start", no "5 tips", no "beginner's guide")
2. Every idea must be rooted in a specific cultural signal from 2025–2026
3. Titles must sound like a thoughtful creator's observation on a CHANGE happening now
4. Ideas must feel timely — someone could publish this next week and it would be perfectly relevant
5. ALL text in Brazilian Portuguese with reflective, observational tone
6. Detect 5-6 signals with tensions, generate 6-8 ideas ranked by novelty + relevance

SIGNAL CATEGORIES: tecnologia | comportamento | plataforma | debate | formato | oportunidade
TENSION TYPES: confusão | ceticismo | contradição | risco oculto | oportunidade ignorada | debate acirrado
ANGLES: contrário | consequência inesperada | bastidores | padrão emergente | previsão | erro comum | oportunidade

Respond ONLY with a valid JSON object (no markdown, no code blocks):
{
  "signals": [
    {
      "id": "s1",
      "signal": "descrição do que está acontecendo agora no espaço",
      "category": "tecnologia",
      "tension": "a tensão subjacente que a maioria ignora",
      "tension_type": "confusão"
    }
  ],
  "ideas": [
    {
      "id": "i1",
      "rank": 1,
      "title": "título específico e conversacional — soa como algo que está acontecendo agora",
      "core_argument": "o argumento central em 1-2 frases diretas",
      "signal_id": "s1",
      "signal_label": "rótulo curto do sinal (máx 5 palavras)",
      "tension": "a tensão específica que esta ideia aborda",
      "angle": "contrário",
      "hook_type": "dados|história|problema|pergunta|contrário",
      "hook_line": "frase exata de abertura irresistível em português",
      "format": "reel|carrossel|thread|video|artigo",
      "platform": "instagram|linkedin|tiktok|youtube|twitter",
      "priority": "high|medium|low",
      "novelty_score": 8,
      "relevance_score": 9,
      "narrative": {
        "hook": "gancho de abertura — para o scroll",
        "observation": "o que está realmente acontecendo no mercado",
        "tension": "a contradição ou conflito que poucos percebem",
        "interpretation": "seu ângulo único sobre o porquê disso importar",
        "conclusion": "o que isso significa para sua audiência agora"
      },
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    }
  ]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 6000,
      system: 'You are a sharp, curious Brazilian content creator who observes real cultural patterns. Write in natural, observational Brazilian Portuguese. Your DEFAULT energy is curiosity, wit, and genuine enthusiasm — never melancholic, pessimistic, or defeatist. You can be reflective but always land on something constructive, interesting, or energizing. NEVER use clickbait like "isso vai mudar tudo" or "ninguém te conta isso". PREFER: "Tenho notado uma coisa curiosa...", "A parte boa é que...", "Isso me surpreendeu...", "Descobri sem querer...". Respond ONLY with a valid JSON object. No markdown, no code blocks.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const { handleApiError } = await import('./apiError.js')
    await handleApiError(response)
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text || ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta da IA não contém JSON válido')

  const result = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
  return {
    signals: result.signals || [],
    ideas: (result.ideas || []).map((idea, i) => ({
      ...idea,
      id: `sig-${Date.now()}-${i}`,
      generated_at: new Date().toISOString(),
      ai_powered: true,
      source_type: 'ai',
    })),
  }
}

// ─── Claude-powered idea generation ──────────────────────────────────────────
export async function generateIdeasWithClaude(apiKey, { niche, audience, insights, trendResults, count = 10 }) {
  const insightsSummary = insights?.length
    ? insights.slice(0, 12).map((ins) => `- ${ins.title}${ins.description ? ': ' + ins.description : ''}`).join('\n')
    : 'Nenhum insight disponível'

  const trendSummary = trendResults
    ? `Tópico: "${trendResults.topic}"\nOportunidades:\n${(trendResults.opportunities || []).slice(0, 6).map((o) => `- ${o.title}: ${o.description || ''}`).join('\n')}`
    : 'Nenhum dado de tendências disponível'

  const prompt = `You are a thoughtful Brazilian content creator who observes real cultural patterns and transforms them into authentic, reflective content. Generate ${count} highly specific, creative, and immediately actionable content ideas.

CREATOR NICHE: ${niche || 'Criação de conteúdo e marketing digital'}
TARGET AUDIENCE: ${audience || 'Criadores digitais e empreendedores'}

ANALYTICS INSIGHTS FROM THIS CREATOR'S DATA:
${insightsSummary}

TREND RADAR DATA:
${trendSummary}

WRITING STYLE RULES (CRITICAL — FOLLOW EXACTLY):
- NEVER use these phrases or variations: "isso vai mudar tudo", "o erro que 90% cometem", "ninguém te conta isso", "a verdade é que", "o segredo de...", "X dicas para...", "como fazer em 5 passos"
- PREFER this style: "Tenho notado uma coisa curiosa...", "Depois de um tempo você percebe...", "Talvez o problema não seja...", "Existe um padrão que pouca gente observa...", "O que me incomoda nessa conversa é..."
- Content must feel human, reflective, observational — NOT like AI marketing copy or motivational speech

RULES:
- All text must be in Brazilian Portuguese with natural, conversational tone
- Titles must be specific, observational, and reflective — not clickbait
- Each idea must have a unique angle that makes it stand out
- Vary formats (carrossel, reel, thread, video, artigo) and platforms (instagram, linkedin, twitter, youtube, tiktok)
- Mix hook types: lista, contrario, historia, dados, problema, pergunta, curiosidade, numero
- hook_suggestion must be the EXACT first sentence — observational and authentic, not clickbait
- script_outline must have 4-6 specific bullet points, not generic ones
- hashtags: 3-5 relevant Brazilian hashtags

Respond with ONLY a valid JSON array, no markdown code blocks, no explanation:
[
  {
    "title": "Título específico e compelling em português",
    "description": "2-3 frases descrevendo o ângulo e proposta de valor únicos",
    "hook_suggestion": "Frase exata de abertura que vai parar o scroll — irresistível",
    "angle": "O que torna este conteúdo único versus o que já existe sobre este tema",
    "why_now": "Por que agora é o momento certo para este conteúdo",
    "script_outline": ["Ponto específico 1", "Ponto específico 2", "Ponto específico 3", "CTA"],
    "format": "carrossel",
    "platform": "instagram",
    "priority": "high",
    "hook": "dados",
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
    "source_type": "ai"
  }
]`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 5000,
      system: 'You are a sharp, curious Brazilian content creator. Write in natural, observational Brazilian Portuguese. Your DEFAULT energy is curiosity, wit, and genuine enthusiasm — never melancholic, pessimistic, or defeatist. You can be reflective but always land on something constructive, interesting, or energizing. NEVER use clickbait like "isso vai mudar tudo" or "ninguém te conta isso". PREFER: "Tenho notado...", "A parte boa é que...", "Isso me surpreendeu...", "O mais interessante é...". Respond ONLY with a valid JSON array. No markdown, no code blocks, no explanation text before or after.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const { handleApiError } = await import('./apiError.js')
    await handleApiError(response)
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text || ''
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Resposta da IA não contém JSON válido')

  const ideas = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
  return ideas.map((idea, i) => ({
    ...idea,
    id: `ai-${Date.now()}-${i}`,
    generated_at: new Date().toISOString(),
    ai_powered: true,
  }))
}

// ─── Template-based fallback ──────────────────────────────────────────────────
export function generateIdeasFromInsights(insights, count = 6) {
  if (!insights || insights.length === 0) return []

  const generated = []

  insights.forEach((insight, i) => {
    if (generated.length >= count) return

    const topic = extractTopicFromInsight(insight)
    const template = TEMPLATES.find((t) => {
      if (insight.type === 'format') return t.hook_type === 'dados'
      if (insight.type === 'hook') return t.hook_type === 'historia'
      if (insight.type === 'platform') return t.hook_type === 'lista'
      return true
    }) || pickRandom(TEMPLATES)

    const n = Math.floor(Math.random() * 3) + 5
    generated.push({
      id: `gen-${Date.now()}-${i}`,
      title: typeof template.title === 'function' ? template.title(topic, n) : template.title,
      description: typeof template.description === 'function' ? template.description(topic) : template.description,
      topic,
      hook: template.hook_type,
      format: pickRandom(template.formats),
      platform: pickRandom(template.platforms),
      source_insight: insight.id,
      source_type: 'insight',
      priority: insight.value > 0.04 ? 'high' : 'medium',
      generated_at: new Date().toISOString(),
      ai_powered: false,
    })
  })

  while (generated.length < count) {
    const template = pickRandom(TEMPLATES)
    const topics = ['Estratégia de Conteúdo', 'Economia Criativa', 'Ferramentas de IA', 'Construção de Audiência', 'Monetização Digital']
    const topic = pickRandom(topics)
    const n = Math.floor(Math.random() * 4) + 4
    generated.push({
      id: `gen-${Date.now()}-extra-${generated.length}`,
      title: typeof template.title === 'function' ? template.title(topic, n) : template.title,
      description: typeof template.description === 'function' ? template.description(topic) : template.description,
      topic,
      hook: template.hook_type,
      format: pickRandom(template.formats),
      platform: pickRandom(template.platforms),
      source_insight: null,
      source_type: 'ai',
      priority: 'medium',
      generated_at: new Date().toISOString(),
      ai_powered: false,
    })
  }

  return generated.slice(0, count)
}

export function generateIdeasFromTrends(trendResults, count = 4) {
  if (!trendResults) return []
  const { topic, opportunities } = trendResults
  return (opportunities || []).slice(0, count).map((opp, i) => ({
    id: `trend-gen-${Date.now()}-${i}`,
    title: opp.title,
    description: opp.description,
    topic,
    hook: opp.hook?.toLowerCase().replace('gancho de ', '').replace('gancho ', '') || 'lista',
    format: opp.format,
    platform: opp.platform,
    source_insight: null,
    source_type: 'trend',
    priority: opp.potential === 'Very High' ? 'high' : opp.potential === 'High' ? 'medium' : 'low',
    generated_at: new Date().toISOString(),
    ai_powered: false,
  }))
}

function extractTopicFromInsight(insight) {
  const words = insight.title?.split(' ') || []
  const contentTopics = ['carrossel', 'thread', 'video', 'reel', 'artigo', 'linkedin', 'instagram', 'twitter', 'youtube', 'tiktok']
  const found = words.find((w) => contentTopics.includes(w.toLowerCase()))
  if (found) {
    if (['linkedin', 'instagram', 'twitter', 'youtube', 'tiktok'].includes(found.toLowerCase())) {
      return 'Estratégia de Plataforma'
    }
    return `Conteúdo em ${found.charAt(0).toUpperCase() + found.slice(1)}`
  }
  return 'Estratégia de Conteúdo'
}
