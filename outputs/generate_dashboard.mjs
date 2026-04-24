import { readFileSync, writeFileSync } from 'fs'

// ── PARSE CSV ──────────────────────────────────────────────────────────────────
function parseCSV(text) {
  // Remove BOM
  text = text.replace(/^\ufeff/, '')
  const lines = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; continue }
      inQuotes = !inQuotes; continue
    }
    if (ch === ',' && !inQuotes) { lines.length === 0 ? (lines.push([current]), current = '') : (lines[lines.length - 1].push(current), current = ''); continue }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      if (lines.length === 0) { lines.push([current]); current = '' }
      else { lines[lines.length - 1].push(current); current = ''; lines.push([]) }
      continue
    }
    current += ch
  }
  if (current || (lines.length > 0 && lines[lines.length - 1].length > 0)) {
    if (lines.length === 0) lines.push([current])
    else lines[lines.length - 1].push(current)
  }
  // Remove empty trailing rows
  while (lines.length > 0 && lines[lines.length - 1].length <= 1 && lines[lines.length - 1][0] === '') lines.pop()

  const headers = lines[0].map(h => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].length < 2) continue
    const row = {}
    headers.forEach((h, j) => { row[h] = (lines[i][j] || '').trim() })
    rows.push(row)
  }
  return rows
}

function num(v) { const n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n }

// ── READ FILES ─────────────────────────────────────────────────────────────────
const reelsRaw = readFileSync('C:/Users/DELL/Downloads/Mar-21-2025_Mar-20-2026_1447617203471819.csv', 'utf-8')
const storiesRaw = readFileSync('C:/Users/DELL/Downloads/Mar-21-2025_Mar-20-2026_943518261384170.csv', 'utf-8')

const reelsData = parseCSV(reelsRaw)
const storiesData = parseCSV(storiesRaw)

console.log(`Reels/Carrosséis CSV: ${reelsData.length} rows, headers: ${Object.keys(reelsData[0] || {}).join(', ')}`)
console.log(`Stories CSV: ${storiesData.length} rows, headers: ${Object.keys(storiesData[0] || {}).join(', ')}`)

