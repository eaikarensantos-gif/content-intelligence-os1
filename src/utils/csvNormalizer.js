const stripAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export const COL_MAP = {
  'post_id': 'post_id', 'post id': 'post_id',
  'data': 'date', 'date': 'date', 'publish time': 'date', 'horario de publicacao': 'date',
  'publish_time': 'date', 'data de publicacao': 'date', 'published at': 'date',
  'plataforma': 'platform', 'platform': 'platform',
  'post type': 'post_type', 'tipo de post': 'post_type', 'tipo': 'post_type', 'post_type': 'post_type',
  'description': 'description', 'descricao': 'description', 'legenda': 'description',
  'permalink': 'link', 'link permanente': 'link', 'link': 'link', 'url': 'link',
  'duracao (s)': 'duration_sec', 'duracao': 'duration_sec', 'duration': 'duration_sec', 'duration (s)': 'duration_sec',
  'visualizacoes': 'impressions', 'impressoes': 'impressions', 'impressions': 'impressions', 'views': 'impressions',
  'alcance': 'reach', 'reach': 'reach',
  'curtidas': 'likes', 'likes': 'likes',
  'coment.': 'comments', 'comentarios': 'comments', 'comments': 'comments', 'replies': 'comments', 'respostas': 'comments',
  'compart.': 'shares', 'compartilhamentos': 'shares', 'shares': 'shares',
  'seguimentos': 'follows', 'follows': 'follows', 'seguidores': 'follows',
  'salvam.': 'saves', 'salvamentos': 'saves', 'saves': 'saves',
  'cliques no link': 'link_clicks', 'link_clicks': 'link_clicks',
  'cliente': 'client', 'client': 'client', 'projeto': 'client', 'marca': 'client',
  'navegacao': 'navigation', 'visitas ao perfil': 'profile_visits', 'toques em figurinhas': 'sticker_taps',
  'comentario de dados': 'data_comment',
}

const toNum = (v = '') => Number(String(v).replace(/[^0-9]/g, '')) || 0

const normalizePostType = (raw = '') => {
  const v = raw.toLowerCase().trim()
  if (v.includes('story') || v.includes('storie')) return 'story'
  if (v.includes('reel')) return 'reel'
  if (v.includes('carousel') || v.includes('carrossel')) return 'carousel'
  if (v.includes('video')) return 'video'
  return v || ''
}

export const normalizeDate = (raw = '') => {
  const s = raw.trim()
  if (!s) return ''
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const slash = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (slash) {
    if (Number(slash[1]) > 12) return `${slash[3]}-${slash[2].padStart(2,'0')}-${slash[1].padStart(2,'0')}`
    return `${slash[3]}-${slash[1].padStart(2,'0')}-${slash[2].padStart(2,'0')}`
  }
  const d = new Date(s)
  if (!isNaN(d)) return d.toISOString().split('T')[0]
  return ''
}

export const normalizeRow = (raw) => {
  const row = {}
  for (const [key, val] of Object.entries(raw)) {
    const clean = stripAccents(key.toLowerCase().trim())
    const mapped = COL_MAP[clean] || COL_MAP[key.toLowerCase().trim()]
    if (!mapped) continue
    if (mapped === 'date' && row.date && !normalizeDate(val)) continue
    row[mapped] = val
  }
  return {
    post_id: row.post_id || '', platform: row.platform ? row.platform.toLowerCase() : 'instagram',
    date: normalizeDate(row.date || ''), impressions: toNum(row.impressions), reach: toNum(row.reach),
    likes: toNum(row.likes), comments: toNum(row.comments), shares: toNum(row.shares),
    saves: toNum(row.saves), follows: toNum(row.follows), link_clicks: toNum(row.link_clicks),
    duration_sec: toNum(row.duration_sec), description: (row.description || '').trim(),
    link: (row.link || '').trim(), post_type: normalizePostType(row.post_type),
    client: (row.client || '').trim(),
  }
}
