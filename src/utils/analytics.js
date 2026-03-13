export function calcEngagement(m) {
  return (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0)
}

export function calcEngagementRate(m) {
  if (!m.impressions) return 0
  return calcEngagement(m) / m.impressions
}

export function calcAuthorityScore(m) {
  return (m.shares || 0) + (m.saves || 0)
}

export function enrichMetric(m) {
  const engagement = calcEngagement(m)
  const engagement_rate = calcEngagementRate(m)
  const authority_score = calcAuthorityScore(m)
  return { ...m, engagement, engagement_rate, authority_score }
}

export function aggregateByFormat(posts, metrics) {
  const map = {}
  metrics.forEach((m) => {
    const post = posts.find((p) => p.id === m.post_id)
    if (!post) return
    const fmt = post.format
    if (!map[fmt]) map[fmt] = { format: fmt, impressions: 0, engagement: 0, count: 0 }
    const e = enrichMetric(m)
    map[fmt].impressions += m.impressions
    map[fmt].engagement += e.engagement
    map[fmt].count += 1
  })
  return Object.values(map).map((d) => ({
    ...d,
    avg_engagement_rate: d.impressions ? d.engagement / d.impressions : 0,
  }))
}

export function aggregateByPlatform(posts, metrics) {
  const map = {}
  metrics.forEach((m) => {
    const post = posts.find((p) => p.id === m.post_id)
    if (!post) return
    const plt = m.platform || post.platform
    if (!map[plt]) map[plt] = { platform: plt, impressions: 0, engagement: 0, count: 0 }
    const e = enrichMetric(m)
    map[plt].impressions += m.impressions
    map[plt].engagement += e.engagement
    map[plt].count += 1
  })
  return Object.values(map)
}

export function timelineData(metrics) {
  return [...metrics]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((m) => {
      const e = enrichMetric(m)
      return {
        date: m.date,
        impressions: m.impressions,
        reach: m.reach,
        engagement: e.engagement,
        engagement_rate: +(e.engagement_rate * 100).toFixed(2),
      }
    })
}

export function topPosts(posts, metrics, limit = 5) {
  return metrics
    .map((m) => {
      const post = posts.find((p) => p.id === m.post_id)
      const e = enrichMetric(m)
      return { ...e, post }
    })
    .filter((x) => x.post)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit)
}

export function generateInsights(posts, metrics) {
  if (metrics.length < 2) return []
  const insights = []

  const byFormat = aggregateByFormat(posts, metrics)
  if (byFormat.length > 1) {
    const best = [...byFormat].sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate)[0]
    insights.push({
      id: `ins-fmt-${Date.now()}`,
      type: 'format',
      title: `${capitalize(best.format)} gera o maior engajamento`,
      description: `Seus posts em ${best.format} têm uma taxa de engajamento média de ${(best.avg_engagement_rate * 100).toFixed(1)}% — o melhor formato no seu mix. Considere investir mais neste formato.`,
      metric: 'avg_engagement_rate',
      value: best.avg_engagement_rate,
      recommendation: `Crie mais conteúdo no formato ${best.format}`,
      created_at: new Date().toISOString(),
    })
  }

  const hookMap = {}
  metrics.forEach((m) => {
    const post = posts.find((p) => p.id === m.post_id)
    if (!post) return
    const e = enrichMetric(m)
    const hook = post.hook_type || 'desconhecido'
    if (!hookMap[hook]) hookMap[hook] = { hook, authority: 0, count: 0 }
    hookMap[hook].authority += e.authority_score
    hookMap[hook].count += 1
  })
  const hookEntries = Object.values(hookMap)
  if (hookEntries.length > 1) {
    const best = [...hookEntries].sort((a, b) => b.authority / b.count - a.authority / a.count)[0]
    insights.push({
      id: `ins-hook-${Date.now() + 1}`,
      type: 'hook',
      title: `Ganchos "${capitalize(best.hook)}" geram mais compartilhamentos e salvamentos`,
      description: `Posts com gancho ${best.hook} têm pontuação de autoridade média de ${(best.authority / best.count).toFixed(0)}, indicando forte ressonância e compartilhabilidade.`,
      metric: 'authority_score',
      value: best.authority / best.count,
      recommendation: `Abra mais posts com o ângulo ${best.hook}`,
      created_at: new Date().toISOString(),
    })
  }

  const byPlatform = aggregateByPlatform(posts, metrics)
  if (byPlatform.length > 1) {
    const best = [...byPlatform].sort((a, b) => b.impressions / b.count - a.impressions / a.count)[0]
    insights.push({
      id: `ins-plt-${Date.now() + 2}`,
      type: 'platform',
      title: `${capitalize(best.platform)} entrega o maior alcance`,
      description: `Seus posts no ${best.platform} têm média de ${Math.round(best.impressions / best.count).toLocaleString()} impressões por post — sua plataforma de maior alcance. Priorize-a para conteúdo de awareness.`,
      metric: 'avg_impressions',
      value: best.impressions / best.count,
      recommendation: `Publique conteúdo de alto valor no ${best.platform}`,
      created_at: new Date().toISOString(),
    })
  }

  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0)
  const avgER = metrics.reduce((s, m) => s + calcEngagementRate(m), 0) / metrics.length
  insights.push({
    id: `ins-sum-${Date.now() + 3}`,
    type: 'summary',
    title: `${metrics.length} posts rastreados — ${(avgER * 100).toFixed(1)}% taxa média de engajamento`,
    description: `Em ${metrics.length} posts você gerou ${totalImpressions.toLocaleString()} impressões totais. Sua taxa média de engajamento de ${(avgER * 100).toFixed(1)}% ${avgER > 0.03 ? 'está acima do benchmark de 3% do setor' : 'tem espaço para crescer em direção ao benchmark de 3%'}.`,
    metric: 'total_impressions',
    value: totalImpressions,
    recommendation: avgER < 0.03 ? 'Foque em CTAs mais fortes e ganchos mais envolventes' : 'Mantenha a qualidade do conteúdo — você está superando os benchmarks',
    created_at: new Date().toISOString(),
  })

  return insights
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}
