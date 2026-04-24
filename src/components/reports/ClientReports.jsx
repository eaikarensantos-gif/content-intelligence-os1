import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Calendar, Users, Loader2, Sparkles, TrendingUp,
  Eye, Heart, Share2, Bookmark, Trophy, AlertCircle, Printer,
  ChevronRight, BarChart2, CheckCircle, ArrowUpRight, ArrowDownRight,
  Minus, Plus, X, ExternalLink, Download, Link2, UserPlus,
  Film, Play, Layers, Image, Clock, Copy, Check, Upload,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { enrichMetric } from '../../utils/analytics'
import { parseFile } from '../../utils/csvNormalizer'

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

const fmtNumber = (n) => (n || 0).toLocaleString('pt-BR')

const POST_TYPE_LABELS = { story: 'Story', reel: 'Reel', carousel: 'Carrossel', image: 'Imagem', video: 'Vídeo', 'carrossel do instagram': 'Carrossel' }
const POST_TYPE_ICONS = { story: Film, reel: Play, carousel: Layers, image: Image, video: Play, 'carrossel do instagram': Layers }

function PostTypeBadge({ type }) {
  if (!type) return null
  const label = POST_TYPE_LABELS[type] || type
  const Icon = POST_TYPE_ICONS[type]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 capitalize">
      {Icon && <Icon size={9} />} {label}
    </span>
  )
}

// ── AI Prompt Builder ───────────────────────────────────────────────────────
function buildReportPrompt(data) {
  const { filtered, clientName, periodLabel, totalImpressions, avgER, totalEngagement, totalShares, totalSaves, top5, bottom3, formatBreakdown, dayBreakdown } = data

  return `Você é um consultor de marketing digital gerando um relatório executivo de performance para o cliente "${clientName}".

REGRAS:
- Linguagem profissional e direta
- Insights DEVEM ser baseados nos dados fornecidos — cite números específicos
- Recomendações devem ser práticas e implementáveis
- NÃO use linguagem genérica ou motivacional
- O relatório é para apresentar ao cliente — seja claro e objetivo

DADOS DO PERÍODO (${periodLabel}):
- Cliente: ${clientName}
- Posts analisados: ${filtered.length}
- Impressões totais: ${totalImpressions.toLocaleString()}
- Engajamento total: ${totalEngagement.toLocaleString()}
- Taxa de engajamento média: ${avgER}%
- Compartilhamentos totais: ${totalShares}
- Salvamentos totais: ${totalSaves}

TOP 5 POSTS (por taxa de engajamento):
${top5.map((m, i) => `${i + 1}. [${m.post_type || '?'}] "${(m.description || '').slice(0, 100)}" — ER: ${(m.engagement_rate * 100).toFixed(2)}%, Impressões: ${m.impressions}, Curtidas: ${m.likes}, Compart.: ${m.shares || 0}, Salvam.: ${m.saves || 0}, Data: ${m.date}`).join('\n')}

${bottom3.length > 0 ? `POSTS COM MENOR DESEMPENHO:
${bottom3.map((m, i) => `${i + 1}. [${m.post_type || '?'}] "${(m.description || '').slice(0, 80)}" — ER: ${(m.engagement_rate * 100).toFixed(2)}%, Impressões: ${m.impressions}`).join('\n')}` : ''}

POR FORMATO:
${formatBreakdown}

POR DIA DA SEMANA:
${dayBreakdown}

Gere o relatório em JSON com esta estrutura EXATA:
{
  "executive_summary": "2-3 frases resumindo o período para o cliente",
  "highlights": [
    {"title": "Destaque curto", "description": "Explicação com dados", "metric": "número relevante"}
  ],
  "insights": [
    {
      "title": "Título do insight",
      "observation": "Dado concreto observado",
      "interpretation": "O que significa",
      "action": "Recomendação prática"
    }
  ],
  "recommendations": [
    {"title": "Recomendação", "description": "Detalhes", "priority": "high|medium|low", "timeline": "próxima semana|próximo mês|contínuo"}
  ],
  "content_suggestions": [
    {"title": "Título do conteúdo sugerido", "format": "reel|carousel|etc", "reason": "Por que baseado nos dados"}
  ]
}

Responda EXCLUSIVAMENTE com JSON válido.`
}

// ── Shareable HTML Generator ────────────────────────────────────────────────
function generateShareableHTML(report, clientName, periodLabel, filtered, enrichedFiltered) {
  const totalImpressions = enrichedFiltered.reduce((s, m) => s + m.impressions, 0)
  const totalEngagement = enrichedFiltered.reduce((s, m) => s + m.engagement, 0)
  const avgER = enrichedFiltered.length ? (enrichedFiltered.reduce((s, m) => s + m.engagement_rate, 0) / enrichedFiltered.length * 100).toFixed(2) : '0.00'
  const top5 = [...enrichedFiltered].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 5)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório - ${clientName} - ${periodLabel}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;background:#f9fafb;padding:2rem}
