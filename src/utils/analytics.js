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
    map[fmt].impressions += m.impressions || 0
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
    if (!map[plt]) map[plt] = { platform: plt, impressions: 0, engagement: 0, engagement_rate_sum: 0, count: 0 }
    const e = enrichMetric(m)
    map[plt].impressions += m.impressions || 0
    map[plt].engagement += e.engagement
    map[plt].engagement_rate_sum += e.engagement_rate
    map[plt].count += 1
  })
  return Object.values(map).map((d) => ({
    ...d,
    avg_engagement_rate: d.count ? d.engagement_rate_sum / d.count : 0,
  }))
}

export function aggregateByTopic(posts, metrics) {
  const map = {}
  metrics.forEach((m) => {
    const post = posts.find((p) => p.id === m.post_id)
    if (!post || !post.topic) return
    const topic = post.topic
    if (!map[topic]) map[topic] = { topic, impressions: 0, reach: 0, engagement: 0, engagement_rate_sum: 0, count: 0 }
    const e = enrichMetric(m)
    map[topic].impressions += m.impressions || 0
    map[topic].reach += m.reach || 0
    map[topic].engagement += e.engagement
    map[topic].engagement_rate_sum += e.engagement_rate
    map[topic].count += 1
  })
  return Object.values(map).map((d) => ({
    ...d,
    avg_impressions: d.count ? d.impressions / d.count : 0,
    avg_reach: d.count ? d.reach / d.count : 0,
    avg_engagement_rate: d.count ? d.engagement_rate_sum / d.count : 0,
  }))
}

