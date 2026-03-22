import { useState, useMemo, useCallback } from 'react'
import {
  Upload, Instagram, Linkedin, Music2, BarChart2, TrendingUp,
  Calendar, Target, Flame, Share2, Bookmark, Eye, Users,
  ChevronDown, ChevronUp, FileText, AlertCircle, X, Check,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend, Cell,
} from 'recharts'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C', accept: '.csv' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2', accept: '.csv,.xlsx' },
  { id: 'tiktok', label: 'TikTok', icon: Music2, color: '#00f2ea', accept: '.csv' },
]

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_ORDER = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const SLOTS = { 'Madrugada': [0, 6], 'Manhã': [6, 12], 'Tarde': [12, 18], 'Noite': [18, 24] }

const THEME_COLORS = {
  'Carreira': '#c8a96e', 'IA/Tech': '#7c6fcd', 'Humor Corporativo': '#4ecca3',
  'Mulheres & Identidade': '#e06090', 'Publi/Parceria': '#aaa', 'Outro': '#888',
  'Educação': '#4ecca3', 'Negócios': '#c8a96e', 'Lifestyle': '#e06090',
  'Entretenimento': '#7c6fcd', 'Tendências': '#00f2ea',
}

function themeColor(t) { return THEME_COLORS[t] || '#888' }

// ── CSV PARSER ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
  text = text.replace(/^\ufeff/, '')
  const lines = []
  let current = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') { if (inQuotes && text[i + 1] === '"') { current += '"'; i++; continue }; inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) {
      if (lines.length === 0) { lines.push([current]); current = '' } else { lines[lines.length - 1].push(current); current = '' }
      continue
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      if (lines.length === 0) { lines.push([current]); current = '' }
      else { lines[lines.length - 1].push(current); current = ''; lines.push([]) }
      continue
    }
    current += ch
  }
  if (current || (lines.length > 0 && lines[lines.length - 1]?.length > 0)) {
    if (lines.length === 0) lines.push([current]); else lines[lines.length - 1].push(current)
  }
  while (lines.length > 0 && lines[lines.length - 1].length <= 1 && !lines[lines.length - 1][0]) lines.pop()
  const headers = lines[0].map(h => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].length < 2) continue
    const row = {}
    headers.forEach((h, j) => { row[h] = (lines[i][j] || '').trim() })
    rows.push(row)
  }
  return { headers, rows }
}

function num(v) { const n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n }

// ── THEME CLASSIFIER ───────────────────────────────────────────────────────────
function classifyTheme(desc) {
  if (!desc) return 'Outro'
  const d = desc.toLowerCase()
  if (/publi|samsung|galaxy|fiap|@fiapoficial|@samsungbrasil|#publi|patrocinado|sponsored/i.test(d)) return 'Publi/Parceria'
  if (/carreira|emprego|hiring|promoção|salário|salario|aumento|linkedin|vaga|currículo/i.test(d)) return 'Carreira'
  if (/#ai|intelig[eê]ncia artificial|prompt|gemini|chatgpt|#ia\b|openai|machine learning/i.test(d)) return 'IA/Tech'
  if (/corporativ|homeoffice|home office|reunião|reuniao|bulldog|escritório/i.test(d)) return 'Humor Corporativo'
  if (/mulher|negras?|feminina|8 de março|8 de marco|braids|empoderamento/i.test(d)) return 'Mulheres & Identidade'
  return 'Outro'
}

// ── PLATFORM PARSERS ───────────────────────────────────────────────────────────
function parseInstagram(rows) {
  const posts = []
  for (const row of rows) {
    const dateStr = row['Horário de publicação'] || row['Data']
    if (!dateStr) continue
    const m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
    if (!m) continue
    const dt = new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]), parseInt(m[4]), parseInt(m[5]))
    if (isNaN(dt.getTime())) continue

    const views = num(row['Visualizações'])
    const reach = num(row['Alcance'])
    const likes = num(row['Curtidas'])
    const shares = num(row['Compartilhamentos'])
    const comments = num(row['Comentários'])
    const saves = num(row['Salvamentos'])
    const tipo = (row['Tipo de post'] || '').toLowerCase()
    const format = tipo.includes('reel') ? 'Reel' : 'Carrossel'
    const desc = row['Descrição'] || ''
    const theme = classifyTheme(desc)
    const engagement = likes + shares + saves + comments
    const engPct = reach > 0 ? (engagement / reach) * 100 : 0

    posts.push({ date: dt, format, theme, desc: desc.slice(0, 120), views, reach, likes, shares, comments, saves, engagement, engPct, link: row['Link permanente'] || '' })
  }
  return posts
}

