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

  // Format insights
  const byFormat = aggregateByFormat(posts, metrics)
  if (byFormat.length > 1) {
    const best = byFormat.sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate)[0]
    insights.push({
      id: `ins-fmt-${Date.now()}`,
      type: 'format',
      title: `${capitalize(best.format)} drives the highest engagement`,
      description: `Your ${best.format} posts average a ${(best.avg_engagement_rate * 100).toFixed(1)}% engagement rate — the best format in your mix. Consider doubling down on this format.`,
      metric: 'avg_engagement_rate',
      value: best.avg_engagement_rate,
      recommendation: `Create more ${best.format} content`,
      created_at: new Date().toISOString(),
    })
  }

  // Hook type insights
  const hookMap = {}
  metrics.forEach((m) => {
    const post = posts.find((p) => p.id === m.post_id)
    const idea = null // ideas not passed here but can be extended
    if (!post) return
    const e = enrichMetric(m)
    const hook = post.hook_type || 'unknown'
    if (!hookMap[hook]) hookMap[hook] = { hook, authority: 0, count: 0 }
    hookMap[hook].authority += e.authority_score
    hookMap[hook].count += 1
  })
  const hookEntries = Object.values(hookMap)
  if (hookEntries.length > 1) {
    const best = hookEntries.sort((a, b) => b.authority / b.count - a.authority / a.count)[0]
    insights.push({
      id: `ins-hook-${Date.now() + 1}`,
      type: 'hook',
      title: `"${capitalize(best.hook)}" hooks generate more shares & saves`,
      description: `Posts with a ${best.hook} hook earn an average authority score of ${(best.authority / best.count).toFixed(0)}, indicating strong resonance and shareability.`,
      metric: 'authority_score',
      value: best.authority / best.count,
      recommendation: `Open more posts with a ${best.hook} angle`,
      created_at: new Date().toISOString(),
    })
  }

  // Platform insights
  const byPlatform = aggregateByPlatform(posts, metrics)
  if (byPlatform.length > 1) {
    const best = byPlatform.sort((a, b) => b.impressions / b.count - a.impressions / a.count)[0]
    insights.push({
      id: `ins-plt-${Date.now() + 2}`,
      type: 'platform',
      title: `${capitalize(best.platform)} delivers the highest reach`,
      description: `Your ${best.platform} posts average ${Math.round(best.impressions / best.count).toLocaleString()} impressions per post — your highest-reach platform. Prioritize it for awareness-focused content.`,
      metric: 'avg_impressions',
      value: best.impressions / best.count,
      recommendation: `Post high-value awareness content on ${best.platform}`,
      created_at: new Date().toISOString(),
    })
  }

  // Volume insight
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0)
  const avgER = metrics.reduce((s, m) => s + calcEngagementRate(m), 0) / metrics.length
  insights.push({
    id: `ins-sum-${Date.now() + 3}`,
    type: 'summary',
    title: `${metrics.length} posts tracked — ${(avgER * 100).toFixed(1)}% avg engagement rate`,
    description: `Across ${metrics.length} posts you've generated ${totalImpressions.toLocaleString()} total impressions. Your average engagement rate of ${(avgER * 100).toFixed(1)}% ${avgER > 0.03 ? 'is above the 3% industry benchmark' : 'has room to grow toward the 3% benchmark'}.`,
    metric: 'total_impressions',
    value: totalImpressions,
    recommendation: avgER < 0.03 ? 'Focus on stronger CTAs and more engaging hooks' : 'Maintain your content quality — you\'re outperforming benchmarks',
    created_at: new Date().toISOString(),
  })

  return insights
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}
