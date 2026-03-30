import { useState, useRef } from 'react'
import {
  Download, FileText, Calendar, User, Loader2, Sparkles,
  TrendingUp, Eye, Heart, Share2, Bookmark, Trophy,
  AlertCircle, Printer, ChevronRight, BarChart2,
  CheckCircle, ArrowUpRight, ArrowDownRight, Minus,
  Hash, X, Filter, Upload, Key, Check,
} from 'lucide-react'
import Papa from 'papaparse'
import useStore from '../../store/useStore'
import { enrichMetric } from '../../utils/analytics'

function buildReportPrompt(data) {
  const { enriched, clientName, periodLabel, totalImpressions, avgER, totalEngagement, top5, bottom3, formatBreakdown } = data
  return `Você é um consultor de conteúdo digital gerando um relatório para um cliente.

DADOS DO PERÍODO (${periodLabel}):
- Cliente/Projeto: ${clientName || 'Criador'}
- Posts analisados: ${enriched.length}
- Impressões totais: ${totalImpressions.toLocaleString()}
- Engajamento total: ${totalEngagement.toLocaleString()}
- Taxa de engajamento média: ${avgER}%

TOP 5 POSTS:
${top5.map((m, i) => `${i + 1}. [${m.post_type || '?'}] "${(m.description || '').slice(0, 60)}" — ER: ${(m.engagement_rate * 100).toFixed(2)}%, Impressões: ${m.impressions}`).join('\n')}

${bottom3.length > 0 ? `POSTS COM MENOR DESEMPENHO:
${bottom3.map((m, i) => `${i + 1}. [${m.post_type || '?'}] "${(m.description || '').slice(0, 60)}" — ER: ${(m.engagement_rate * 100).toFixed(2)}%`).join('\n')}` : ''}

POR FORMATO:
${formatBreakdown}

Gere um relatório executivo com:
1. executive_summary: 2-3 frases resumindo o período (direto, sem enrolação)
2. highlights: array de 3-4 destaques positivos do período (cada um com title e description curta)
3. concerns: array de 1-3 pontos de atenção (cada um com title e description curta)
4. recommendations: array de 3-5 recomendações práticas para o próximo período (cada uma com title, description, priority: high/medium/low)
5. next_content: array de 3 sugestões de conteúdo baseadas nos dados (cada uma com title, format, reason)

Responda EXCLUSIVAMENTE com JSON válido:
{
  "executive_summary": "...",
  "highlights": [{"title": "...", "description": "..."}],
  "concerns": [{"title": "...", "description": "..."}],
  "recommendations": [{"title": "...", "description": "...", "priority": "high|medium|low"}],
  "next_content": [{"title": "...", "format": "...", "reason": "..."}]
}`
}