// ── THEME CLASSIFICATION ───────────────────────────────────────────────────────
function classifyTheme(desc) {
  if (!desc) return 'Outro'
  const d = desc.toLowerCase()
  if (/publi|samsung|galaxy|fiap|@fiapoficial|@samsungbrasil|#publi/i.test(d)) return 'Publi/Parceria'
  if (/carreira|emprego|hiring|promoção|promoção|salário|salario|aumento|linkedin/i.test(d)) return 'Carreira'
  if (/#ai|intelig[eê]ncia artificial|prompt|gemini|chatgpt|#ia\b/i.test(d)) return 'IA/Tech'
  if (/corporativ|homeoffice|home office|reunião|reuniao|bulldog/i.test(d)) return 'Humor Corporativo'
  if (/mulher|negras?|feminina|8 de março|8 de marco|braids/i.test(d)) return 'Mulheres & Identidade'
  return 'Outro'
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAYS_ORDER = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// ── PROCESS REELS/CAROUSELS ────────────────────────────────────────────────────
const posts = []
let minDate = null, maxDate = null

for (const row of reelsData) {
  const dateStr = row['Horário de publicação'] || row['Data']
  if (!dateStr) continue
  // MM/DD/YYYY HH:MM
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
  const follows = num(row['Seguimentos'])

  const tipo = (row['Tipo de post'] || '').toLowerCase()
  const format = tipo.includes('reel') ? 'Reel' : 'Carrossel'
  const desc = row['Descrição'] || row['Descriçao'] || ''
  const theme = classifyTheme(desc)
  const engagement = likes + shares + saves + comments
  const engPct = reach > 0 ? (engagement / reach) * 100 : 0

  if (!minDate || dt < minDate) minDate = dt
  if (!maxDate || dt > maxDate) maxDate = dt

  posts.push({
    date: dt,
    dateStr: `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`,
    weekday: WEEKDAYS[dt.getDay()],
    weekdayIdx: dt.getDay() === 0 ? 6 : dt.getDay() - 1, // 0=Seg, 6=Dom
    hour: dt.getHours(),
    format,
    theme,
    desc: desc.slice(0, 120),
    views, reach, likes, shares, comments, saves, follows,
    engagement, engPct,
    link: row['Link permanente'] || '',
  })
}

console.log(`Total posts parsed: ${posts.length}`)

// ── FILTER OUTLIERS ────────────────────────────────────────────────────────────
const organic = posts.filter(p => p.views <= 50000)
console.log(`Organic posts (views <= 50k): ${organic.length}, removed: ${posts.length - organic.length}`)

// ── ANALYSIS ───────────────────────────────────────────────────────────────────
function avg(arr) { return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 }

// By weekday
const byWeekday = {}
for (const wd of WEEKDAYS_ORDER) {
  const subset = organic.filter(p => p.weekday === wd)
  byWeekday[wd] = {
    views: avg(subset.map(p => p.views)),
    reach: avg(subset.map(p => p.reach)),
    engPct: avg(subset.map(p => p.engPct)),
    saves: avg(subset.map(p => p.saves)),
    shares: avg(subset.map(p => p.shares)),
    n: subset.length,
  }
}

// By theme
const themes = [...new Set(organic.map(p => p.theme))]
const byTheme = {}
for (const th of themes) {
  const subset = organic.filter(p => p.theme === th)
  byTheme[th] = {
    views: avg(subset.map(p => p.views)),
    engPct: avg(subset.map(p => p.engPct)),
    saves: avg(subset.map(p => p.saves)),
    shares: avg(subset.map(p => p.shares)),
    n: subset.length,
  }
}

// By format
const byFormat = {}
for (const fmt of ['Reel', 'Carrossel']) {
  const subset = organic.filter(p => p.format === fmt)
  byFormat[fmt] = {
    views: avg(subset.map(p => p.views)),
    reach: avg(subset.map(p => p.reach)),
    engPct: avg(subset.map(p => p.engPct)),
    saves: avg(subset.map(p => p.saves)),
    shares: avg(subset.map(p => p.shares)),
    n: subset.length,
  }
}

// By time slot
const SLOTS = { 'Madrugada (0-6h)': [0, 6], 'Manhã (6-12h)': [6, 12], 'Tarde (12-18h)': [12, 18], 'Noite (18-24h)': [18, 24] }
const bySlot = {}
for (const [name, [lo, hi]] of Object.entries(SLOTS)) {
  const subset = organic.filter(p => p.hour >= lo && p.hour < hi)
  bySlot[name] = { views: avg(subset.map(p => p.views)), engPct: avg(subset.map(p => p.engPct)), n: subset.length }
}

// Top 5 saves, top 5 shares
const topSaves = [...organic].sort((a, b) => b.saves - a.saves).slice(0, 5)
const topShares = [...organic].sort((a, b) => b.shares - a.shares).slice(0, 5)

// Best post by eng%
const bestEng = [...organic].sort((a, b) => b.engPct - a.engPct)[0]
const bestSave = [...organic].sort((a, b) => b.saves - a.saves)[0]
const bestViews = [...organic].sort((a, b) => b.views - a.views)[0]

// Combined top 5 for table (by engagement)
const top5 = [...organic].sort((a, b) => b.engagement - a.engagement).slice(0, 5)

// Period string
const period = minDate && maxDate
  ? `${minDate.toLocaleDateString('pt-BR')} — ${maxDate.toLocaleDateString('pt-BR')}`
  : 'N/A'

console.log(`Period: ${period}`)
console.log(`Best Eng%: ${bestEng?.engPct.toFixed(1)}% on ${bestEng?.dateStr}`)

// ── INSIGHTS ───────────────────────────────────────────────────────────────────
const bestDay = WEEKDAYS_ORDER.reduce((a, b) => byWeekday[a].engPct > byWeekday[b].engPct ? a : b)
const secondBestDay = WEEKDAYS_ORDER.filter(d => d !== bestDay).reduce((a, b) => byWeekday[a].engPct > byWeekday[b].engPct ? a : b)
const bestSlot = Object.entries(bySlot).reduce((a, b) => a[1].engPct > b[1].engPct ? a : b)[0]
const bestThemeSaves = Object.entries(byTheme).filter(([k]) => k !== 'Publi/Parceria').reduce((a, b) => a[1].saves > b[1].saves ? a : b)
const bestThemeShares = Object.entries(byTheme).filter(([k]) => k !== 'Publi/Parceria').reduce((a, b) => a[1].shares > b[1].shares ? a : b)
const bestFormat = byFormat.Reel.engPct > byFormat.Carrossel.engPct ? 'Reels' : 'Carrosséis'
const worstFormat = bestFormat === 'Reels' ? 'Carrosséis' : 'Reels'

const insights = [
  `📅 ${bestDay} é o dia com maior engajamento médio (${byWeekday[bestDay].engPct.toFixed(1)}%), seguido de ${secondBestDay} (${byWeekday[secondBestDay].engPct.toFixed(1)}%). Concentre posts estratégicos nesses dias.`,
  `🕐 Posts publicados no horário "${bestSlot}" têm o melhor Eng% médio (${bySlot[bestSlot].engPct.toFixed(1)}%). ${bySlot[bestSlot].n} dos ${organic.length} posts foram nessa faixa.`,
  `💾 O tema "${bestThemeSaves[0]}" lidera em salvamentos (média de ${bestThemeSaves[1].saves.toFixed(0)} saves), indicando conteúdo de referência — invista em carrosséis educativos nesse tema.`,
  `🔄 "${bestThemeShares[0]}" é o tema mais compartilhado (média de ${bestThemeShares[1].shares.toFixed(0)} shares), sugerindo alto potencial de viralização orgânica.`,
  `🎬 ${bestFormat} superam ${worstFormat} em engajamento (${bestFormat === 'Reels' ? byFormat.Reel.engPct.toFixed(1) : byFormat.Carrossel.engPct.toFixed(1)}% vs ${bestFormat === 'Reels' ? byFormat.Carrossel.engPct.toFixed(1) : byFormat.Reel.engPct.toFixed(1)}%), mas ${worstFormat} geram mais saves (${bestFormat === 'Reels' ? byFormat.Carrossel.saves.toFixed(0) : byFormat.Reel.saves.toFixed(0)} vs ${bestFormat === 'Reels' ? byFormat.Reel.saves.toFixed(0) : byFormat.Carrossel.saves.toFixed(0)}) — combine ambos na semana.`,
]

// ── CALENDAR RECOMMENDATIONS ───────────────────────────────────────────────────
const calDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
const themeRanking = Object.entries(byTheme)
  .filter(([k]) => k !== 'Publi/Parceria' && k !== 'Outro')
  .sort((a, b) => b[1].engPct - a[1].engPct)

const calendar = calDays.map((day, i) => {
  const data = byWeekday[day]
  const isBest = day === bestDay
  const isSecond = day === secondBestDay
  // Alternate formats and assign themes
  const format = i % 2 === 0 ? 'Carrossel' : 'Reel'
  const theme = themeRanking[i % themeRanking.length]?.[0] || 'Carreira'
  const metric = isBest ? `Eng% ${data.engPct.toFixed(1)}%` :
    isSecond ? `Eng% ${data.engPct.toFixed(1)}%` :
    `${data.saves.toFixed(0)} saves avg`
  const reason = isBest ? 'Melhor dia para engajamento nos dados' :
    isSecond ? 'Segundo melhor engajamento — dia forte' :
    i === 0 ? `${data.n} posts históricos, boa consistência` :
    i === 4 ? 'Fecha a semana com conteúdo leve' :
    `${data.n} posts no histórico`

  return { day, format, theme, metric, reason, isBest, isSecond, data }
})

// ── GENERATE HTML ──────────────────────────────────────────────────────────────
const THEME_COLORS = {
  'Carreira': '#c8a96e',
  'IA/Tech': '#7c6fcd',
  'Humor Corporativo': '#4ecca3',
  'Mulheres & Identidade': '#e06090',
  'Publi/Parceria': '#aaa',
  'Outro': '#666',
}

function themeColor(t) { return THEME_COLORS[t] || '#666' }

// Normalize radar data 0-100
function normalizeRadar(reelVal, carVal) {
  const max = Math.max(reelVal, carVal, 1)
  return [Math.round(reelVal / max * 100), Math.round(carVal / max * 100)]
}

const radarDims = ['Views', 'Eng%', 'Saves', 'Shares', 'Alcance']
const reelRadar = [byFormat.Reel.views, byFormat.Reel.engPct, byFormat.Reel.saves, byFormat.Reel.shares, byFormat.Reel.reach]
const carRadar = [byFormat.Carrossel.views, byFormat.Carrossel.engPct, byFormat.Carrossel.saves, byFormat.Carrossel.shares, byFormat.Carrossel.reach]
const normReel = radarDims.map((_, i) => normalizeRadar(reelRadar[i], carRadar[i])[0])
const normCar = radarDims.map((_, i) => normalizeRadar(reelRadar[i], carRadar[i])[1])

// Theme sorted for horizontal charts
const themeSortShares = Object.entries(byTheme).sort((a, b) => b[1].shares - a[1].shares)
const themeSortSaves = Object.entries(byTheme).sort((a, b) => b[1].saves - a[1].saves)

// Eng% by weekday data
const engByDay = WEEKDAYS_ORDER.map(d => byWeekday[d].engPct)
const maxEngDay = Math.max(...engByDay)
const engDayColors = engByDay.map(v => v === maxEngDay ? '#c8a96e' : '#555')

const savesByDay = WEEKDAYS_ORDER.map(d => byWeekday[d].saves)
const maxSaveDay = Math.max(...savesByDay)
const saveDayColors = savesByDay.map(v => v === maxSaveDay ? '#c8a96e' : '#555')

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Content Intelligence Dashboard — @karensantosperfil</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
:root {
  --bg: #0d0d0d; --surface: #161616; --card: #1e1e1e; --border: #2a2a2a;
  --accent: #c8a96e; --accent2: #7c6fcd; --accent3: #4ecca3;
  --text: #e8e8e8; --muted: #888;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: system-ui, 'Segoe UI', sans-serif; line-height: 1.5; }
.container { max-width: 1280px; margin: 0 auto; padding: 24px 20px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
@media (max-width: 900px) { .grid-2, .grid-3, .grid-4, .grid-5 { grid-template-columns: 1fr; } }
@media (min-width: 901px) and (max-width: 1100px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } .grid-5 { grid-template-columns: repeat(3, 1fr); } }
h1 { font-size: 28px; font-weight: 800; color: var(--text); }
h2 { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 16px; }
h3 { font-size: 14px; font-weight: 600; color: var(--muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.section { margin-top: 32px; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.kpi-value { font-size: 32px; font-weight: 800; color: var(--accent); margin: 8px 0 4px; }
.kpi-label { font-size: 12px; color: var(--muted); }
.kpi-detail { font-size: 11px; color: var(--muted); opacity: 0.7; margin-top: 4px; line-height: 1.4; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { text-align: left; padding: 10px 12px; color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--border); text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
tr:hover td { background: rgba(200, 169, 110, 0.05); }
.theme-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
.insight-item { padding: 16px; border-left: 3px solid var(--accent); margin-bottom: 12px; background: var(--surface); border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.6; }
.cal-cell { text-align: center; padding: 20px 12px; }
.cal-day { font-size: 16px; font-weight: 800; margin-bottom: 8px; }
.cal-format { font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.cal-theme { font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.cal-metric { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; background: rgba(200, 169, 110, 0.15); color: var(--accent); margin-bottom: 6px; }
.cal-reason { font-size: 10px; color: var(--muted); line-height: 1.4; }
.header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
.header-left { display: flex; align-items: center; gap: 16px; }
.header-logo { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; color: #fff; }
.header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.header-meta { font-size: 12px; color: var(--muted); }
canvas { max-height: 300px; }
</style>
</head>
<body>
<div class="container">

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <div class="header-logo">CI</div>
    <div>
      <h1>Content Intelligence OS</h1>
      <p class="header-meta">@karensantosperfil · Karen Santos | Carreira & Tech</p>
    </div>
  </div>
  <div class="header-right">
    <span class="header-meta">${period}</span>
    <span class="badge" style="background: rgba(200,169,110,0.15); color: var(--accent);">Análise Estratégica</span>
  </div>
</div>

<!-- KPI CARDS -->
<div class="section grid-4">
  <div class="card">
    <h3>Posts Orgânicos</h3>
    <div class="kpi-value">${organic.length}</div>
    <div class="kpi-label">${byFormat.Reel?.n || 0} Reels · ${byFormat.Carrossel?.n || 0} Carrosséis</div>
    <div class="kpi-detail">${posts.length - organic.length} posts com boost removidos da análise</div>
  </div>
  <div class="card">
    <h3>Melhor Eng%</h3>
    <div class="kpi-value">${bestEng ? bestEng.engPct.toFixed(1) + '%' : 'N/A'}</div>
    <div class="kpi-label">${bestEng ? bestEng.dateStr + ' · ' + bestEng.weekday : ''}</div>
    <div class="kpi-detail">${bestEng ? bestEng.desc.slice(0, 80) + '...' : ''}</div>
  </div>
  <div class="card">
    <h3>Recorde de Saves</h3>
    <div class="kpi-value">${bestSave ? bestSave.saves : 0}</div>
    <div class="kpi-label">${bestSave ? bestSave.format + ' · ' + bestSave.theme : ''}</div>
    <div class="kpi-detail">${bestSave ? bestSave.desc.slice(0, 80) + '...' : ''}</div>
  </div>
  <div class="card">
    <h3>Viral Orgânico</h3>
    <div class="kpi-value">${bestViews ? bestViews.views.toLocaleString('pt-BR') : 0}</div>
    <div class="kpi-label">views · ${bestViews ? bestViews.format : ''}</div>
    <div class="kpi-detail">${bestViews ? bestViews.desc.slice(0, 80) + '...' : ''}</div>
  </div>
</div>

<!-- CHARTS ROW 1 -->
<div class="section grid-2">
  <div class="card">
    <h3>Eng% Médio por Dia da Semana</h3>
    <canvas id="chartEngDay"></canvas>
  </div>
  <div class="card">
    <h3>Saves Médios por Dia da Semana</h3>
    <canvas id="chartSavesDay"></canvas>
  </div>
</div>

<!-- CHARTS ROW 2 -->
<div class="section grid-3">
  <div class="card">
    <h3>Shares Médios por Tema</h3>
    <canvas id="chartSharesTheme"></canvas>
  </div>
  <div class="card">
    <h3>Saves Médios por Tema</h3>
    <canvas id="chartSavesTheme"></canvas>
  </div>
  <div class="card">
    <h3>Reel vs Carrossel</h3>
    <canvas id="chartRadar"></canvas>
  </div>
</div>

<!-- INSIGHTS -->
<div class="section grid-2">
  <div class="card">
    <h3>Top 5 Posts por Engajamento</h3>
    <table>
      <thead><tr><th>Data</th><th>Dia</th><th>Tipo</th><th>Tema</th><th>Saves</th><th>Shares</th><th>Eng%</th></tr></thead>
      <tbody>
${top5.map(p => `        <tr>
          <td>${p.dateStr}</td>
          <td>${p.weekday}</td>
          <td>${p.format}</td>
          <td><span class="theme-badge" style="background: ${themeColor(p.theme)}22; color: ${themeColor(p.theme)}">${p.theme}</span></td>
          <td>${p.saves}</td>
          <td>${p.shares}</td>
          <td style="color: var(--accent); font-weight: 700;">${p.engPct.toFixed(1)}%</td>
        </tr>`).join('\n')}
      </tbody>
    </table>
  </div>
  <div class="card">
    <h3>Insights Estratégicos</h3>
${insights.map(i => `    <div class="insight-item">${i}</div>`).join('\n')}
  </div>
</div>

<!-- CALENDAR -->
<div class="section">
  <h2>📅 Calendário Semanal Recomendado</h2>
  <div class="grid-5">
${calendar.map(c => `    <div class="card cal-cell">
      <div class="cal-day" style="color: ${c.isBest ? 'var(--accent)' : c.isSecond ? 'var(--accent2)' : 'var(--text)'}">${c.day}</div>
      <div class="cal-format">${c.format}</div>
      <div class="cal-theme" style="color: ${themeColor(c.theme)}">${c.theme}</div>
      <div class="cal-metric">${c.metric}</div>
      <div class="cal-reason">${c.reason}</div>
    </div>`).join('\n')}
  </div>
</div>

</div>

<script>
Chart.defaults.color = '#888';
Chart.defaults.borderColor = '#2a2a2a';

// Eng% by day
new Chart(document.getElementById('chartEngDay'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(WEEKDAYS_ORDER)},
    datasets: [{
      data: ${JSON.stringify(engByDay.map(v => +v.toFixed(1)))},
      backgroundColor: ${JSON.stringify(engDayColors)},
      borderRadius: 6,
      borderSkipped: false,
    }]
  },
  options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' } } } }
});

// Saves by day
new Chart(document.getElementById('chartSavesDay'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(WEEKDAYS_ORDER)},
    datasets: [{
      data: ${JSON.stringify(savesByDay.map(v => +v.toFixed(1)))},
      backgroundColor: ${JSON.stringify(saveDayColors)},
      borderRadius: 6,
      borderSkipped: false,
    }]
  },
  options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
});

// Shares by theme (horizontal)
new Chart(document.getElementById('chartSharesTheme'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(themeSortShares.map(([t]) => t))},
    datasets: [{
      data: ${JSON.stringify(themeSortShares.map(([, v]) => +v.shares.toFixed(1)))},
      backgroundColor: ${JSON.stringify(themeSortShares.map(([t]) => themeColor(t)))},
      borderRadius: 6,
      borderSkipped: false,
    }]
  },
  options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
});

// Saves by theme (horizontal)
new Chart(document.getElementById('chartSavesTheme'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(themeSortSaves.map(([t]) => t))},
    datasets: [{
      data: ${JSON.stringify(themeSortSaves.map(([, v]) => +v.saves.toFixed(1)))},
      backgroundColor: ${JSON.stringify(themeSortSaves.map(([t]) => themeColor(t)))},
      borderRadius: 6,
      borderSkipped: false,
    }]
  },
  options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
});

// Radar
new Chart(document.getElementById('chartRadar'), {
  type: 'radar',
  data: {
    labels: ${JSON.stringify(radarDims)},
    datasets: [
      { label: 'Reel', data: ${JSON.stringify(normReel)}, borderColor: '#c8a96e', backgroundColor: 'rgba(200,169,110,0.15)', pointBackgroundColor: '#c8a96e', borderWidth: 2 },
      { label: 'Carrossel', data: ${JSON.stringify(normCar)}, borderColor: '#7c6fcd', backgroundColor: 'rgba(124,111,205,0.15)', pointBackgroundColor: '#7c6fcd', borderWidth: 2 },
    ]
  },
  options: {
    responsive: true,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 16 } } },
    scales: { r: { beginAtZero: true, max: 100, ticks: { display: false }, grid: { color: '#2a2a2a' }, angleLines: { color: '#2a2a2a' }, pointLabels: { font: { size: 11 } } } }
  }
});
</script>
</body>
</html>`

writeFileSync('C:/Users/DELL/Documents/content-intelligence-os/outputs/content_intelligence_dashboard.html', html, 'utf-8')
console.log('\\n✅ Dashboard saved to outputs/content_intelligence_dashboard.html')