function parseLinkedIn(rows) {
  const posts = []
  for (const row of rows) {
    // LinkedIn exports vary, common columns
    const dateStr = row['Date'] || row['Data'] || row['Published date'] || row['Horário de publicação'] || ''
    let dt
    // Try multiple date formats
    const m1 = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
    const m2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (m1) dt = new Date(m1[1], m1[2] - 1, m1[3])
    else if (m2) dt = new Date(m2[3], m2[1] - 1, m2[2])
    else continue
    if (isNaN(dt.getTime())) continue

    const views = num(row['Impressions'] || row['Impressões'] || row['Views'] || row['Visualizações'] || 0)
    const reach = num(row['Unique impressions'] || row['Alcance'] || views)
    const likes = num(row['Likes'] || row['Reactions'] || row['Curtidas'] || row['Reações'] || 0)
    const shares = num(row['Shares'] || row['Reposts'] || row['Compartilhamentos'] || 0)
    const comments = num(row['Comments'] || row['Comentários'] || 0)
    const saves = num(row['Saves'] || row['Salvamentos'] || 0)
    const clicks = num(row['Clicks'] || row['Cliques'] || 0)
    const desc = row['Post text'] || row['Content'] || row['Descrição'] || row['Texto'] || ''
    const theme = classifyTheme(desc)
    const format = desc.length > 500 ? 'Artigo' : 'Post'
    const engagement = likes + shares + saves + comments + clicks
    const engPct = reach > 0 ? (engagement / reach) * 100 : 0

    posts.push({ date: dt, format, theme, desc: desc.slice(0, 120), views, reach, likes, shares, comments, saves, engagement, engPct, link: '' })
  }
  return posts
}

function parseTikTok(rows) {
  const posts = []
  for (const row of rows) {
    const dateStr = row['Date'] || row['Data'] || row['Post date'] || row['Video publish time'] || ''
    let dt
    const m1 = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
    const m2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (m1) dt = new Date(m1[1], m1[2] - 1, m1[3])
    else if (m2) dt = new Date(m2[3], m2[1] - 1, m2[2])
    else continue
    if (isNaN(dt.getTime())) continue

    const views = num(row['Video views'] || row['Views'] || row['Visualizações'] || row['Total views'] || 0)
    const reach = num(row['Reach'] || row['Alcance'] || views)
    const likes = num(row['Likes'] || row['Curtidas'] || 0)
    const shares = num(row['Shares'] || row['Compartilhamentos'] || 0)
    const comments = num(row['Comments'] || row['Comentários'] || 0)
    const saves = num(row['Saves'] || row['Favorites'] || row['Salvamentos'] || 0)
    const desc = row['Video description'] || row['Caption'] || row['Descrição'] || row['Content'] || ''
    const theme = classifyTheme(desc)
    const engagement = likes + shares + saves + comments
    const engPct = reach > 0 ? (engagement / reach) * 100 : 0

    posts.push({ date: dt, format: 'Vídeo', theme, desc: desc.slice(0, 120), views, reach, likes, shares, comments, saves, engagement, engPct, link: '' })
  }
  return posts
}

// ── ANALYSIS ENGINE ────────────────────────────────────────────────────────────
function avg(arr) { return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }

