import Papa from 'papaparse'
import * as XLSX from 'xlsx'

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
  if (v.includes('artigo') || v.includes('article')) return 'artigo'
  if (v.includes('video')) return 'video'
  return v || ''
}

// Meses em português para parsing de "20 mar. 2025", "1 de março de 2026", etc.
const PT_MONTHS = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
  janeiro: '01', fevereiro: '02', março: '03', marco: '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08', setembro: '09',
  outubro: '10', novembro: '11', dezembro: '12',
}

// Converte serial do Google Sheets (ex: 46022) para data ISO
function sheetsSerialToDate(serial) {
  const num = Number(serial)
  if (!num || num < 1 || num > 100000) return ''
  // Sheets epoch: 30/12/1899. Ajuste do bug do Lotus 1-2-3 (dia 29/02/1900 fictício)
  const epoch = new Date(Date.UTC(1899, 11, 30))
  const ms = epoch.getTime() + num * 86400000
  const d = new Date(ms)
  return d.toISOString().split('T')[0]
}

export const normalizeDate = (raw = '') => {
  const s = String(raw).trim()
  if (!s) return ''

  // 1. ISO: 2026-03-01 ou 2026-03-01T16:52:00
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  // 2. Serial do Google Sheets (número puro como 46022)
  if (/^\d{4,6}$/.test(s) && Number(s) > 1000) {
    const converted = sheetsSerialToDate(s)
    if (converted) return converted
  }

  // 3. Português longo: "20 mar. 2025 16:52" ou "1 de março de 2026"
  const ptMatch = s.match(/(\d{1,2})\s+(?:de\s+)?(\w+)\.?\s+(?:de\s+)?(\d{4})/)
  if (ptMatch) {
    const monthKey = stripAccents(ptMatch[2].toLowerCase().replace('.', ''))
    const mm = PT_MONTHS[monthKey]
    if (mm) return `${ptMatch[3]}-${mm}-${ptMatch[1].padStart(2, '0')}`
  }

  // 4. DD/MM/YYYY ou MM/DD/YYYY (com /, - ou .)
  const slash = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
  if (slash) {
    const a = Number(slash[1]), b = Number(slash[2])
    // Se primeiro número > 12, é dia (DD/MM/YYYY)
    if (a > 12) return `${slash[3]}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
    // Se segundo número > 12, é dia (MM/DD/YYYY)
    if (b > 12) return `${slash[3]}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`
    // Ambíguo: assume DD/MM/YYYY (padrão brasileiro)
    return `${slash[3]}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
  }

  // 5. Fallback: new Date() com proteção UTC
  const d = new Date(s)
  if (!isNaN(d)) {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
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

/**
 * Parse a CSV or XLSX/XLS file and return rows as array of objects (header-keyed).
 * Returns a Promise that resolves to { data: object[] }.
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const name = (file.name || '').toLowerCase()
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')

    if (isExcel) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json(sheet, { defval: '' })
          resolve({ data })
        } catch (err) {
          reject(new Error('Erro ao ler arquivo Excel: ' + err.message))
        }
      }
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
      reader.readAsArrayBuffer(file)
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => resolve({ data }),
        error: (err) => reject(new Error('Erro ao ler CSV: ' + err.message)),
      })
    }
  })
}
