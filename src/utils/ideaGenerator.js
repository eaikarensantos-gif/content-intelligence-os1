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