function analyze(posts) {
  const organic = posts.filter(p => p.views <= 50000)
  const removed = posts.length - organic.length

  const dates = organic.map(p => p.date).filter(Boolean)
  const minDate = dates.length ? new Date(Math.min(...dates)) : null
  const maxDate = dates.length ? new Date(Math.max(...dates)) : null
  const period = minDate && maxDate
    ? `${minDate.toLocaleDateString('pt-BR')} — ${maxDate.toLocaleDateString('pt-BR')}`
    : 'N/A'

  // By weekday
  const byWeekday = {}
  for (const wd of WEEKDAYS_ORDER) {
    const subset = organic.filter(p => WEEKDAYS[p.date.getDay()] === wd)
    byWeekday[wd] = { views: avg(subset.map(p => p.views)), reach: avg(subset.map(p => p.reach)), engPct: avg(subset.map(p => p.engPct)), saves: avg(subset.map(p => p.saves)), shares: avg(subset.map(p => p.shares)), n: subset.length }
  }

  // By theme
  const themes = [...new Set(organic.map(p => p.theme))]
  const byTheme = {}
  for (const th of themes) {
    const subset = organic.filter(p => p.theme === th)
    byTheme[th] = { views: avg(subset.map(p => p.views)), engPct: avg(subset.map(p => p.engPct)), saves: avg(subset.map(p => p.saves)), shares: avg(subset.map(p => p.shares)), n: subset.length }
  }

  // By format
  const formats = [...new Set(organic.map(p => p.format))]
  const byFormat = {}
  for (const fmt of formats) {
    const subset = organic.filter(p => p.format === fmt)
    byFormat[fmt] = { views: avg(subset.map(p => p.views)), reach: avg(subset.map(p => p.reach)), engPct: avg(subset.map(p => p.engPct)), saves: avg(subset.map(p => p.saves)), shares: avg(subset.map(p => p.shares)), n: subset.length }
  }

  // By time slot
  const bySlot = {}
  for (const [name, [lo, hi]] of Object.entries(SLOTS)) {
    const subset = organic.filter(p => p.date.getHours() >= lo && p.date.getHours() < hi)
    bySlot[name] = { views: avg(subset.map(p => p.views)), engPct: avg(subset.map(p => p.engPct)), n: subset.length }
  }

  // Records
  const bestEng = [...organic].sort((a, b) => b.engPct - a.engPct)[0]
  const bestSave = [...organic].sort((a, b) => b.saves - a.saves)[0]
  const bestViews = [...organic].sort((a, b) => b.views - a.views)[0]
  const top5 = [...organic].sort((a, b) => b.engagement - a.engagement).slice(0, 5)

  // Best day / slot
  const bestDay = WEEKDAYS_ORDER.reduce((a, b) => (byWeekday[a]?.engPct || 0) > (byWeekday[b]?.engPct || 0) ? a : b)
  const secondBestDay = WEEKDAYS_ORDER.filter(d => d !== bestDay).reduce((a, b) => (byWeekday[a]?.engPct || 0) > (byWeekday[b]?.engPct || 0) ? a : b)
  const bestSlot = Object.entries(bySlot).reduce((a, b) => a[1].engPct > b[1].engPct ? a : b)

  // Insights
  const bestThemeSaves = Object.entries(byTheme).filter(([k]) => k !== 'Publi/Parceria').sort((a, b) => b[1].saves - a[1].saves)[0]
  const bestThemeShares = Object.entries(byTheme).filter(([k]) => k !== 'Publi/Parceria').sort((a, b) => b[1].shares - a[1].shares)[0]

  const insights = [
    `${bestDay} é o dia com maior engajamento médio (${byWeekday[bestDay]?.engPct.toFixed(1)}%), seguido de ${secondBestDay} (${byWeekday[secondBestDay]?.engPct.toFixed(1)}%).`,
    `Posts no horário "${bestSlot[0]}" têm o melhor Eng% (${bestSlot[1].engPct.toFixed(1)}%). ${bestSlot[1].n} posts nessa faixa.`,
    bestThemeSaves ? `"${bestThemeSaves[0]}" lidera em saves (média ${bestThemeSaves[1].saves.toFixed(0)}) — conteúdo de referência.` : '',
    bestThemeShares ? `"${bestThemeShares[0]}" é o tema mais compartilhado (média ${bestThemeShares[1].shares.toFixed(0)} shares).` : '',
    formats.length > 1 ? `${formats.map(f => `${f}: Eng% ${byFormat[f]?.engPct.toFixed(1)}%`).join(' vs ')} — combine ambos na semana.` : '',
  ].filter(Boolean)

  return { organic, removed, period, byWeekday, byTheme, byFormat, bySlot, bestEng, bestSave, bestViews, top5, bestDay, secondBestDay, insights, formats }
}