.container{max-width:800px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.header{background:linear-gradient(135deg,#1f2937,#111827);color:#fff;padding:2rem}
.header h1{font-size:1.5rem;margin-bottom:.25rem}.header p{color:#9ca3af;font-size:.875rem}
.header .meta{display:flex;justify-content:space-between;margin-top:.5rem;font-size:.75rem;color:#6b7280}
.section{padding:1.5rem 2rem;border-bottom:1px solid #f3f4f6}
.section h2{font-size:1rem;font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;padding:1.5rem 2rem;border-bottom:1px solid #f3f4f6}
.stat{text-align:center}.stat .value{font-size:1.25rem;font-weight:700;color:#1f2937}.stat .label{font-size:.625rem;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-top:.125rem}
.summary{background:#fffbeb;padding:1rem 1.5rem;border-radius:12px;border:1px solid #fde68a;font-size:.875rem;line-height:1.6;color:#92400e}
.highlight{display:flex;gap:.75rem;padding:.75rem 0;border-bottom:1px solid #f9fafb}.highlight:last-child{border:none}
.highlight .bar{width:3px;border-radius:2px;background:#10b981;flex-shrink:0}
.highlight h3{font-size:.8125rem;font-weight:600;color:#1f2937}.highlight p{font-size:.75rem;color:#6b7280;margin-top:.125rem}
.insight{padding:1rem;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;margin-bottom:.75rem}
.insight h3{font-size:.8125rem;font-weight:600;margin-bottom:.5rem}
.insight .tag{display:inline-block;font-size:.625rem;font-weight:600;text-transform:uppercase;padding:.125rem .5rem;border-radius:4px;margin-bottom:.5rem}
.obs{border-left:2px solid #d1d5db;padding-left:.75rem;margin-bottom:.375rem}.obs .label{font-size:.625rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.03em}
.obs p{font-size:.75rem;color:#4b5563;line-height:1.5}
.interp{border-left:2px solid #3b82f6;padding-left:.75rem;margin-bottom:.375rem}.interp .label{font-size:.625rem;font-weight:700;color:#3b82f6;text-transform:uppercase}
.interp p{font-size:.75rem;color:#374151;line-height:1.5}
.action{border-left:2px solid #f97316;padding-left:.75rem}.action .label{font-size:.625rem;font-weight:700;color:#f97316;text-transform:uppercase}
.action p{font-size:.75rem;color:#111827;font-weight:500;line-height:1.5}
.rec{display:flex;align-items:flex-start;gap:.75rem;padding:.75rem 1rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:.5rem}
.rec .priority{font-size:.5625rem;font-weight:700;text-transform:uppercase;padding:.125rem .375rem;border-radius:4px;white-space:nowrap}
.rec .priority.high{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.rec .priority.medium{background:#fffbeb;color:#d97706;border:1px solid #fde68a}
.rec .priority.low{background:#f9fafb;color:#6b7280;border:1px solid #e5e7eb}
.rec h3{font-size:.8125rem;font-weight:600}.rec p{font-size:.75rem;color:#6b7280;margin-top:.125rem}
.post-row{display:flex;align-items:center;gap:.75rem;padding:.625rem 0;border-bottom:1px solid #f3f4f6}
.post-row:last-child{border:none}.post-row .rank{font-size:.75rem;font-weight:700;color:#d1d5db;width:1.25rem;text-align:center}
.post-row .info{flex:1;min-width:0}.post-row .info p{font-size:.75rem;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.post-row .info .meta{font-size:.625rem;color:#9ca3af;margin-top:.125rem;display:flex;gap:.5rem}
.post-row .er{font-size:.75rem;font-weight:700;padding:.25rem .625rem;border-radius:99px}
.er-high{background:#d1fae5;color:#065f46}.er-mid{background:#fef3c7;color:#92400e}.er-low{background:#f3f4f6;color:#6b7280}
table{width:100%;border-collapse:collapse;font-size:.6875rem}th{text-align:left;padding:.5rem;color:#9ca3af;font-weight:500;border-bottom:2px solid #f3f4f6;white-space:nowrap}
td{padding:.5rem;border-bottom:1px solid #f9fafb;color:#4b5563}tr:hover{background:#fffbf5}
.footer{text-align:center;padding:1rem;font-size:.625rem;color:#d1d5db}
@media print{body{padding:0;background:#fff}.container{box-shadow:none;border-radius:0}.section{break-inside:avoid}}
@media(max-width:640px){.stats{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <p style="font-size:.625rem;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;margin-bottom:.5rem">Relatório de Performance</p>
    <h1>${clientName}</h1>
    <p>${periodLabel}</p>
    <div class="meta">
      <span>${enrichedFiltered.length} posts analisados</span>
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
    </div>
  </div>

  <div class="stats">
    <div class="stat"><div class="value">${enrichedFiltered.length}</div><div class="label">Posts</div></div>
    <div class="stat"><div class="value">${totalImpressions.toLocaleString()}</div><div class="label">Impressões</div></div>
    <div class="stat"><div class="value">${totalEngagement.toLocaleString()}</div><div class="label">Engajamento</div></div>
    <div class="stat"><div class="value">${avgER}%</div><div class="label">Taxa Eng.</div></div>
  </div>

  <div class="section">
    <h2>Resumo Executivo</h2>
    <div class="summary">${report.executive_summary || ''}</div>
  </div>

  ${report.highlights?.length ? `<div class="section">
    <h2>Destaques</h2>
    ${report.highlights.map(h => `<div class="highlight"><div class="bar"></div><div><h3>${h.title}</h3><p>${h.description}${h.metric ? ` <strong>${h.metric}</strong>` : ''}</p></div></div>`).join('')}
  </div>` : ''}

  <div class="section">
    <h2>Top Posts</h2>
    ${top5.map((m, i) => {
      const er = (m.engagement_rate * 100).toFixed(1)
      const cls = m.engagement_rate > 0.04 ? 'er-high' : m.engagement_rate > 0.02 ? 'er-mid' : 'er-low'
      return `<div class="post-row"><span class="rank">${i+1}</span><div class="info"><p>${(m.description || 'Sem descrição').slice(0, 80)}</p><div class="meta"><span>${fmtDate(m.date)}</span><span>${m.post_type || ''}</span><span>${m.impressions.toLocaleString()} imp.</span></div></div><span class="er ${cls}">${er}%</span></div>`
    }).join('')}
  </div>

  <div class="section">
    <h2>Métricas Detalhadas</h2>
    <div style="overflow-x:auto">
    <table>
      <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Dur.</th><th>Impr.</th><th>Alcance</th><th>Curt.</th><th>Comp.</th><th>Salv.</th><th>Seg.</th><th>Com.</th><th>ER</th></tr></thead>
      <tbody>
      ${enrichedFiltered.sort((a,b) => new Date(b.date) - new Date(a.date)).map(m => `<tr>
        <td style="white-space:nowrap">${fmtDate(m.date)}</td>
        <td>${m.post_type || '—'}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(m.description || '').replace(/"/g, '&quot;')}">${(m.description || '—').slice(0, 50)}</td>
        <td>${m.duration_sec ? m.duration_sec + 's' : '—'}</td>
        <td>${fmtNumber(m.impressions)}</td>
        <td>${fmtNumber(m.reach)}</td>
        <td>${fmtNumber(m.likes)}</td>
        <td>${fmtNumber(m.shares)}</td>
        <td>${fmtNumber(m.saves)}</td>
        <td>${fmtNumber(m.follows)}</td>
        <td>${fmtNumber(m.comments)}</td>
        <td><strong>${(m.engagement_rate * 100).toFixed(1)}%</strong></td>
      </tr>`).join('')}
      </tbody>
    </table>
    </div>
  </div>

  ${report.insights?.length ? `<div class="section">
    <h2>Insights</h2>
    ${report.insights.map(ins => `<div class="insight">
      <h3>${ins.title}</h3>
      <div class="obs"><span class="label">Observação</span><p>${ins.observation}</p></div>
      <div class="interp"><span class="label">Interpretação</span><p>${ins.interpretation}</p></div>
      <div class="action"><span class="label">Ação</span><p>${ins.action}</p></div>
    </div>`).join('')}
  </div>` : ''}

  ${report.recommendations?.length ? `<div class="section">
    <h2>Recomendações</h2>
    ${report.recommendations.map(r => `<div class="rec">
      <span class="priority ${r.priority || 'medium'}">${r.priority === 'high' ? 'ALTA' : r.priority === 'low' ? 'BAIXA' : 'MÉDIA'}${r.timeline ? ' · ' + r.timeline : ''}</span>
      <div><h3>${r.title}</h3><p>${r.description}</p></div>
    </div>`).join('')}
  </div>` : ''}

  ${report.content_suggestions?.length ? `<div class="section">
    <h2>Sugestões de Conteúdo</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem">
    ${report.content_suggestions.map(c => `<div style="padding:.75rem;border-radius:10px;background:#faf5ff;border:1px solid #e9d5ff">
      <p style="font-size:.8125rem;font-weight:600;color:#1f2937;margin-bottom:.25rem">${c.title}</p>
      <span style="font-size:.625rem;font-weight:600;background:#e9d5ff;color:#7c3aed;padding:.125rem .375rem;border-radius:4px;text-transform:capitalize">${c.format}</span>
      <p style="font-size:.6875rem;color:#6b7280;margin-top:.5rem">${c.reason}</p>
    </div>`).join('')}
    </div>
  </div>` : ''}

  <div class="footer">Relatório gerado por Content Intelligence OS · ${new Date().toLocaleDateString('pt-BR')}</div>
</div>
</body></html>`
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ClientReports() {
  const metrics = useStore((s) => s.metrics)
  const addMetric = useStore((s) => s.addMetric)
  const navigate = useNavigate()
  const csvRef = useRef(null)

  const enriched = useMemo(() => metrics.map(enrichMetric), [metrics])

  // Extract hashtags from descriptions as client/project identifiers
  const extractHashtags = (text) => {
    if (!text) return []
    const matches = text.match(/#[\wÀ-ÿ]+/gi) || []
    return matches.map(h => h.toLowerCase())
  }

  // Extract unique clients: from 'client' field + hashtags in descriptions
  const { existingClients, hashtagMap } = useMemo(() => {
    const clientSet = new Set()
    const tagMap = {} // hashtag -> array of metric ids

    enriched.forEach(m => {
      // From client field
      if (m.client) clientSet.add(m.client)
      // From hashtags in description
      const tags = extractHashtags(m.description)
      tags.forEach(tag => {
        clientSet.add(tag)
        if (!tagMap[tag]) tagMap[tag] = new Set()
        tagMap[tag].add(m.id)
      })
    })

    return {
      existingClients: [...clientSet].sort(),
      hashtagMap: tagMap,
    }
  }, [enriched])

  // ── Quick CSV import (reuses same column mapping as MetricsForm) ────────
  const stripAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const COL_MAP = {
    'post_id': 'post_id', 'post id': 'post_id',
    'data': 'date', 'date': 'date', 'publish time': 'date', 'horario de publicacao': 'date',
    'data de publicacao': 'date', 'published at': 'date', 'data do post': 'date',
    'plataforma': 'platform', 'platform': 'platform',
    'post type': 'post_type', 'tipo de post': 'post_type', 'tipo': 'post_type', 'post_type': 'post_type',
    'description': 'description', 'descricao': 'description', 'legenda': 'description',
    'permalink': 'link', 'link permanente': 'link', 'link': 'link', 'url': 'link',
    'duracao (s)': 'duration_sec', 'duracao': 'duration_sec', 'duration': 'duration_sec',
    'visualizacoes': 'impressions', 'impressoes': 'impressions', 'impressions': 'impressions', 'views': 'impressions',
    'alcance': 'reach', 'reach': 'reach',
    'curtidas': 'likes', 'likes': 'likes',
    'coment.': 'comments', 'comentarios': 'comments', 'comments': 'comments', 'replies': 'comments',
    'compart.': 'shares', 'compartilhamentos': 'shares', 'shares': 'shares',
    'seguimentos': 'follows', 'follows': 'follows', 'seguidores': 'follows', 'new followers': 'follows', 'novos seguidores': 'follows',
    'salvam.': 'saves', 'salvamentos': 'saves', 'saves': 'saves', 'sticker taps': 'saves',
    'cliques no link': 'link_clicks', 'link_clicks': 'link_clicks',
    'cliente': 'client', 'client': 'client', 'projeto': 'client', 'marca': 'client', 'brand': 'client',
  }
  const toNum = (v = '') => Number(String(v).replace(/[^0-9]/g, '')) || 0
  const normalizeDate = (raw = '') => {
    const s = raw.trim()
    if (!s) return ''
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
    const ptMonth = { 'jan':'01','fev':'02','mar':'03','abr':'04','mai':'05','jun':'06','jul':'07','ago':'08','set':'09','out':'10','nov':'11','dez':'12' }
    const brLong = s.match(/(\d{1,2})\s+de?\s*(\w{3})\.?\s+(\d{4})/)
    if (brLong) { const m = ptMonth[brLong[2].toLowerCase().replace('.', '')] || '01'; return `${brLong[3]}-${m}-${brLong[1].padStart(2, '0')}` }
    const slash = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/)
    if (slash) {
      if (Number(slash[1]) > 12) return `${slash[3]}-${slash[2].padStart(2,'0')}-${slash[1].padStart(2,'0')}`
      return `${slash[3]}-${slash[1].padStart(2,'0')}-${slash[2].padStart(2,'0')}`
    }
    const d = new Date(s)
    return !isNaN(d) ? d.toISOString().split('T')[0] : ''
  }
  const normalizePostType = (raw = '') => {
    const v = raw.toLowerCase().trim()
    if (v.includes('story') || v.includes('storie')) return 'story'
    if (v.includes('reel')) return 'reel'
    if (v.includes('carousel') || v.includes('carrossel')) return 'carousel'
    if (v.includes('video')) return 'video'
    if (v.includes('image') || v.includes('photo') || v.includes('foto')) return 'image'
    return v || ''
  }

  const [importCount, setImportCount] = useState(null)
  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { data } = await parseFile(file)
      let count = 0
      data.forEach(raw => {
        const row = {}
        for (const [key, val] of Object.entries(raw)) {
          const clean = stripAccents(key.toLowerCase().trim())
          const mapped = COL_MAP[clean] || COL_MAP[key.toLowerCase().trim()]
          if (mapped) row[mapped] = val
        }
        if (!row.impressions && !row.likes && !row.description) return // skip empty rows
        addMetric({
          post_id: row.post_id || '',
          platform: row.platform || 'instagram',
          date: normalizeDate(row.date || ''),
          impressions: toNum(row.impressions),
          reach: toNum(row.reach),
          likes: toNum(row.likes),
          comments: toNum(row.comments),
          shares: toNum(row.shares),
          saves: toNum(row.saves),
          follows: toNum(row.follows),
          link_clicks: toNum(row.link_clicks),
          duration_sec: toNum(row.duration_sec),
          description: (row.description || '').trim(),
          link: (row.link || '').trim(),
          post_type: normalizePostType(row.post_type),
          client: (row.client || '').trim(),
        })
        count++
      })
      setImportCount(count)
      setTimeout(() => setImportCount(null), 4000)
    } catch (err) {
      console.error(err)
    }
    e.target.value = ''
  }

  // Form state
  const [selectedClient, setSelectedClient] = useState('')
  const [customClient, setCustomClient] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [shareUrl, setShareUrl] = useState(null)
  const [copied, setCopied] = useState(false)

  const clientName = selectedClient === '__custom' ? customClient : selectedClient

  const filtered = useMemo(() => enriched.filter(m => {
    if (clientName) {
      const cn = clientName.toLowerCase()
      const matchClient = m.client?.toLowerCase() === cn
      const matchHashtag = extractHashtags(m.description).includes(cn.startsWith('#') ? cn : '#' + cn)
      const matchHashtagDirect = extractHashtags(m.description).includes(cn)
      if (!matchClient && !matchHashtag && !matchHashtagDirect) return false
    }
    if (dateFrom && m.date < dateFrom) return false
    if (dateTo && m.date > dateTo) return false
    return true
  }), [enriched, clientName, dateFrom, dateTo])

  const canGenerate = filtered.length >= 2

  const periodLabel = (() => {
    const parts = []
    if (dateFrom) parts.push(`de ${fmtDate(dateFrom)}`)
    if (dateTo) parts.push(`até ${fmtDate(dateTo)}`)
    return parts.length ? parts.join(' ') : 'Todo o período'
  })()

  // ── Generate Report ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setReport(null)
    setShareUrl(null)

    try {
      const apiKey = localStorage.getItem('cio-anthropic-key')
      if (!apiKey) throw new Error('Configure sua API key. Vá em Dashboard > configurações.')

      const totalImpressions = filtered.reduce((s, m) => s + m.impressions, 0)
      const totalEngagement = filtered.reduce((s, m) => s + m.engagement, 0)
      const avgER = filtered.length ? (filtered.reduce((s, m) => s + m.engagement_rate, 0) / filtered.length * 100).toFixed(2) : '0.00'
      const totalShares = filtered.reduce((s, m) => s + (m.shares || 0), 0)
      const totalSaves = filtered.reduce((s, m) => s + (m.saves || 0), 0)
      const top5 = [...filtered].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 5)
      const bottom3 = [...filtered].sort((a, b) => a.engagement_rate - b.engagement_rate).slice(0, 3)

      const formatMap = {}
      filtered.forEach(m => {
        const t = m.post_type || 'desconhecido'
        if (!formatMap[t]) formatMap[t] = { count: 0, impressions: 0, er_sum: 0 }
        formatMap[t].count++
        formatMap[t].impressions += m.impressions
        formatMap[t].er_sum += m.engagement_rate
      })
      const formatBreakdown = Object.entries(formatMap).map(([type, d]) =>
        `- ${type}: ${d.count} posts, ER médio: ${(d.er_sum / d.count * 100).toFixed(2)}%, Impressões médias: ${Math.round(d.impressions / d.count)}`
      ).join('\n')

      const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      const dayMap = {}
      filtered.forEach(m => {
        if (!m.date) return
        const d = new Date(m.date + 'T12:00:00').getDay()
        const name = DAY_NAMES[d]
        if (!dayMap[name]) dayMap[name] = { count: 0, er_sum: 0, impressions: 0 }
        dayMap[name].count++
        dayMap[name].er_sum += m.engagement_rate
        dayMap[name].impressions += m.impressions
      })
      const dayBreakdown = Object.entries(dayMap).map(([day, d]) =>
        `- ${day}: ${d.count} posts, ER médio: ${(d.er_sum / d.count * 100).toFixed(2)}%`
      ).join('\n')

      const prompt = buildReportPrompt({
        filtered, clientName: clientName || 'Geral', periodLabel,
        totalImpressions, avgER, totalEngagement, totalShares, totalSaves,
        top5, bottom3, formatBreakdown, dayBreakdown,
      })

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error?.message || `Erro da API: ${res.status}`)
      }

      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Resposta inválida da IA')

      const cleaned = jsonMatch[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
      const parsed = JSON.parse(cleaned)
      setReport(parsed)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Shareable Link ─────────────────────────────────────────────────────
  const handleShareLink = () => {
    if (!report) return
    const html = generateShareableHTML(report, clientName || 'Geral', periodLabel, filtered, filtered)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setShareUrl(url)
    window.open(url, '_blank')
  }

  // ── Export CSV ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const csv = Papa.unparse(filtered.map(m => ({
      cliente: clientName || '',
      data: m.date,
      tipo: m.post_type || '',
      descricao: m.description || '',
      duracao_s: m.duration_sec || '',
      link: m.link || '',
      impressoes: m.impressions,
      alcance: m.reach,
      curtidas: m.likes,
      comentarios: m.comments,
      compartilhamentos: m.shares,
      salvamentos: m.saves,
      seguimentos: m.follows || 0,
      engajamento: m.engagement,
      taxa_engajamento: (m.engagement_rate * 100).toFixed(2) + '%',
    })))
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${(clientName || 'geral').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  // ── Computed stats ─────────────────────────────────────────────────────
  const totalImpressions = filtered.reduce((s, m) => s + m.impressions, 0)
  const totalEngagement = filtered.reduce((s, m) => s + m.engagement, 0)
  const avgER = filtered.length ? (filtered.reduce((s, m) => s + m.engagement_rate, 0) / filtered.length * 100).toFixed(2) : '0.00'
  const totalShares = filtered.reduce((s, m) => s + (m.shares || 0), 0)
  const totalSaves = filtered.reduce((s, m) => s + (m.saves || 0), 0)
  const totalFollows = filtered.reduce((s, m) => s + (m.follows || 0), 0)
  const top5 = [...filtered].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 5)

  return (
    <div className="p-6 space-y-5 animate-fade-in">

      {/* ── Config Panel ────────────────────────────────────────────────── */}
      {!report && (
        <div className="space-y-5">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-white">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-orange-500 blur-3xl" />
              <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-blue-500 blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={18} className="text-orange-400" />
                <h2 className="text-base font-bold">Client Report Generator</h2>
              </div>
              <p className="text-sm text-gray-300 max-w-xl">
                Gere relatórios profissionais de performance para seus clientes. Selecione o cliente, o período, e a IA cria um relatório completo pronto para apresentar.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="card p-6 space-y-5">
            {/* Import CSV */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Upload size={16} className="text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700">Importar dados de posts</p>
                <p className="text-[10px] text-gray-400">CSV do Instagram, LinkedIn ou TikTok com legenda/descrição para extrair hashtags e clientes</p>
              </div>
              <button
                onClick={() => csvRef.current?.click()}
                className="btn-secondary text-xs shrink-0"
              >
                <Upload size={12} /> Upload arquivo
              </button>
              <input ref={csvRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCSVImport} />
            </div>
            {importCount !== null && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                <Check size={12} /> {importCount} posts importados com sucesso!
              </div>
            )}

            {/* Data diagnostic */}
            {enriched.length > 0 && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Dados disponíveis</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                    {enriched.length} posts no total
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                    {enriched.filter(m => m.description).length} com legenda
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                    {enriched.filter(m => m.client).length} com cliente
                  </span>
                </div>
                {existingClients.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-gray-400 mr-1">Hashtags/clientes detectados:</span>
                    {existingClients.slice(0, 20).map(c => (
                      <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                        c.startsWith('#') ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                {existingClients.length === 0 && enriched.length > 0 && (
                  <p className="text-[10px] text-amber-500 flex items-center gap-1">
                    <AlertCircle size={10} /> Nenhuma hashtag detectada nas legendas. Importe um CSV que inclua a coluna "Descrição" ou "Legenda" com as # dos posts.
                  </p>
                )}
              </div>
            )}

            {/* Client selector */}
            <div>
              <label className="label">Cliente / Projeto / Hashtag</label>
              {existingClients.length > 0 ? (
                <div className="space-y-2">
                  <select
                    className="select"
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                  >
                    <option value="">Todos (sem filtro)</option>
                    {existingClients.map(c => {
                      const isTag = c.startsWith('#')
                      const count = isTag
                        ? (hashtagMap[c]?.size || 0)
                        : enriched.filter(m => m.client?.toLowerCase() === c.toLowerCase()).length
                      return (
                        <option key={c} value={c}>
                          {isTag ? '' : '👤 '}{c} ({count} posts)
                        </option>
                      )
                    })}
                    <option value="__custom">+ Digitar outro nome ou #hashtag...</option>
                  </select>
                  {selectedClient === '__custom' && (
                    <input
                      type="text"
                      className="input"
                      placeholder="Nome do cliente ou #hashtag..."
                      value={customClient}
                      onChange={(e) => setCustomClient(e.target.value)}
                    />
                  )}
                  <p className="text-[11px] text-gray-400">
                    As hashtags (#) são extraídas automaticamente das descrições dos seus posts.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: #fiap, #publi, Brand X..."
                    value={customClient}
                    onChange={(e) => { setCustomClient(e.target.value); setSelectedClient('__custom') }}
                  />
                  <p className="text-[11px] text-gray-400">
                    Dica: Use as hashtags que já estão nos seus posts (#parceiro, #publi, #marca) para filtrar por cliente automaticamente.
                  </p>
                </div>
              )}
            </div>

            {/* Period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Data Inicial</label>
                <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">Data Final</label>
                <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="flex items-end">
                <div className="w-full p-3 rounded-xl bg-orange-50 border border-orange-100 text-center">
                  <p className="text-2xl font-bold text-orange-600">{filtered.length}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Posts no período</p>
                </div>
              </div>
            </div>

            {/* Quick stats preview */}
            {filtered.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Impressões', value: fmtNumber(totalImpressions) },
                  { label: 'Engajamento', value: fmtNumber(totalEngagement) },
                  { label: 'Taxa Eng.', value: `${avgER}%` },
                  { label: 'Compartilh.', value: fmtNumber(totalShares) },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <p className="text-sm font-bold text-gray-900">{value}</p>
                    <p className="text-[9px] text-gray-400 uppercase">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Generate button */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || loading}
                className="btn-primary"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Gerando relatório...</>
                ) : (
                  <><Sparkles size={14} /> Gerar Relatório</>
                )}
              </button>
              {!canGenerate && filtered.length < 2 && (
                <span className="text-xs text-amber-500 flex items-center gap-1">
                  <AlertCircle size={12} /> Mínimo 2 posts no período selecionado
                </span>
              )}
            </div>
          </div>

          {/* No data hint */}
          {enriched.length === 0 && (
            <div className="card p-8 text-center">
              <BarChart2 size={36} className="text-gray-200 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Sem dados de métricas</h3>
              <p className="text-xs text-gray-400 mb-4">Use o botão "Upload CSV" acima para importar os dados do Instagram/LinkedIn/TikTok, ou importe via Analytics.</p>
              <button onClick={() => navigate('/analytics')} className="btn-primary mx-auto">
                Ir para Analytics
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-5 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={16} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            <FileText size={20} className="absolute inset-0 m-auto text-orange-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">Gerando relatório para {clientName || 'todos os clientes'}...</p>
            <p className="text-xs text-gray-400 mt-1">Analisando {filtered.length} posts e formulando insights</p>
          </div>
        </div>
      )}

      {/* ── Generated Report ────────────────────────────────────────────── */}
      {report && !loading && (
        <>
          {/* Action bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
            <button onClick={() => { setReport(null); setShareUrl(null) }} className="btn-secondary text-xs">
              Novo Relatório
            </button>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleExportCSV} className="btn-secondary text-xs flex items-center gap-1.5">
                <Download size={12} /> CSV
              </button>
              <button onClick={handleShareLink} className="btn-secondary text-xs flex items-center gap-1.5">
                <Link2 size={12} /> Link Compartilhável
              </button>
              <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
                <Printer size={14} /> Imprimir / PDF
              </button>
            </div>
          </div>

          {/* Report content */}
          <div className="space-y-5" id="report-content">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white print:rounded-none">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Relatório de Performance</p>
                  <h1 className="text-xl font-bold mb-1">{clientName || 'Relatório Geral'}</h1>
                  <p className="text-sm text-gray-300">{periodLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Gerado em</p>
                  <p className="text-sm text-gray-200">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: FileText, label: 'Posts', value: filtered.length, color: 'text-orange-500' },
                { icon: Eye, label: 'Impressões', value: fmtNumber(totalImpressions), color: 'text-blue-500' },
                { icon: Heart, label: 'Engajamento', value: fmtNumber(totalEngagement), color: 'text-pink-500' },
                { icon: TrendingUp, label: 'Taxa Eng.', value: `${avgER}%`, color: 'text-emerald-500' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="card p-4 text-center">
                  <Icon size={16} className={`mx-auto mb-1.5 ${color}`} />
                  <p className="text-lg font-bold text-gray-900">{value}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Compartilhamentos', value: fmtNumber(totalShares) },
                { label: 'Salvamentos', value: fmtNumber(totalSaves) },
                { label: 'Seguimentos', value: fmtNumber(totalFollows) },
                { label: 'Curtidas', value: fmtNumber(filtered.reduce((s, m) => s + (m.likes || 0), 0)) },
              ].map(({ label, value }) => (
                <div key={label} className="card p-3 text-center">
                  <p className="text-sm font-bold text-gray-900">{value}</p>
                  <p className="text-[9px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Executive Summary */}
            <div className="card p-5 border-orange-200 bg-orange-50/50">
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <FileText size={14} className="text-orange-500" /> Resumo Executivo
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">{report.executive_summary}</p>
            </div>

            {/* Highlights */}
            {report.highlights?.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" /> Destaques do Período
                </h3>
                <div className="space-y-3">
                  {report.highlights.map((h, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="w-1 rounded-full bg-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{h.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{h.description}</p>
                        {h.metric && <p className="text-xs font-bold text-emerald-600 mt-0.5">{h.metric}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Posts */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-orange-500" /> Top Performing Content
              </h3>
              <div className="space-y-2">
                {top5.map((m, i) => {
                  const erColor = m.engagement_rate > 0.04 ? 'text-emerald-600 bg-emerald-50' : m.engagement_rate > 0.02 ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-50'
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                      <span className="text-xs font-bold text-gray-300 w-5 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-800 truncate">{m.description || 'Sem descrição'}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-gray-400">{fmtDate(m.date)}</span>
                          <PostTypeBadge type={m.post_type} />
                          {m.link && (
                            <a href={m.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600">
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="text-gray-400">{fmtNumber(m.impressions)} imp.</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${erColor}`}>
                          {(m.engagement_rate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Full Metrics Table */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart2 size={14} className="text-blue-500" /> Métricas Detalhadas
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      {['Data', 'Tipo', 'Descrição', 'Dur.', 'Impr.', 'Alcance', 'Curt.', 'Comp.', 'Salv.', 'Seg.', 'Com.', 'ER'].map(h => (
                        <th key={h} className="text-left py-2 px-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)).map(m => (
                      <tr key={m.id} className="border-b border-gray-100 hover:bg-orange-50/30 group">
                        <td className="py-2 px-2 text-gray-500 whitespace-nowrap">{fmtDate(m.date)}</td>
                        <td className="py-2 px-2"><PostTypeBadge type={m.post_type} /></td>
                        <td className="py-2 px-2 max-w-[180px]">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600 truncate" title={m.description}>{(m.description || '—').slice(0, 40)}{(m.description || '').length > 40 ? '…' : ''}</span>
                            {m.link && (
                              <a href={m.link} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 text-blue-400 shrink-0">
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-gray-400">{m.duration_sec ? `${m.duration_sec}s` : '—'}</td>
                        <td className="py-2 px-2 text-gray-700">{fmtNumber(m.impressions)}</td>
                        <td className="py-2 px-2 text-gray-500">{fmtNumber(m.reach)}</td>
                        <td className="py-2 px-2 text-gray-500">{fmtNumber(m.likes)}</td>
                        <td className="py-2 px-2 text-gray-500">{fmtNumber(m.shares)}</td>
                        <td className="py-2 px-2 text-gray-500">{fmtNumber(m.saves)}</td>
                        <td className="py-2 px-2 text-gray-500">{fmtNumber(m.follows)}</td>
                        <td className="py-2 px-2 text-gray-500">{fmtNumber(m.comments)}</td>
                        <td className="py-2 px-2">
                          <span className={`font-semibold ${m.engagement_rate > 0.04 ? 'text-emerald-600' : m.engagement_rate > 0.02 ? 'text-amber-600' : 'text-gray-400'}`}>
                            {(m.engagement_rate * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insights */}
            {report.insights?.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-500" /> Insights
                </h3>
                <div className="space-y-3">
                  {report.insights.map((ins, i) => (
                    <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2.5">
                      <h4 className="text-xs font-semibold text-gray-900">{ins.title}</h4>
                      <div className="flex gap-2.5">
                        <div className="w-1 rounded-full bg-gray-300 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-gray-400 mb-0.5">Observação</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{ins.observation}</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="w-1 rounded-full bg-blue-300 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-blue-500 mb-0.5">Interpretação</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{ins.interpretation}</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="w-1 rounded-full bg-orange-400 shrink-0" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-orange-500 mb-0.5">Ação Recomendada</p>
                          <p className="text-xs text-gray-900 font-medium leading-relaxed">{ins.action}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations?.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <ChevronRight size={14} className="text-blue-500" /> Recomendações
                </h3>
                <div className="space-y-2">
                  {report.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex flex-col gap-1 shrink-0 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${priorityColors[r.priority] || priorityColors.medium}`}>
                          {r.priority === 'high' ? 'Alta' : r.priority === 'low' ? 'Baixa' : 'Média'}
                        </span>
                        {r.timeline && (
                          <span className="text-[8px] text-gray-400 flex items-center gap-0.5">
                            <Clock size={8} /> {r.timeline}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{r.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Suggestions */}
            {report.content_suggestions?.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-violet-500" /> Sugestões de Conteúdo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {report.content_suggestions.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                      <p className="text-xs font-semibold text-gray-900 mb-1">{c.title}</p>
                      <span className="text-[10px] font-medium text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded capitalize">{c.format}</span>
                      <p className="text-[11px] text-gray-500 mt-2">{c.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center py-4 border-t border-gray-100">
              <p className="text-[10px] text-gray-300">Relatório gerado por Content Intelligence OS · {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