export function aggregateByDayOfWeek(metrics) {
  const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const map = {}
  metrics.forEach((m) => {
    if (!m.date) return
    const dayIdx = new Date(m.date + 'T12:00:00').getDay()
    const day = DAY_NAMES[dayIdx]
    if (!map[day]) map[day] = { day, dayIdx, impressions: 0, engagement: 0, engagement_rate_sum: 0, count: 0 }
    const e = enrichMetric(m)
    map[day].impressions += m.impressions || 0
    map[day].engagement += e.engagement
    map[day].engagement_rate_sum += e.engagement_rate
    map[day].count += 1
  })
  return Object.values(map)
    .map((d) => ({
      ...d,
      avg_impressions: d.count ? d.impressions / d.count : 0,
      avg_engagement_rate: d.count ? d.engagement_rate_sum / d.count : 0,
    }))
    .sort((a, b) => a.dayIdx - b.dayIdx)
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

// Returns true if bestValue is at least 20% above the average of all values
function isMeaningful(bestValue, allValues) {
  if (allValues.length < 2) return false
  const avg = allValues.reduce((s, v) => s + v, 0) / allValues.length
  return avg > 0 && bestValue > avg * 1.2
}

function pctAboveAvg(value, allValues) {
  const avg = allValues.reduce((s, v) => s + v, 0) / allValues.length
  return avg > 0 ? Math.round((value / avg - 1) * 100) : 0
}

export function generateInsights(posts, metrics) {
  if (metrics.length < 2) return []
  const insights = []
  const ts = Date.now()

  // ── 1. PLATFORM ──────────────────────────────────────────
  const byPlatform = aggregateByPlatform(posts, metrics)
  if (byPlatform.length > 1) {
    const erValues = byPlatform.map((p) => p.avg_engagement_rate)
    const reachValues = byPlatform.map((p) => p.count ? p.impressions / p.count : 0)
    const bestER = [...byPlatform].sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate)[0]
    const bestReach = [...byPlatform].sort((a, b) => b.impressions / b.count - a.impressions / a.count)[0]

    if (isMeaningful(bestER.avg_engagement_rate, erValues)) {
      const pct = pctAboveAvg(bestER.avg_engagement_rate, erValues)
      insights.push({
        id: `ins-plt-er-${ts}`,
        type: 'platform',
        title: `${capitalize(bestER.platform)} tem o maior engajamento`,
        description: `Seus posts no ${capitalize(bestER.platform)} geram ${(bestER.avg_engagement_rate * 100).toFixed(1)}% de taxa de engajamento em média — ${pct}% acima da média das suas plataformas. Sua audiência aqui é mais qualificada e receptiva.`,
        metric: 'avg_engagement_rate',
        value: bestER.avg_engagement_rate,
        recommendation: `Priorize conteúdos de maior valor e CTAs no ${capitalize(bestER.platform)} para aproveitar o alto engajamento`,
        created_at: new Date().toISOString(),
      })
    }

    if (bestReach.platform !== bestER.platform && isMeaningful(bestReach.impressions / bestReach.count, reachValues)) {
      insights.push({
        id: `ins-plt-reach-${ts + 1}`,
        type: 'platform',
        title: `${capitalize(bestReach.platform)} entrega o maior alcance`,
        description: `Com média de ${Math.round(bestReach.impressions / bestReach.count).toLocaleString()} impressões por post, o ${capitalize(bestReach.platform)} é sua plataforma de maior alcance. Use-a estrategicamente para conteúdo de topo de funil.`,
        metric: 'avg_impressions',
        value: bestReach.impressions / bestReach.count,
        recommendation: `Use o ${capitalize(bestReach.platform)} para conteúdo de awareness e ampliação de audiência`,
        created_at: new Date().toISOString(),
      })
    }

    if (!isMeaningful(bestER.avg_engagement_rate, erValues) && !isMeaningful(bestReach.impressions / bestReach.count, reachValues)) {
      // Still generate a basic platform insight
      insights.push({
        id: `ins-plt-basic-${ts}`,
        type: 'platform',
        title: `${capitalize(bestER.platform)} lidera em engajamento`,
        description: `Entre suas plataformas, ${capitalize(bestER.platform)} tem a maior taxa de engajamento (${(bestER.avg_engagement_rate * 100).toFixed(1)}%). Com mais dados, será possível identificar diferenças estatísticas mais significativas.`,
        metric: 'avg_engagement_rate',
        value: bestER.avg_engagement_rate,
        recommendation: `Continue registrando métricas para comparações mais precisas entre plataformas`,
        created_at: new Date().toISOString(),
      })
    }
  }

  // ── 2. FORMAT ────────────────────────────────────────────
  const byFormat = aggregateByFormat(posts, metrics)
  if (byFormat.length > 1) {
    const sorted = [...byFormat].sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate)
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]
    const erValues = byFormat.map((f) => f.avg_engagement_rate)
    const avgER = erValues.reduce((s, v) => s + v, 0) / erValues.length

    if (isMeaningful(best.avg_engagement_rate, erValues)) {
      const pct = pctAboveAvg(best.avg_engagement_rate, erValues)
      insights.push({
        id: `ins-fmt-best-${ts + 2}`,
        type: 'format',
        title: `${capitalize(best.format)} é seu formato de maior engajamento`,
        description: `Posts em ${capitalize(best.format)} têm ${(best.avg_engagement_rate * 100).toFixed(1)}% de taxa de engajamento — ${pct}% acima da média dos seus formatos. Esse formato ressoa mais com sua audiência.`,
        metric: 'avg_engagement_rate',
        value: best.avg_engagement_rate,
        recommendation: `Invista mais em ${capitalize(best.format)}s — eles geram mais interação por post publicado`,
        created_at: new Date().toISOString(),
      })
    } else {
      insights.push({
        id: `ins-fmt-best-${ts + 2}`,
        type: 'format',
        title: `${capitalize(best.format)} lidera em engajamento`,
        description: `Entre seus formatos, ${capitalize(best.format)} tem a maior taxa de engajamento (${(best.avg_engagement_rate * 100).toFixed(1)}%). Adicione mais posts para confirmar essa tendência.`,
        metric: 'avg_engagement_rate',
        value: best.avg_engagement_rate,
        recommendation: `Monitore o desempenho dos formatos com mais publicações para comparações mais confiáveis`,
        created_at: new Date().toISOString(),
      })
    }

    if (byFormat.length >= 3 && worst.avg_engagement_rate < avgER * 0.7) {
      insights.push({
        id: `ins-fmt-worst-${ts + 3}`,
        type: 'format',
        title: `${capitalize(worst.format)} está abaixo da média`,
        description: `Posts em ${capitalize(worst.format)} geram apenas ${(worst.avg_engagement_rate * 100).toFixed(1)}% de engajamento — significativamente abaixo dos outros formatos. Considere revisar a estratégia ou reduzir a frequência.`,
        metric: 'avg_engagement_rate',
        value: worst.avg_engagement_rate,
        recommendation: `Revise a abordagem dos seus ${capitalize(worst.format)}s ou redirecione esforços para formatos mais eficientes`,
        created_at: new Date().toISOString(),
      })
    }
  }

  // ── 3. HOOK TYPE ─────────────────────────────────────────
  const hookMap = {}
  metrics.forEach((m) => {
    const post = posts.find((p) => p.id === m.post_id)
    if (!post || !post.hook_type) return
    const e = enrichMetric(m)
    const hook = post.hook_type
    if (!hookMap[hook]) hookMap[hook] = { hook, authority: 0, engagement: 0, engagement_rate_sum: 0, count: 0 }
    hookMap[hook].authority += e.authority_score
    hookMap[hook].engagement += e.engagement
    hookMap[hook].engagement_rate_sum += e.engagement_rate
    hookMap[hook].count += 1
  })
  const hookEntries = Object.values(hookMap).filter((h) => h.count > 0)
  if (hookEntries.length > 1) {
    const authValues = hookEntries.map((h) => h.authority / h.count)
    const erValues = hookEntries.map((h) => h.engagement_rate_sum / h.count)
    const bestAuth = [...hookEntries].sort((a, b) => b.authority / b.count - a.authority / a.count)[0]
    const bestER = [...hookEntries].sort((a, b) => b.engagement_rate_sum / b.count - a.engagement_rate_sum / a.count)[0]

    if (isMeaningful(bestAuth.authority / bestAuth.count, authValues)) {
      insights.push({
        id: `ins-hook-auth-${ts + 4}`,
        type: 'hook',
        title: `Gancho "${capitalize(bestAuth.hook)}" gera mais compartilhamentos e salvamentos`,
        description: `Posts com gancho "${bestAuth.hook}" têm autoridade média de ${(bestAuth.authority / bestAuth.count).toFixed(1)} (shares + saves) — indicando que esse tipo de abertura cria conteúdo que as pessoas querem guardar e repassar.`,
        metric: 'authority_score',
        value: bestAuth.authority / bestAuth.count,
        recommendation: `Use o gancho "${bestAuth.hook}" em posts que você quer que virem referência ou sejam salvos pela audiência`,
        created_at: new Date().toISOString(),
      })
    }

    if (bestER.hook !== bestAuth.hook && isMeaningful(bestER.engagement_rate_sum / bestER.count, erValues)) {
      insights.push({
        id: `ins-hook-er-${ts + 5}`,
        type: 'hook',
        title: `Gancho "${capitalize(bestER.hook)}" gera mais engajamento`,
        description: `O gancho "${bestER.hook}" produz ${((bestER.engagement_rate_sum / bestER.count) * 100).toFixed(1)}% de taxa de engajamento médio — o melhor entre todos os tipos de gancho analisados.`,
        metric: 'avg_engagement_rate',
        value: bestER.engagement_rate_sum / bestER.count,
        recommendation: `Abra mais posts com o ângulo "${bestER.hook}" para maximizar curtidas, comentários e interações`,
        created_at: new Date().toISOString(),
      })
    }

    if (!isMeaningful(bestAuth.authority / bestAuth.count, authValues) && hookEntries.length >= 2) {
      insights.push({
        id: `ins-hook-basic-${ts + 4}`,
        type: 'hook',
        title: `Gancho "${capitalize(bestER.hook)}" lidera em engajamento`,
        description: `Entre os tipos de gancho registrados, "${bestER.hook}" tem o melhor desempenho com ${((bestER.engagement_rate_sum / bestER.count) * 100).toFixed(1)}% de engajamento médio.`,
        metric: 'avg_engagement_rate',
        value: bestER.engagement_rate_sum / bestER.count,
        recommendation: `Continue testando diferentes ganchos para identificar padrões mais significativos`,
        created_at: new Date().toISOString(),
      })
    }
  }

  // ── 4. TOPIC ─────────────────────────────────────────────
  const byTopic = aggregateByTopic(posts, metrics)
  if (byTopic.length > 1) {
    const reachVals = byTopic.map((t) => t.avg_impressions)
    const erVals = byTopic.map((t) => t.avg_engagement_rate)
    const bestReach = [...byTopic].sort((a, b) => b.avg_impressions - a.avg_impressions)[0]
    const bestER = [...byTopic].sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate)[0]

    if (isMeaningful(bestReach.avg_impressions, reachVals)) {
      const pct = pctAboveAvg(bestReach.avg_impressions, reachVals)
      insights.push({
        id: `ins-topic-reach-${ts + 6}`,
        type: 'topic',
        title: `Tópico "${capitalize(bestReach.topic)}" atinge o maior alcance`,
        description: `Conteúdos sobre "${bestReach.topic}" geram média de ${Math.round(bestReach.avg_impressions).toLocaleString()} impressões por post — ${pct}% acima da média dos tópicos. Isso indica forte demanda e descoberta orgânica nesse assunto.`,
        metric: 'avg_impressions',
        value: bestReach.avg_impressions,
        recommendation: `Crie mais conteúdo sobre "${bestReach.topic}" para ampliar o alcance orgânico`,
        created_at: new Date().toISOString(),
      })
    }

    if (bestER.topic !== bestReach.topic && isMeaningful(bestER.avg_engagement_rate, erVals)) {
      insights.push({
        id: `ins-topic-er-${ts + 7}`,
        type: 'topic',
        title: `Tópico "${capitalize(bestER.topic)}" engaja mais`,
        description: `Posts sobre "${bestER.topic}" têm ${(bestER.avg_engagement_rate * 100).toFixed(1)}% de taxa de engajamento médio — sua audiência claramente se identifica com esse tema.`,
        metric: 'avg_engagement_rate',
        value: bestER.avg_engagement_rate,
        recommendation: `Aprofunde conteúdos sobre "${bestER.topic}" — é onde há maior identificação da audiência`,
        created_at: new Date().toISOString(),
      })
    }

    if (!isMeaningful(bestReach.avg_impressions, reachVals)) {
      insights.push({
        id: `ins-topic-basic-${ts + 6}`,
        type: 'topic',
        title: `"${capitalize(bestReach.topic)}" lidera em alcance`,
        description: `Entre os tópicos registrados, "${bestReach.topic}" tem a maior média de impressões (${Math.round(bestReach.avg_impressions).toLocaleString()} por post). Adicione mais posts por tópico para comparações mais precisas.`,
        metric: 'avg_impressions',
        value: bestReach.avg_impressions,
        recommendation: `Registre mais posts por tópico para obter insights estatisticamente confiáveis sobre temas`,
        created_at: new Date().toISOString(),
      })
    }
  }

  // ── 5. POSTING TIME (day of week) ─────────────────────────
  const byDay = aggregateByDayOfWeek(metrics)
  if (byDay.length > 1) {
    const erVals = byDay.map((d) => d.avg_engagement_rate)
    const reachVals = byDay.map((d) => d.avg_impressions)
    const bestERDay = [...byDay].sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate)[0]
    const bestReachDay = [...byDay].sort((a, b) => b.avg_impressions - a.avg_impressions)[0]

    if (isMeaningful(bestERDay.avg_engagement_rate, erVals)) {
      const pct = pctAboveAvg(bestERDay.avg_engagement_rate, erVals)
      const top2Days = [...byDay]
        .sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate)
        .slice(0, 2)
        .map((d) => d.day)
        .join(' e ')
      insights.push({
        id: `ins-time-er-${ts + 8}`,
        type: 'time',
        title: `${bestERDay.day} é o melhor dia para engajamento`,
        description: `Posts publicados na ${bestERDay.day} têm ${(bestERDay.avg_engagement_rate * 100).toFixed(1)}% de engajamento médio — ${pct}% acima da média. Os melhores dias são ${top2Days}.`,
        metric: 'avg_engagement_rate',
        value: bestERDay.avg_engagement_rate,
        recommendation: `Publique conteúdos mais importantes na ${bestERDay.day} para maximizar engajamento`,
        created_at: new Date().toISOString(),
      })
    }

    if (bestReachDay.day !== bestERDay.day && isMeaningful(bestReachDay.avg_impressions, reachVals)) {
      const pct = pctAboveAvg(bestReachDay.avg_impressions, reachVals)
      insights.push({
        id: `ins-time-reach-${ts + 9}`,
        type: 'time',
        title: `${bestReachDay.day} entrega mais alcance`,
        description: `${bestReachDay.day} gera média de ${Math.round(bestReachDay.avg_impressions).toLocaleString()} impressões por post — ${pct}% acima da média dos dias. Use para conteúdo de crescimento de audiência.`,
        metric: 'avg_impressions',
        value: bestReachDay.avg_impressions,
        recommendation: `Publique conteúdo de awareness e crescimento na ${bestReachDay.day}`,
        created_at: new Date().toISOString(),
      })
    }

    if (!isMeaningful(bestERDay.avg_engagement_rate, erVals)) {
      insights.push({
        id: `ins-time-basic-${ts + 8}`,
        type: 'time',
        title: `${bestERDay.day} tem os melhores resultados até agora`,
        description: `Entre os dias com dados, ${bestERDay.day} apresenta o maior engajamento médio (${(bestERDay.avg_engagement_rate * 100).toFixed(1)}%). Com mais publicações distribuídas nos dias da semana, os padrões ficarão mais claros.`,
        metric: 'avg_engagement_rate',
        value: bestERDay.avg_engagement_rate,
        recommendation: `Continue publicando regularmente para identificar os melhores dias com precisão`,
        created_at: new Date().toISOString(),
      })
    }
  }

  // ── 6. SUMMARY + TREND ────────────────────────────────────
  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions || 0), 0)
  const avgER = metrics.reduce((s, m) => s + calcEngagementRate(m), 0) / metrics.length

  let trend = null
  if (metrics.length >= 4) {
    const sorted = [...metrics].sort((a, b) => new Date(a.date) - new Date(b.date))
    const half = Math.floor(sorted.length / 2)
    const avgFirst = sorted.slice(0, half).reduce((s, m) => s + calcEngagementRate(m), 0) / half
    const avgSecond = sorted.slice(half).reduce((s, m) => s + calcEngagementRate(m), 0) / (sorted.length - half)
    trend = avgSecond > avgFirst * 1.1 ? 'crescendo' : avgSecond < avgFirst * 0.9 ? 'caindo' : 'estável'
  }

  const trendEmoji = trend === 'crescendo' ? '📈' : trend === 'caindo' ? '📉' : trend === 'estável' ? '→' : ''
  const trendText = trend ? ` Seu engajamento está ${trendEmoji} ${trend} comparando a primeira e segunda metade do período.` : ''

  insights.push({
    id: `ins-sum-${ts + 10}`,
    type: 'summary',
    title: `${metrics.length} posts analisados — ${(avgER * 100).toFixed(1)}% de engajamento médio`,
    description: `Você gerou ${totalImpressions.toLocaleString()} impressões totais em ${metrics.length} posts.${trendText} ${avgER > 0.03 ? 'Você está acima do benchmark de 3% do setor — excelente trabalho.' : 'Há espaço para crescer em direção ao benchmark de 3% do setor.'}`,
    metric: 'total_impressions',
    value: totalImpressions,
    recommendation:
      avgER < 0.03
        ? 'Foque em CTAs mais fortes, ganchos envolventes e publique nos melhores dias identificados acima'
        : trend === 'caindo'
        ? 'Seu engajamento está em queda — revise os formatos e ganchos mais eficientes indicados nos insights acima'
        : 'Mantenha a cadência — você está performando acima dos benchmarks do setor',
    created_at: new Date().toISOString(),
  })

  return insights
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}
