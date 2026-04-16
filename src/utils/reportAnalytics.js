import { enrichMetric, calcEngagement, calcEngagementRate, calcAuthorityScore } from './analytics'

export function getTop10Posts(posts, metrics) {
  return metrics
    .map((m) => {
      const post = posts.find((p) => p.id === m.post_id)
      const e = enrichMetric(m)
      return { ...e, post, metric: m }
    })
    .filter((x) => x.post)
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 10)
}

export function getBottom5Posts(posts, metrics) {
  return metrics
    .map((m) => {
      const post = posts.find((p) => p.id === m.post_id)
      const e = enrichMetric(m)
      return { ...e, post, metric: m }
    })
    .filter((x) => x.post)
    .sort((a, b) => a.engagement - b.engagement)
    .slice(0, 5)
}

export function getMostConvertingContent(posts, metrics) {
  return metrics
    .map((m) => {
      const post = posts.find((p) => p.id === m.post_id)
      const e = enrichMetric(m)
      return { ...e, post, metric: m }
    })
    .filter((x) => x.post)
    .sort((a, b) => (b.link_clicks || 0) - (a.link_clicks || 0))
    .slice(0, 5)
}

export function getMostActiveTimes(metrics) {
  if (!metrics.length) return []

  const hourMap = {}
  metrics.forEach((m) => {
    const date = new Date(m.date)
    const hour = date.getHours()
    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
    const key = `${dayOfWeek} ${String(hour).padStart(2, '0')}:00`

    if (!hourMap[key]) {
      hourMap[key] = { time: key, hour, dayOfWeek, impressions: 0, engagement: 0, count: 0 }
    }
    const e = enrichMetric(m)
    hourMap[key].impressions += m.impressions
    hourMap[key].engagement += e.engagement
    hourMap[key].count += 1
  })

  return Object.values(hourMap)
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5)
}

export function getEngagementMetrics(posts, metrics, filterType = 'all') {
  let filtered = metrics

  if (filterType === 'stories') {
    filtered = metrics.filter((m) => {
      const post = posts.find((p) => p.id === m.post_id)
      return post?.format === 'Story'
    })
  } else if (filterType === 'posts') {
    filtered = metrics.filter((m) => {
      const post = posts.find((p) => p.id === m.post_id)
      return post?.format !== 'Story'
    })
  }

  if (!filtered.length) return null

  const enriched = filtered.map(enrichMetric)
  return {
    totalEngagement: enriched.reduce((s, e) => s + e.engagement, 0),
    avgEngagementRate: enriched.reduce((s, e) => s + e.engagement_rate, 0) / enriched.length,
    totalImpressions: enriched.reduce((s, e) => s + e.impressions, 0),
    totalLikes: enriched.reduce((s, e) => s + (e.likes || 0), 0),
    totalComments: enriched.reduce((s, e) => s + (e.comments || 0), 0),
    totalShares: enriched.reduce((s, e) => s + (e.shares || 0), 0),
    totalSaves: enriched.reduce((s, e) => s + (e.saves || 0), 0),
    totalAuthorityScore: enriched.reduce((s, e) => s + e.authority_score, 0),
  }
}

