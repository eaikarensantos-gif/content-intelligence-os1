export const numberOrNull = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)

export function engagementRate(post) {
  const impressions = numberOrNull(post.impressions)
  const values = ['likes', 'comments', 'shares', 'saves'].map(key => numberOrNull(post[key]))
  return impressions > 0 && values.some(value => value !== null)
    ? values.reduce((sum, value) => sum + (value ?? 0), 0) / impressions * 100 : null
}

export function postingHeatmap(posts, metric = 'impressions') {
  const cells = Array.from({ length: 168 }, (_, index) => ({ day: Math.floor(index / 24), hour: index % 24, count: 0, total: 0, value: null }))
  let excluded = 0
  for (const post of posts) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(post.date || '') ? new Date(`${post.date}T12:00:00Z`) : null
    const time = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(post.publish_time || '')
    const value = metric === 'engagement_rate' ? engagementRate(post) : numberOrNull(post[metric])
    if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== post.date || !time || Number(time[1]) > 23 || value === null) { excluded++; continue }
    const cell = cells[((date.getUTCDay() + 6) % 7) * 24 + Number(time[1])]
    cell.count++; cell.total += value
  }
  cells.forEach(cell => { if (cell.count) cell.value = cell.total / cell.count })
  return { cells, excluded }
}

export function followerHistory(profile) {
  const rows = [...(profile.followerHistory || [])]
  if (profile.followersUpdatedAt && !rows.some(row => row.recordedAt === profile.followersUpdatedAt)) {
    rows.push({ recordedAt: profile.followersUpdatedAt, followers: profile.followersByPlatform || {} })
  }
  return rows.filter(row => Number.isFinite(new Date(row.recordedAt).getTime())).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

export function recordFollowers(profile, followers, recordedAt) {
  return { followersByPlatform: followers, followersUpdatedAt: recordedAt,
    followerHistory: [...followerHistory(profile), { recordedAt, followers: { ...followers } }] }
}

export function growthTimeline(profile, platform, from = '', to = '') {
  const byDay = new Map()
  for (const row of followerHistory(profile)) {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(row.recordedAt))
    const followers = numberOrNull(row.followers?.[platform])
    if (followers !== null && (!from || date >= from) && (!to || date <= to)) byDay.set(date, { date, followers })
  }
  return [...byDay.values()].map((row, index, rows) => ({ ...row, change: index ? row.followers - rows[index - 1].followers : null }))
}