function ReportPreview({ report, clientName, periodLabel, metrics, enriched }) {
  const totalImpressions = enriched.reduce((s, m) => s + m.impressions, 0)
  const totalEngagement = enriched.reduce((s, m) => s + m.engagement, 0)
  const avgER = enriched.length ? (enriched.reduce((s, m) => s + m.engagement_rate, 0) / enriched.length * 100).toFixed(2) : '0.00'
  const totalShares = enriched.reduce((s, m) => s + (m.shares || 0), 0)
  const totalSaves = enriched.reduce((s, m) => s + (m.saves || 0), 0)
  const top5 = [...enriched].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 5)

  // Trend
  const sorted = [...enriched].sort((a, b) => new Date(a.date) - new Date(b.date))
  const half = Math.floor(sorted.length / 2)
  const firstHalf = half > 0 ? sorted.slice(0, half).reduce((s, m) => s + m.engagement_rate, 0) / half * 100 : 0
  const secondHalf = sorted.length - half > 0 ? sorted.slice(half).reduce((s, m) => s + m.engagement_rate, 0) / (sorted.length - half) * 100 : 0
  const trendDir = secondHalf > firstHalf * 1.05 ? 'up' : secondHalf < firstHalf * 0.95 ? 'down' : 'stable'

  const fmtDate = (d) => {
    if (!d) return '—'
    try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  return (
    <div id="report-content" className="space-y-6 print:space-y-4">
      {/* Report Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white print:bg-gray-900 print:rounded-none">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Relatório de Performance</p>
            <h1 className="text-xl font-bold mb-1">{clientName || 'Relatório de Conteúdo'}</h1>
            <p className="text-sm text-gray-300">{periodLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Gerado em</p>
            <p className="text-sm text-gray-200">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Posts', value: enriched.length, icon: FileText, color: 'orange' },
          { label: 'Impressões', value: totalImpressions.toLocaleString(), icon: Eye, color: 'blue' },
          { label: 'Engajamento', value: totalEngagement.toLocaleString(), icon: Heart, color: 'pink' },
          { label: 'Taxa Eng.', value: `${avgER}%`, icon: TrendingUp, color: 'emerald' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 text-center">
            <Icon size={16} className={`mx-auto mb-1.5 text-${color}-500`} />
            <p className="text-lg font-bold text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-sm font-bold text-gray-900">{totalShares.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">Compartilhamentos</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-sm font-bold text-gray-900">{totalSaves.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">Salvamentos</p>
        </div>
        <div className="card p-3 text-center flex items-center justify-center gap-2">
          {trendDir === 'up' && <ArrowUpRight size={14} className="text-emerald-500" />}
          {trendDir === 'down' && <ArrowDownRight size={14} className="text-red-500" />}
          {trendDir === 'stable' && <Minus size={14} className="text-gray-400" />}
          <div>
            <p className="text-sm font-bold text-gray-900">{trendDir === 'up' ? 'Crescendo' : trendDir === 'down' ? 'Caindo' : 'Estável'}</p>
            <p className="text-[10px] text-gray-400">Tendência</p>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="card p-5 border-orange-200 bg-orange-50/50">
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FileText size={14} className="text-orange-500" /> Resumo Executivo
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">{report.executive_summary}</p>
      </div>

      {/* Highlights + Concerns side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Highlights */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-500" /> Destaques do Período
          </h3>
          <div className="space-y-3">
            {report.highlights?.map((h, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-1 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">{h.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{h.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Concerns */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-500" /> Pontos de Atenção
          </h3>
          <div className="space-y-3">
            {report.concerns?.map((c, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-1 rounded-full bg-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Posts */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Trophy size={14} className="text-orange-500" /> Top Posts do Período
        </h3>
        <div className="space-y-2">
          {top5.map((m, i) => {
            const erColor = m.engagement_rate > 0.04 ? 'text-emerald-600 bg-emerald-50' : m.engagement_rate > 0.02 ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-50'
            return (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs font-bold text-gray-300 w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 truncate">{m.description || 'Sem descrição'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400">{fmtDate(m.date)}</span>
                    {m.post_type && <span className="text-[10px] text-gray-400 capitalize">{m.post_type}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500">{m.impressions.toLocaleString()} imp.</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${erColor}`}>
                    {(m.engagement_rate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <ChevronRight size={14} className="text-blue-500" /> Recomendações
        </h3>
        <div className="space-y-3">
          {report.recommendations?.map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${priorityColors[r.priority] || priorityColors.medium}`}>
                {r.priority === 'high' ? 'Alta' : r.priority === 'low' ? 'Baixa' : 'Média'}
              </span>
              <div>
                <p className="text-xs font-semibold text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Content */}
      {report.next_content?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-purple-500" /> Sugestões de Conteúdo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {report.next_content.map((c, i) => (
              <div key={i} className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                <p className="text-xs font-semibold text-gray-900 mb-1">{c.title}</p>
                <span className="text-[10px] font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded capitalize">{c.format}</span>
                <p className="text-[11px] text-gray-500 mt-2">{c.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 border-t border-gray-100">
        <p className="text-[10px] text-gray-300">Relatório gerado por Content Intelligence OS</p>
      </div>
    </div>
  )
}

// ── CSV normalizer (same logic as MetricsForm) ──
const stripAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const COL_MAP = {
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
const normalizeDate = (raw = '') => {
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
const normalizeRow = (raw) => {
  const row = {}
  for (const [key, val] of Object.entries(raw)) {
    const clean = stripAccents(key.toLowerCase().trim())
    const mapped = COL_MAP[clean] || COL_MAP[key.toLowerCase().trim()]
    if (!mapped) continue
    // Don't let "Data" = "Total" overwrite a good date from "Horário de publicação"
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

export default function ReportBuilder() {
  const metrics = useStore((s) => s.metrics)
  const addMetric = useStore((s) => s.addMetric)
  const clients = useStore((s) => s.clients)
  const enriched = metrics.map(enrichMetric)
  const csvRef = useRef(null)

  const [clientName, setClientName] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('cio-anthropic-key') || '')
  const [showKeyInput, setShowKeyInput] = useState(false)

  // Extrair hashtags e @ menções das descrições
  const { allHashtags, allMentions } = (() => {
    const tagCount = {}
    const mentionCount = {}
    enriched.forEach(m => {
      const desc = m.description || ''
      // Hashtags
      const tags = desc.match(/#[\w\u00C0-\u024Façãõéêíóôú]+/gi) || []
      tags.forEach(t => {
        const lower = t.toLowerCase()
        tagCount[lower] = (tagCount[lower] || 0) + 1
      })
      // @ menções
      const mentions = desc.match(/@[\w._]+/gi) || []
      mentions.forEach(m2 => {
        const lower = m2.toLowerCase()
        mentionCount[lower] = (mentionCount[lower] || 0) + 1
      })
    })
    return {
      allHashtags: Object.entries(tagCount)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([tag, count]) => ({ tag, count })),
      allMentions: Object.entries(mentionCount)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([mention, count]) => ({ mention, count })),
    }
  })()

  // Extrair clientes únicos do campo client
  const allClients = (() => {
    const clientCount = {}
    enriched.forEach(m => {
      const c = (m.client || '').trim()
      if (c) clientCount[c] = (clientCount[c] || 0) + 1
    })
    return Object.entries(clientCount)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }))
  })()

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const filtered = enriched.filter(m => {
    if (dateFrom && m.date < dateFrom) return false
    if (dateTo && m.date > dateTo) return false
    // Filtrar por cliente digitado
    if (clientName.trim()) {
      const search = clientName.trim().toLowerCase()
      const matchClient = (m.client || '').toLowerCase().includes(search)
      const matchDesc = (m.description || '').toLowerCase().includes(search)
      const matchTag = (m.description || '').toLowerCase().includes('#' + search)
      if (!matchClient && !matchDesc && !matchTag) return false
    }
    // Filtrar por hashtags selecionadas
    if (selectedTags.length > 0) {
      const desc = (m.description || '').toLowerCase()
      const hasAny = selectedTags.some(tag => desc.includes(tag))
      if (!hasAny) return false
    }
    return true
  })

  const canGenerate = filtered.length >= 2

  const periodLabel = (() => {
    if (dateFrom && dateTo) return `${dateFrom} a ${dateTo}`
    if (dateFrom) return `A partir de ${dateFrom}`
    if (dateTo) return `Até ${dateTo}`
    return 'Todo o período'
  })()

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      if (!apiKey) throw new Error('Configure sua API key clicando no ícone de chave acima.')

      const totalImpressions = filtered.reduce((s, m) => s + m.impressions, 0)
      const totalEngagement = filtered.reduce((s, m) => s + m.engagement, 0)
      const avgER = filtered.length ? (filtered.reduce((s, m) => s + m.engagement_rate, 0) / filtered.length * 100).toFixed(2) : '0.00'
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
        `- ${type}: ${d.count} posts, ER médio: ${(d.er_sum / d.count * 100).toFixed(2)}%`
      ).join('\n')

      const prompt = buildReportPrompt({
        enriched: filtered, clientName, periodLabel,
        totalImpressions, avgER, totalEngagement,
        top5, bottom3, formatBreakdown,
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

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-5">
      {/* Config panel */}
      {!report && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-orange-500" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">Gerador de Relatório</h3>
                <p className="text-xs text-gray-400">Crie relatórios visuais prontos para compartilhar com clientes ou equipe</p>
              </div>
            </div>
            <div>
              <input type="file" ref={csvRef} accept=".csv" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  Papa.parse(file, {
                    header: true, skipEmptyLines: true,
                    complete: ({ data }) => {
                      const rows = data.map(normalizeRow).filter(r => r.date || r.impressions > 0)
                      rows.forEach(row => addMetric(row))
                    },
                  })
                  e.target.value = ''
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className={`p-2 rounded-xl border transition-colors ${apiKey ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-red-200 bg-red-50 text-red-500'}`}
                  title={apiKey ? 'API Key configurada' : 'Configurar API Key'}
                >
                  <Key size={14} />
                </button>
                <button
                  onClick={() => csvRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
                >
                  <Upload size={14} /> Importar CSV
                </button>
              </div>
            </div>
            {showKeyInput && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <Key size={14} className="text-gray-400 shrink-0" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-300"
                />
                <button
                  onClick={() => {
                    localStorage.setItem('cio-anthropic-key', apiKey)
                    setShowKeyInput(false)
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                >
                  <Check size={12} /> Salvar
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="label">Cliente / Projeto (filtra por nome, descrição ou hashtag)</label>
              <div className="relative">
                <input
                  type="text"
                  className="input"
                  placeholder="Digite nome do cliente, hashtag ou palavra-chave..."
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
                {clientName && (
                  <button
                    onClick={() => setClientName('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="label">Período Rápido</label>
              <div className="flex gap-1.5">
                {[
                  { label: '28d', days: 28 },
                  { label: '60d', days: 60 },
                  { label: '90d', days: 90 },
                ].map(({ label, days }) => {
                  const to = new Date()
                  const from = new Date()
                  from.setDate(from.getDate() - days)
                  const fromStr = from.toISOString().slice(0, 10)
                  const toStr = to.toISOString().slice(0, 10)
                  const isActive = dateFrom === fromStr && dateTo === toStr
                  return (
                    <button
                      key={days}
                      onClick={() => {
                        if (isActive) { setDateFrom(''); setDateTo('') }
                        else { setDateFrom(fromStr); setDateTo(toStr) }
                      }}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                        isActive
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="label">Data Inicial</label>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Data Final</label>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 w-full text-center">
                <p className="text-lg font-bold text-orange-600">{filtered.length}</p>
                <p className="text-[10px] text-gray-400">Posts no período</p>
              </div>
            </div>
          </div>

          {/* @ Menções detectadas (marcas/clientes) */}
          {allMentions.length > 0 && (
            <div className="space-y-2">
              <label className="label flex items-center gap-1.5">
                <User size={12} className="text-blue-500" />
                Marcações detectadas — clique para filtrar
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl bg-gray-50 border border-gray-100">
                {allMentions.map(({ mention, count }) => (
                  <button
                    key={mention}
                    onClick={() => toggleTag(mention)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition-all ${
                      selectedTags.includes(mention)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {mention} <span className="opacity-60">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hashtags detectadas */}
          {allHashtags.length > 0 && (
            <div className="space-y-2">
              <label className="label flex items-center gap-1.5">
                <Hash size={12} className="text-orange-500" />
                Hashtags detectadas — clique para filtrar
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl bg-gray-50 border border-gray-100">
                {allHashtags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {tag} <span className="opacity-60">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtros ativos */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Filtros ativos:</span>
              {selectedTags.map(tag => (
                <span key={tag} className={`text-[11px] px-2 py-1 rounded-full flex items-center gap-1 ${
                  tag.startsWith('@') ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {tag}
                  <button onClick={() => toggleTag(tag)} className="hover:opacity-60"><X size={10} /></button>
                </span>
              ))}
              <button
                onClick={() => setSelectedTags([])}
                className="text-[10px] text-gray-400 hover:text-gray-600 underline"
              >
                Limpar todos
              </button>
            </div>
          )}

          {/* Clientes cadastrados (de Publicidade) */}
          {clients.length > 0 && (
            <div className="space-y-2">
              <label className="label flex items-center gap-1.5">
                <User size={12} className="text-blue-500" />
                Seus Clientes (cadastrados em Publicidade)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[...clients].sort((a, b) => a.name.localeCompare(b.name)).map(c => {
                  const isActive = clientName.trim().toLowerCase() === c.name.toLowerCase()
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setClientName(isActive ? '' : c.name)
                        // Também ativa as hashtags associadas ao cliente
                        if (!isActive && c.hashtags) {
                          const tags = c.hashtags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
                          setSelectedTags(tags)
                        } else {
                          setSelectedTags([])
                        }
                      }}
                      className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: c.color || '#3b82f6' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Clientes do campo client dos dados */}
          {allClients.length > 0 && (
            <div className="space-y-2">
              <label className="label flex items-center gap-1.5">
                <User size={12} className="text-emerald-500" />
                Clientes (detectados nos dados)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allClients.map(({ name, count }) => (
                  <button
                    key={name}
                    onClick={() => setClientName(name)}
                    className={`text-[11px] px-2 py-1 rounded-full border transition-all ${
                      clientName.trim().toLowerCase() === name.toLowerCase()
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    {name} <span className="opacity-60">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dica se não tem hashtags nem menções */}
          {allHashtags.length === 0 && allMentions.length === 0 && allClients.length === 0 && enriched.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Nenhuma hashtag, menção ou cliente detectado</p>
                <p className="text-amber-600 mt-0.5">Certifique-se de que seus dados CSV incluem a coluna de descrição/legenda com hashtags e @menções.</p>
              </div>
            </div>
          )}

          {enriched.length === 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p>Nenhum dado importado. Use o botão <strong>"Importar CSV"</strong> acima para subir seus dados do Instagram/Meta.</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="btn-primary"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Gerando relatório...</>
              ) : (
                <><Sparkles size={14} /> Gerar Relatório com IA</>
              )}
            </button>
            {!canGenerate && (
              <span className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle size={12} /> Mínimo 2 posts no período selecionado
              </span>
            )}
            {selectedTags.length > 0 && (
              <span className="text-xs text-orange-500 flex items-center gap-1">
                <Filter size={12} /> {selectedTags.length} filtro(s) ativo(s)
              </span>
            )}
          </div>
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
            <p className="text-sm font-medium text-gray-800">Gerando relatório executivo...</p>
            <p className="text-xs text-gray-400 mt-1">Analisando {filtered.length} posts e formulando recomendações</p>
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <>
          {/* Actions bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
            <button
              onClick={() => setReport(null)}
              className="btn-secondary text-xs"
            >
              Novo Relatório
            </button>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
                <Printer size={14} /> Imprimir / PDF
              </button>
            </div>
          </div>

          <ReportPreview
            report={report}
            clientName={clientName}
            periodLabel={periodLabel}
            metrics={filtered}
            enriched={filtered}
          />
        </>
      )}
    </div>
  )
}