export function generateStrategicInsights(posts, metrics) {
  if (!metrics.length) return []

  const insights = []
  const enriched = metrics.map(enrichMetric)

  // Find best format
  const byFormat = {}
  metrics.forEach((m) => {
    const post = posts.find((p) => p.id === m.post_id)
    if (!post) return
    const fmt = post.format
    if (!byFormat[fmt]) byFormat[fmt] = { format: fmt, engagement: 0, count: 0, impressions: 0 }
    const e = enrichMetric(m)
    byFormat[fmt].engagement += e.engagement
    byFormat[fmt].impressions += m.impressions
    byFormat[fmt].count += 1
  })

  const formats = Object.values(byFormat).sort((a, b) => (b.engagement / b.count) - (a.engagement / a.count))
  if (formats.length > 1) {
    insights.push({
      title: `📊 Formato Dominante`,
      description: `O formato "${formats[0].format}" é seu melhor desempenho com ${(formats[0].engagement / formats[0].count).toFixed(0)} engajamentos médios por post.`,
      actionPoint: `Aumente produção de conteúdo em "${formats[0].format}" para 60% do seu mix`,
      type: 'strength',
    })
  }

  // Find best hook type
  const byHook = {}
  metrics.forEach((m) => {
    const post = posts.find((p) => p.id === m.post_id)
    if (!post) return
    const hook = post.hook_type || 'unknown'
    if (!byHook[hook]) byHook[hook] = { hook, authority: 0, count: 0 }
    const e = enrichMetric(m)
    byHook[hook].authority += e.authority_score
    byHook[hook].count += 1
  })

  const hooks = Object.values(byHook).sort((a, b) => (b.authority / b.count) - (a.authority / a.count))
  if (hooks.length > 0 && hooks[0].authority > 0) {
    insights.push({
      title: `🎯 Hook com Maior Impacto`,
      description: `Posts com hook "${hooks[0].hook}" geram ${(hooks[0].authority / hooks[0].count).toFixed(0)} shares/saves por post.`,
      actionPoint: `Use o hook "${hooks[0].hook}" em 70% dos seus próximos posts`,
      type: 'strength',
    })
  }

  // Check engagement rate trend
  const avgER = enriched.reduce((s, e) => s + e.engagement_rate, 0) / enriched.length
  if (avgER < 0.03) {
    insights.push({
      title: `⚠️ Ponto de Atenção: Engajamento Baixo`,
      description: `Seu engajamento médio é ${(avgER * 100).toFixed(1)}% — abaixo do benchmark de 3%.`,
      actionPoint: `Teste CTAs mais fortes e aumente frequência de posting`,
      type: 'attention',
    })
  } else if (avgER > 0.05) {
    insights.push({
      title: `✨ Superdestaque: Alto Engajamento`,
      description: `Seu engajamento de ${(avgER * 100).toFixed(1)}% está acima do benchmark — você está em destaque!`,
      actionPoint: `Mantenha a qualidade e frequência atual`,
      type: 'strength',
    })
  }

  // Check save rate (authority)
  const totalReach = enriched.reduce((s, e) => s + e.reach, 0)
  const totalSaves = enriched.reduce((s, e) => s + (e.saves || 0), 0)
  const saveRate = totalReach > 0 ? totalSaves / totalReach : 0
  if (saveRate > 0.02) {
    insights.push({
      title: `💾 Oportunidade: Conteúdo Salvável`,
      description: `${(saveRate * 100).toFixed(1)}% do seu alcance está salvando posts — isso é potencial de viralizador.`,
      actionPoint: `Crie mais conteúdo educativo/evergreen que mereça ser salvo`,
      type: 'opportunity',
    })
  }

  // Check link clicks conversion
  const totalClicks = enriched.reduce((s, e) => s + (e.link_clicks || 0), 0)
  if (totalClicks === 0) {
    insights.push({
      title: `🔗 Ponto de Atenção: Sem Cliques em Links`,
      description: `Nenhum clique em links registrado — seu CTA pode não estar visível ou atrativo.`,
      actionPoint: `Coloque CTA mais claro, use sticker/button no Instagram`,
      type: 'attention',
    })
  } else {
    const clickRate = totalClicks / totalReach
    insights.push({
      title: `🔗 Taxa de Cliques em Links`,
      description: `${(clickRate * 100).toFixed(2)}% do seu alcance clicou em links — aproveite esse interesse.`,
      actionPoint: `Teste links diferentes para determinar qual CTA converte melhor`,
      type: 'opportunity',
    })
  }

  return insights
}

export function generateNextMonthRecommendations(posts, metrics) {
  const recommendations = []
  const enriched = metrics.map(enrichMetric)

  // Find best format for more content
  const byFormat = {}
  metrics.forEach((m) => {
    const post = posts.find((p) => p.id === m.post_id)
    if (!post) return
    const fmt = post.format
    if (!byFormat[fmt]) byFormat[fmt] = { format: fmt, engagement: 0, count: 0 }
    const e = enrichMetric(m)
    byFormat[fmt].engagement += e.engagement
    byFormat[fmt].count += 1
  })

  const formats = Object.values(byFormat).sort((a, b) => (b.engagement / b.count) - (a.engagement / a.count))
  if (formats.length > 0) {
    recommendations.push({
      week: 'Semana 1-2',
      title: `Aumente ${formats[0].format} para 60% do mix`,
      detail: `Essa é sua melhor formato — dedique mais recursos aqui`,
    })
  }

  recommendations.push({
    week: 'Semana 1-4',
    title: 'Teste novos horários de posting',
    detail: 'Experimente postagem nos horários de pico e meça engagement',
  })

  const avgER = enriched.reduce((s, e) => s + e.engagement_rate, 0) / enriched.length
  if (avgER < 0.04) {
    recommendations.push({
      week: 'Semana 2-3',
      title: 'Intensifique CTAs nos próximos posts',
      detail: 'Aumente frequência de calls-to-action para impulsionar engajamento',
    })
  }

  recommendations.push({
    week: 'Semana 3-4',
    title: 'Analise e replique o top 3 melhor conteúdo',
    detail: 'Reproduza os elementos que funcionaram no seu melhor conteúdo',
  })

  recommendations.push({
    week: 'Semana 4',
    title: 'Agendar reunião de planejamento',
    detail: 'Revise os dados deste mês e ajuste estratégia para o próximo',
  })

  return recommendations
}

export function getDemographicsOverview(metrics) {
  // Esta função seria preenchida com dados reais da Instagram API
  // Por enquanto, retorna estrutura de exemplo
  return {
    genders: [
      { gender: 'Mulher', percentage: 65 },
      { gender: 'Homem', percentage: 35 },
    ],
    topCities: [
      { city: 'São Paulo', percentage: 28 },
      { city: 'Rio de Janeiro', percentage: 18 },
      { city: 'Belo Horizonte', percentage: 12 },
      { city: 'Brasília', percentage: 10 },
      { city: 'Curitiba', percentage: 8 },
    ],
    ageRanges: [
      { range: '18-24', percentage: 35 },
      { range: '25-34', percentage: 40 },
      { range: '35-44', percentage: 15 },
      { range: '45+', percentage: 10 },
    ],
  }
}