// ── COMPONENTS ─────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, detail, sub, color }) {
  return (
    <div className="card p-5 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
      {detail && <p className="text-[10px] text-gray-400 line-clamp-2">{detail}</p>}
    </div>
  )
}

function fmtDate(dt) {
  if (!dt) return ''
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs text-gray-500">{p.name || 'Valor'}: <span className="font-bold" style={{ color: p.color }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span></p>
      ))}
    </div>
  )
}

// ── DASHBOARD VIEW ─────────────────────────────────────────────────────────────
function DashboardView({ data, platformId }) {
  const plat = PLATFORMS.find(p => p.id === platformId)
  const {
    organic, removed, period, byWeekday, byTheme, byFormat, bySlot,
    bestEng, bestSave, bestViews, top5, bestDay, secondBestDay, insights, formats,
  } = data

  const engDayData = WEEKDAYS_ORDER.map(d => ({
    day: d, value: +(byWeekday[d]?.engPct || 0).toFixed(1), isBest: d === bestDay,
  }))

  const savesDayData = WEEKDAYS_ORDER.map(d => ({
    day: d, value: +(byWeekday[d]?.saves || 0).toFixed(1), isBest: d === bestDay,
  }))

  const sharesThemeData = Object.entries(byTheme)
    .sort((a, b) => b[1].shares - a[1].shares)
    .map(([name, v]) => ({ name, value: +v.shares.toFixed(1), color: themeColor(name) }))

  const savesThemeData = Object.entries(byTheme)
    .sort((a, b) => b[1].saves - a[1].saves)
    .map(([name, v]) => ({ name, value: +v.saves.toFixed(1), color: themeColor(name) }))

  // Radar data
  const fmtKeys = Object.keys(byFormat)
  const radarData = ['Views', 'Eng%', 'Saves', 'Shares', 'Alcance'].map(dim => {
    const entry = { dim }
    const vals = fmtKeys.map(f => {
      if (dim === 'Views') return byFormat[f]?.views || 0
      if (dim === 'Eng%') return byFormat[f]?.engPct || 0
      if (dim === 'Saves') return byFormat[f]?.saves || 0
      if (dim === 'Shares') return byFormat[f]?.shares || 0
      return byFormat[f]?.reach || 0
    })
    const max = Math.max(...vals, 1)
    fmtKeys.forEach((f, i) => { entry[f] = Math.round(vals[i] / max * 100) })
    return entry
  })

  const RADAR_COLORS = ['#c8a96e', '#7c6fcd', '#4ecca3', '#e06090']

  // Calendar
  const calDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
  const themeRanking = Object.entries(byTheme).filter(([k]) => k !== 'Publi/Parceria' && k !== 'Outro').sort((a, b) => b[1].engPct - a[1].engPct)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Period + stats bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${plat.color}20` }}>
            <plat.icon size={18} style={{ color: plat.color }} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{plat.label} Performance</p>
            <p className="text-[11px] text-gray-400">{period} · {organic.length} posts orgânicos{removed > 0 ? ` (${removed} com boost removidos)` : ''}</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">Análise Estratégica</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={BarChart2} label="Posts Orgânicos" value={organic.length} sub={formats.map(f => `${byFormat[f]?.n || 0} ${f}`).join(' · ')} color="#c8a96e" />
        <KPICard icon={TrendingUp} label="Melhor Eng%" value={bestEng ? bestEng.engPct.toFixed(1) + '%' : 'N/A'} sub={bestEng ? `${fmtDate(bestEng.date)} · ${WEEKDAYS[bestEng.date.getDay()]}` : ''} detail={bestEng?.desc} color="#4ecca3" />
        <KPICard icon={Bookmark} label="Recorde Saves" value={bestSave?.saves || 0} sub={bestSave ? `${bestSave.format} · ${bestSave.theme}` : ''} detail={bestSave?.desc} color="#7c6fcd" />
        <KPICard icon={Eye} label="Viral Orgânico" value={bestViews ? bestViews.views.toLocaleString('pt-BR') + ' views' : 'N/A'} sub={bestViews?.format} detail={bestViews?.desc} color="#e06090" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-4">Eng% Médio por Dia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={engDayData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + '%'} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Eng%" radius={[6, 6, 0, 0]}>
                {engDayData.map((d, i) => <Cell key={i} fill={d.isBest ? '#c8a96e' : '#d4d4d4'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-4">Saves Médios por Dia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={savesDayData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Saves" radius={[6, 6, 0, 0]}>
                {savesDayData.map((d, i) => <Cell key={i} fill={d.isBest ? '#c8a96e' : '#d4d4d4'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-4">Shares por Tema</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sharesThemeData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Shares" radius={[0, 6, 6, 0]}>
                {sharesThemeData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-4">Saves por Tema</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={savesThemeData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Saves" radius={[0, 6, 6, 0]}>
                {savesThemeData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-4">Formato Comparativo</h3>
          {fmtKeys.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                {fmtKeys.map((f, i) => (
                  <Radar key={f} name={f} dataKey={f} stroke={RADAR_COLORS[i]} fill={RADAR_COLORS[i]} fillOpacity={0.15} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-xs text-gray-400">Apenas 1 formato detectado</div>
          )}
        </div>
      </div>

      {/* Insights + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-4">Top 5 Posts por Engajamento</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-400">Data</th>
                  <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-400">Tipo</th>
                  <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-400">Tema</th>
                  <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-400">Saves</th>
                  <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-400">Shares</th>
                  <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-400">Eng%</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                    <td className="py-2 px-2 text-gray-600">{fmtDate(p.date)}</td>
                    <td className="py-2 px-2 text-gray-600">{p.format}</td>
                    <td className="py-2 px-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: themeColor(p.theme) + '20', color: themeColor(p.theme) }}>
                        {p.theme}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-gray-700">{p.saves}</td>
                    <td className="py-2 px-2 text-right font-semibold text-gray-700">{p.shares}</td>
                    <td className="py-2 px-2 text-right font-bold text-orange-600">{p.engPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-4">Insights Estratégicos</h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-gray-600 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card p-5">
        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-4">Calendário Semanal Recomendado</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {calDays.map((day, i) => {
            const wd = byWeekday[day] || {}
            const isBest = day === bestDay
            const isSecond = day === secondBestDay
            const theme = themeRanking[i % Math.max(themeRanking.length, 1)]?.[0] || 'Carreira'
            const format = i % 2 === 0 ? (formats[0] || 'Carrossel') : (formats[1] || formats[0] || 'Reel')
            return (
              <div key={day} className={`rounded-xl border p-4 text-center space-y-2 ${isBest ? 'border-orange-300 bg-orange-50/60' : isSecond ? 'border-purple-200 bg-purple-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
                <p className={`text-lg font-extrabold ${isBest ? 'text-orange-600' : isSecond ? 'text-purple-600' : 'text-gray-700'}`}>{day}</p>
                <p className="text-[10px] text-gray-400">{format}</p>
                <p className="text-[11px] font-semibold" style={{ color: themeColor(theme) }}>{theme}</p>
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Eng% {wd.engPct?.toFixed(1) || '0'}%
                </span>
                <p className="text-[9px] text-gray-400">{wd.n || 0} posts no histórico</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function PerformanceReport() {
  const [reports, setReports] = useState({}) // { instagram: { posts, data }, linkedin: ..., tiktok: ... }
  const [activePlatform, setActivePlatform] = useState(null)
  const [uploading, setUploading] = useState(null) // platform id being uploaded
  const [error, setError] = useState(null)

  const handleFileUpload = useCallback(async (platformId, file) => {
    setUploading(platformId)
    setError(null)
    try {
      const text = await file.text()
      const { rows, headers } = parseCSV(text)
      if (rows.length === 0) throw new Error('Arquivo vazio ou formato não reconhecido')

      let posts
      if (platformId === 'instagram') posts = parseInstagram(rows)
      else if (platformId === 'linkedin') posts = parseLinkedIn(rows)
      else posts = parseTikTok(rows)

      if (posts.length === 0) throw new Error(`Nenhum post válido encontrado. Colunas detectadas: ${headers.slice(0, 5).join(', ')}...`)

      const data = analyze(posts)
      setReports(prev => ({ ...prev, [platformId]: { posts, data } }))
      setActivePlatform(platformId)
    } catch (e) {
      setError(e.message)
    }
    setUploading(null)
  }, [])

  const hasReports = Object.keys(reports).length > 0

  return (
    <div className="p-3 sm:p-6 space-y-5 animate-fade-in">
      {/* Upload section */}
      <div className={`${hasReports ? '' : 'max-w-3xl mx-auto pt-8'}`}>
        {!hasReports && (
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200/50">
              <BarChart2 size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Relatórios de Performance</h2>
            <p className="text-sm text-gray-400">Faça upload dos CSVs exportados do Meta Business Suite, LinkedIn ou TikTok</p>
          </div>
        )}

        <div className={`grid ${hasReports ? 'grid-cols-3 gap-3' : 'grid-cols-1 sm:grid-cols-3 gap-4'}`}>
          {PLATFORMS.map(plat => {
            const hasReport = !!reports[plat.id]
            const isUploading = uploading === plat.id
            return (
              <label
                key={plat.id}
                className={`card p-4 cursor-pointer transition-all hover:border-gray-300 relative ${
                  hasReport ? 'border-emerald-200 bg-emerald-50/30' : ''
                } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <input
                  type="file"
                  accept={plat.accept}
                  className="hidden"
                  onChange={(e) => { if (e.target.files[0]) handleFileUpload(plat.id, e.target.files[0]); e.target.value = '' }}
                />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${plat.color}15` }}>
                    <plat.icon size={18} style={{ color: plat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-800">{plat.label}</p>
                      {hasReport && <Check size={12} className="text-emerald-500" />}
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {hasReport ? `${reports[plat.id].data.organic.length} posts analisados` : isUploading ? 'Processando...' : 'Clique para upload CSV'}
                    </p>
                  </div>
                  <Upload size={14} className="text-gray-300 shrink-0" />
                </div>
              </label>
            )
          })}
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X size={12} className="text-red-400" /></button>
          </div>
        )}
      </div>

      {/* Platform tabs + dashboard */}
      {hasReports && (
        <>
          {Object.keys(reports).length > 1 && (
            <div className="flex gap-2">
              {Object.keys(reports).map(pid => {
                const plat = PLATFORMS.find(p => p.id === pid)
                return (
                  <button
                    key={pid}
                    onClick={() => setActivePlatform(pid)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                      activePlatform === pid ? 'bg-white text-gray-900 shadow-sm border-gray-200' : 'text-gray-500 hover:text-gray-700 border-transparent'
                    }`}
                  >
                    <plat.icon size={13} /> {plat.label}
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">{reports[pid].data.organic.length}</span>
                  </button>
                )
              })}
            </div>
          )}

          {activePlatform && reports[activePlatform] && (
            <DashboardView data={reports[activePlatform].data} platformId={activePlatform} />
          )}
        </>
      )}
    </div>
  )
}
