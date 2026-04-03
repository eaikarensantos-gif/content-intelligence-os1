// Build cache buster: 2026-04-02T13:57:00Z
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import {
  Plus, TrendingUp, Eye, Heart, Share2, Bookmark, MousePointer,
  Trophy, Trash2, Download, AlertTriangle, ExternalLink, Film,
  Image, Play, Layers, ChevronUp, ChevronDown, ChevronsUpDown,
  UserPlus, Zap, Target, Copy, Wand2, ArrowUpRight, ArrowDownRight,
  Minus, Crown, AlertCircle, CheckCircle, Search, Filter, X, Upload, RefreshCw,
  MessageSquare, FileText, Calendar, Printer, ClipboardCopy, BarChart2,
} from 'lucide-react'
import useStore from '../../store/useStore'
import MetricsForm from './MetricsForm'
import AIInsights from './AIInsights'
import WeeklyPlanner from './WeeklyPlanner'
import { enrichMetric, timelineData, aggregateByFormat, aggregateByPlatform, topPosts } from '../../utils/analytics'
import { normalizeRow, parseFile, isLinkedinFile, normalizeLinkedinRow } from '../../utils/csvNormalizer'
import { PlatformBadge, FormatBadge } from '../common/Badge'

const COLORS = ['#f97316', '#fb923c', '#2563eb', '#0891b2', '#059669', '#d97706']

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="text-gray-900 font-semibold">
            {p.dataKey === 'engagement_rate' ? `${p.value}%` : Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, color = 'orange', sub, trend }) {
  const c = { orange: 'text-orange-500', blue: 'text-blue-500', emerald: 'text-emerald-600', amber: 'text-amber-500', pink: 'text-pink-500', sky: 'text-sky-500' }
  const bg = { orange: 'bg-orange-100', blue: 'bg-blue-100', emerald: 'bg-emerald-100', amber: 'bg-amber-100', pink: 'bg-pink-100', sky: 'bg-sky-100' }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${bg[color]} ${c[color]}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-gray-900">{value}</p>
          {trend && (
            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${
              trend.dir === 'up' ? 'text-emerald-600' : trend.dir === 'down' ? 'text-red-500' : 'text-gray-400'
            }`}>
              {trend.dir === 'up' && <ArrowUpRight size={10} />}
              {trend.dir === 'down' && <ArrowDownRight size={10} />}
              {trend.dir === 'stable' && <Minus size={10} />}
              {trend.pct > 0 && `${trend.pct}%`}
            </span>
          )}
        </div>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

const POST_TYPE_STYLES = {
  story:    'bg-purple-100 text-purple-700 border-purple-200',
  reel:     'bg-pink-100 text-pink-700 border-pink-200',
  carousel: 'bg-orange-100 text-orange-700 border-orange-200',
  image:    'bg-sky-100 text-sky-700 border-sky-200',
  video:    'bg-blue-100 text-blue-700 border-blue-200',
  artigo:   'bg-emerald-100 text-emerald-700 border-emerald-200',
}
const POST_TYPE_ICONS = { story: Film, reel: Play, carousel: Layers, image: Image, video: Play, artigo: FileText }
function PostTypeBadge({ type }) {
  if (!type) return null
  const style = POST_TYPE_STYLES[type] || 'bg-gray-100 text-gray-500 border-gray-200'
  const Icon = POST_TYPE_ICONS[type]
  const labels = { story: 'Story', reel: 'Reel', carousel: 'Carrossel', image: 'Imagem', video: 'Vídeo', artigo: 'Artigo' }
  return (
    <span className={`chip border text-[10px] inline-flex items-center gap-1 capitalize ${style}`}>
      {Icon && <Icon size={9} />}
      {labels[type] || type}
    </span>
  )
}

// ── Performance classification ──────────────────────────────────────────────
function classifyPerformance(enriched) {
  if (enriched.length === 0) return { top: [], good: [], low: [], thresholds: {} }

  const rates = enriched.map(m => m.engagement_rate).sort((a, b) => a - b)
  const p75 = rates[Math.floor(rates.length * 0.75)] || 0
  const p25 = rates[Math.floor(rates.length * 0.25)] || 0
  const avgShares = enriched.reduce((s, m) => s + (m.shares || 0), 0) / enriched.length
  const avgSaves = enriched.reduce((s, m) => s + (m.saves || 0), 0) / enriched.length

  const classify = (m) => {
    if (m.engagement_rate >= p75) return 'top'
    if (m.engagement_rate <= p25) return 'low'
    return 'good'
  }

  const getPerformanceTags = (m) => {
    const tags = []
    if (m.engagement_rate >= p75) tags.push({ label: 'Alto Engajamento', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' })
    if (m.engagement_rate <= p25) tags.push({ label: 'Baixo Engajamento', color: 'bg-red-100 text-red-600 border-red-200' })
    if ((m.shares || 0) > avgShares * 1.5 && m.shares > 0) tags.push({ label: 'Viral', color: 'bg-blue-100 text-blue-700 border-blue-200' })
    if ((m.saves || 0) > avgSaves * 1.5 && m.saves > 0) tags.push({ label: 'Referência', color: 'bg-purple-100 text-purple-700 border-purple-200' })
    if (m.impressions > enriched.reduce((s, x) => s + x.impressions, 0) / enriched.length * 1.5)
      tags.push({ label: 'Alto Alcance', color: 'bg-orange-100 text-orange-700 border-orange-200' })
    return tags
  }

  const categorized = enriched.map(m => ({
    ...m,
    performance: classify(m),
    performanceTags: getPerformanceTags(m),
  }))

  return {
    top: categorized.filter(m => m.performance === 'top').sort((a, b) => b.engagement_rate - a.engagement_rate),
    good: categorized.filter(m => m.performance === 'good').sort((a, b) => b.engagement_rate - a.engagement_rate),
    low: categorized.filter(m => m.performance === 'low').sort((a, b) => b.engagement_rate - a.engagement_rate),
    all: categorized,
    thresholds: { p75, p25, avgShares, avgSaves },
  }
}

const TABS = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'posts', label: 'Posts' },
  { id: 'publi', label: 'Publi' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'insights', label: 'Insights IA' },
  { id: 'planner', label: 'Próxima Semana' },
]

const PUBLI_SIGNALS = ['#publi', '#ad', '#parceria', '#publicidade', '#sponsored', '#parceiro']

function detectBrand(description = '') {
  const mentions = description.match(/@[\w._]+/gi) || []
  return mentions.map(m => m.replace('@', '')).join(', ') || '—'
}

// ── Post Card for the new Posts tab ─────────────────────────────────────────
function PostCard({ m, onDelete, onTemplate, onGenerate }) {
  const erColor = m.engagement_rate > 0.04 ? 'bg-emerald-500' : m.engagement_rate > 0.02 ? 'bg-amber-400' : 'bg-gray-300'
  const erTextColor = m.engagement_rate > 0.04 ? 'text-emerald-600' : m.engagement_rate > 0.02 ? 'text-amber-600' : 'text-gray-400'
  const erBg = m.engagement_rate > 0.04 ? 'bg-emerald-50' : m.engagement_rate > 0.02 ? 'bg-amber-50' : 'bg-gray-50'

  const fmtDate = (d, time) => {
    if (!d) return '—'
    try {
      const dateStr = new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      return time ? `${dateStr} ${time}` : dateStr
    }
    catch { return d }
  }

  return (
    <div className="card p-4 group relative hover:shadow-md transition-all duration-150 overflow-hidden">
      {/* Left engagement bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${erColor}`} />
      <div className="pl-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PostTypeBadge type={m.post_type} />
            <PlatformBadge platform={m.platform} />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {m.link && (
              <a href={m.link} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-600 p-1 rounded transition-colors" title="Abrir post"
                onClick={(e) => e.stopPropagation()}>
                <ExternalLink size={12} />
              </a>
            )}
            <button onClick={() => onDelete(m.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all" title="Excluir">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Performance tags */}
        {m.performanceTags?.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-1.5">
            {m.performanceTags.map((tag, i) => (
              <span key={i} className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${tag.color}`}>
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {/* Date + Time */}
        <p className="text-[11px] text-gray-400 mb-2">
          {fmtDate(m.date, m.publish_time)}
          {m.duration_sec > 0 && <span className="ml-2 text-gray-300">· {m.duration_sec}s</span>}
        </p>

        {/* Description */}
        <p className="text-xs text-gray-700 line-clamp-2 mb-3 min-h-[2rem]">
          {m.description || <span className="text-gray-300 italic">Sem descrição</span>}
        </p>

        {/* Main stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div className="bg-orange-50 rounded-lg p-2 text-center">
            <p className="text-xs font-bold text-orange-600 leading-none">{m.impressions.toLocaleString()}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Impressões</p>
          </div>
          <div className="bg-pink-50 rounded-lg p-2 text-center">
            <p className="text-xs font-bold text-pink-600 leading-none">{(m.likes || 0).toLocaleString()}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Curtidas</p>
          </div>
          <div className={`${erBg} rounded-lg p-2 text-center`}>
            <p className={`text-xs font-bold leading-none ${erTextColor}`}>{(m.engagement_rate * 100).toFixed(1)}%</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Eng. Rate</p>
          </div>
        </div>

        {/* Secondary stats */}
        {(m.shares > 0 || m.saves > 0 || m.comments > 0 || m.reach > 0 || m.follows > 0) && (
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400 flex-wrap mb-2.5">
            {m.reach > 0 && <span className="flex items-center gap-0.5"><Eye size={9} />{m.reach.toLocaleString()}</span>}
            {m.comments > 0 && <span className="flex items-center gap-0.5"><MousePointer size={9} />{m.comments}</span>}
            {m.shares > 0 && <span className="flex items-center gap-0.5"><Share2 size={9} />{m.shares}</span>}
            {m.saves > 0 && <span className="flex items-center gap-0.5"><Bookmark size={9} />{m.saves}</span>}
            {m.follows > 0 && <span className="flex items-center gap-0.5"><UserPlus size={9} />{m.follows}</span>}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5 pt-2 border-t border-gray-100">
          <button
            onClick={() => onTemplate(m)}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium text-gray-500 hover:text-orange-700 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-lg py-1.5 transition-all"
          >
            <Copy size={10} /> Template
          </button>
          <button
            onClick={() => onGenerate(m)}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium text-gray-500 hover:text-blue-700 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg py-1.5 transition-all"
          >
            <Wand2 size={10} /> Gerar Similar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Performance Zone Header ─────────────────────────────────────────────────
function ZoneHeader({ icon: Icon, title, count, color, description, collapsed, onToggle }) {
  const colors = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
    red:     { bg: 'bg-red-50',     border: 'border-red-200',     icon: 'text-red-500',     badge: 'bg-red-100 text-red-600' },
  }
  const c = colors[color] || colors.amber

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${c.bg} ${c.border} hover:shadow-sm`}
    >
      <Icon size={18} className={c.icon} />
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{count}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>
      </div>
      {collapsed ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
    </button>
  )
}

export default function Analytics() {
  const metrics = useStore((s) => s.metrics)
  const posts = useStore((s) => s.posts)
  const clients = useStore((s) => s.clients) || []
  const addMetric = useStore((s) => s.addMetric)
  const updateMetric = useStore((s) => s.updateMetric)
  const deleteMetric = useStore((s) => s.deleteMetric)
  const addIdea = useStore((s) => s.addIdea)
  const clearMetrics = useStore((s) => s.clearMetrics)
  const navigate = useNavigate()
  const csvRef = useRef(null)
  const linkedinRef = useRef(null) // LinkedIn CSV file input reference

  const [confirmClear, setConfirmClear] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [tab, setTab] = useState('visao-geral')
  const [filterPostType, setFilterPostType] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  // Posts tab state
  const [postTabSearch, setPostTabSearch] = useState('')
  const [postTabPlatform, setPostTabPlatform] = useState('')
  const [postTabType, setPostTabType] = useState('')
  const [postTabDateFrom, setPostTabDateFrom] = useState('')
  const [postTabDateTo, setPostTabDateTo] = useState('')
  const [postTabClient, setPostTabClient] = useState('')
  const [postTabSort, setPostTabSort] = useState('date')
  const [collapsedZones, setCollapsedZones] = useState({})
  const [savedTemplates, setSavedTemplates] = useState({})

  // Publi tab state - analytics dashboard
  const [publiMonth, setPubliMonth] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  })
  const [publiClient, setPubliClient] = useState('')
  const [publiReport, setPubliReport] = useState(null)
  const [publiLoading, setPubliLoading] = useState(false)
  const [publiError, setPubliError] = useState(null)
  const [publiClientReport, setPubliClientReport] = useState(null)
  const [publiClientLoading, setPubliClientLoading] = useState(false)
  const [publiWhatsapp, setPubliWhatsapp] = useState('')
  const [publiNotes, setPubliNotes] = useState('')
  const [publiSearch, setPubliSearch] = useState('')
  const [publiUnifiedLoading, setPubliUnifiedLoading] = useState(false)
  const [publiUnifiedReport, setPubliUnifiedReport] = useState(null)
  const [rawDataSearch, setRawDataSearch] = useState('')

  // LinkedIn tab state
  const [linkedinData, setLinkedinData] = useState(null)
  const [linkedinMonth, setLinkedinMonth] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  })
  const [linkedinLoading, setLinkedinLoading] = useState(false)
  const [linkedinError, setLinkedinError] = useState(null)

  const enriched = metrics.map(enrichMetric)
  const timeline = timelineData(metrics)
  const byFormat = aggregateByFormat(posts, metrics)
  const byPlatform = aggregateByPlatform(posts, metrics)
  const top = topPosts(posts, metrics, 5)

  const totalImpressions = enriched.reduce((s, m) => s + m.impressions, 0)
  const totalEngagement = enriched.reduce((s, m) => s + m.engagement, 0)
  const avgER = enriched.length ? (enriched.reduce((s, m) => s + m.engagement_rate, 0) / enriched.length * 100).toFixed(2) : '0.00'
  const totalAuthority = enriched.reduce((s, m) => s + m.authority_score, 0)
  const totalShares = enriched.reduce((s, m) => s + (m.shares || 0), 0)
  const totalSaves = enriched.reduce((s, m) => s + (m.saves || 0), 0)
  const totalFollows = enriched.reduce((s, m) => s + (m.follows || 0), 0)

  const formatChartData = byFormat.map((d) => ({
    name: d.format,
    impressions: d.impressions,
    'eng. rate %': +(d.avg_engagement_rate * 100).toFixed(2),
  }))

  const platformPieData = byPlatform.map((d) => ({ name: d.platform, value: d.impressions }))

  // ── Post actions ────────────────────────────────────────────────────────────
  const handleSaveTemplate = (m) => {
    addIdea({
      title: `Template: ${(m.description || 'Post').slice(0, 50)}`,
      description: `TEMPLATE baseado em post de alto desempenho (${(m.engagement_rate * 100).toFixed(1)}% eng. rate).\n\nDescrição original: ${m.description || '—'}\nFormato: ${m.post_type || '—'}\nImpressões: ${m.impressions}\nEngajamento: ${m.engagement}\n\nUse esta estrutura como base para novos conteúdos.`,
      status: 'idea',
      platform: m.platform || 'instagram',
      format: m.post_type || '',
      source: 'Analytics Template',
      tags: ['template', 'analytics', m.post_type].filter(Boolean),
    })
    setSavedTemplates(prev => ({ ...prev, [m.id]: true }))
  }

  const handleGenerateSimilar = (m) => {
    // Navigate to idea generator with context
    const engRate = typeof m.engagement_rate === 'number' ? (m.engagement_rate * 100).toFixed(1) : 'N/A'
    const desc = (m.description || m.title || 'post sem descrição').slice(0, 300)
    const context = encodeURIComponent(
      `Gere conteúdo similar a este post de alto desempenho:\n"${desc}"\nFormato: ${m.post_type || 'post'}\nTaxa de engajamento: ${engRate}%`
    )
    navigate(`/generate?context=${context}`)
  }

  // ── Performance trends (split first half vs second half) ────────────────────
  const computeMetricTrend = (getter) => {
    if (enriched.length < 4) return null
    const sorted = [...enriched].sort((a, b) => new Date(a.date) - new Date(b.date))
    const half = Math.floor(sorted.length / 2)
    const firstAvg = sorted.slice(0, half).reduce((s, m) => s + getter(m), 0) / half
    const secondAvg = sorted.slice(half).reduce((s, m) => s + getter(m), 0) / (sorted.length - half)
    if (firstAvg === 0 && secondAvg === 0) return { dir: 'stable', pct: 0 }
    if (firstAvg === 0) return { dir: 'up', pct: 100 }
    const change = (secondAvg - firstAvg) / firstAvg
    if (change > 0.1) return { dir: 'up', pct: Math.round(change * 100) }
    if (change < -0.1) return { dir: 'down', pct: Math.round(Math.abs(change) * 100) }
    return { dir: 'stable', pct: 0 }
  }

  const trendImpressions = computeMetricTrend(m => m.impressions)
  const trendER = computeMetricTrend(m => m.engagement_rate)
  const trendLikes = computeMetricTrend(m => m.likes || 0)
  const trendShares = computeMetricTrend(m => m.shares || 0)
  const trendSaves = computeMetricTrend(m => m.saves || 0)
  const trendFollows = computeMetricTrend(m => m.follows || 0)
  const trendAuthority = computeMetricTrend(m => m.authority_score)

  // Legacy trend for sub text
  const trend = trendER

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-xs py-1.5 px-3 rounded-md font-medium transition-all ${
                tab === t.id ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setFormOpen(true)} className="btn-primary">
          <Plus size={15} /> Adicionar Métricas
        </button>
      </div>

      {/* ===== VISÃO GERAL ===== */}
      {tab === 'visao-geral' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat icon={Eye} label="Impressões" value={totalImpressions.toLocaleString()} color="orange" trend={trendImpressions} />
            <MiniStat
              icon={TrendingUp}
              label="Eng. Médio"
              value={`${avgER}%`}
              color="emerald"
              trend={trendER}
              sub={trend ? `${trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '→'} ${trend.dir === 'up' ? 'Crescendo' : trend.dir === 'down' ? 'Caindo' : 'Estável'}${trend.pct ? ` ${trend.pct}%` : ''}` : null}
            />
            <MiniStat icon={Heart} label="Total Curtidas" value={enriched.reduce((s, m) => s + (m.likes || 0), 0).toLocaleString()} color="pink" trend={trendLikes} />
            <MiniStat icon={Share2} label="Compartilhamentos" value={totalShares.toLocaleString()} color="blue" trend={trendShares} />
            <MiniStat icon={Bookmark} label="Salvamentos" value={totalSaves.toLocaleString()} color="amber" trend={trendSaves} />
            <MiniStat icon={UserPlus} label="Seguimentos" value={totalFollows.toLocaleString()} color="sky" trend={trendFollows} />
            <MiniStat icon={Trophy} label="Score Autoridade" value={totalAuthority.toLocaleString()} color="orange" trend={trendAuthority} />
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Linha do Tempo de Desempenho</h3>
              {timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={timeline}>
                    <defs>
                      <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gEng" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<Tip />} />
                    <Legend iconSize={8} iconType="circle" />
                    <Area yAxisId="l" type="monotone" dataKey="impressions" name="Impressões" stroke="#f97316" fill="url(#gImp)" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
                    <Area yAxisId="r" type="monotone" dataKey="engagement_rate" name="Eng. Rate %" stroke="#10b981" fill="url(#gEng)" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados ainda</div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Impressões por Plataforma</h3>
              {platformPieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={platformPieData} cx="50%" cy="50%" outerRadius={65} innerRadius={40} paddingAngle={3} dataKey="value">
                        {platformPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {platformPieData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="capitalize text-gray-500">{d.name}</span>
                        </div>
                        <span className="text-gray-700 font-medium">{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sem dados</div>
              )}
            </div>
          </div>

          {/* Format chart */}
          {formatChartData.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Desempenho por Formato</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={formatChartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<Tip />} />
                  <Legend iconSize={8} iconType="circle" />
                  <Bar yAxisId="l" dataKey="impressions" name="Impressões" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="r" dataKey="eng. rate %" name="Eng. Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Quick decisions banner — only if enough data */}
          {enriched.length >= 3 && (() => {
            const perf = classifyPerformance(enriched)
            const bestFormat = (() => {
              const fmts = {}
              enriched.forEach(m => {
                const t = m.post_type || 'outro'
                if (!fmts[t]) fmts[t] = { count: 0, er: 0 }
                fmts[t].count++
                fmts[t].er += m.engagement_rate
              })
              return Object.entries(fmts)
                .map(([k, v]) => ({ type: k, avg: v.er / v.count }))
                .sort((a, b) => b.avg - a.avg)[0]
            })()

            return (
              <div className="card p-5 border-orange-200 bg-gradient-to-r from-orange-50 to-white">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Zap size={14} className="text-orange-500" /> Decisões Rápidas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-gray-100">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Melhor formato</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{bestFormat?.type || '—'}</p>
                    <p className="text-[10px] text-gray-400">{bestFormat ? `${(bestFormat.avg * 100).toFixed(1)}% eng. médio` : ''}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-gray-100">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Posts top performance</p>
                    <p className="text-sm font-semibold text-gray-900">{perf.top.length} de {enriched.length}</p>
                    <p className="text-[10px] text-gray-400">acima do percentil 75</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-gray-100">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Tendência</p>
                    <div className="flex items-center gap-1.5">
                      {trend?.dir === 'up' && <ArrowUpRight size={14} className="text-emerald-500" />}
                      {trend?.dir === 'down' && <ArrowDownRight size={14} className="text-red-500" />}
                      {trend?.dir === 'stable' && <Minus size={14} className="text-gray-400" />}
                      <p className="text-sm font-semibold text-gray-900">{trend?.label || 'Insuficiente'}</p>
                    </div>
                    {trend?.pct ? <p className="text-[10px] text-gray-400">{trend.pct}% vs período anterior</p> : null}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Metrics log table */}
          {(() => {
            const SORT_COLS = [
              { key: 'date', label: 'Data', sortable: true },
              { key: 'post_type', label: 'Tipo', sortable: false },
              { key: 'platform', label: 'Plataforma', sortable: false },
              { key: 'client', label: 'Cliente', sortable: false },
              { key: 'description', label: 'Descrição', sortable: false },
              { key: 'impressions', label: 'Impressões', sortable: true },
              { key: 'reach', label: 'Alcance', sortable: true },
              { key: 'likes', label: 'Curtidas', sortable: true },
              { key: 'comments', label: 'Coment.', sortable: true },
              { key: 'shares', label: 'Compart.', sortable: true },
              { key: 'saves', label: 'Salvam.', sortable: true },
              { key: 'follows', label: 'Seguim.', sortable: true },
              { key: 'engagement', label: 'Eng.', sortable: true },
              { key: 'engagement_rate', label: 'Taxa Eng.', sortable: true },
              { key: '_del', label: '', sortable: false },
            ]

            const handleSort = (col) => {
              if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
              else { setSortBy(col); setSortDir('desc') }
            }

            const fmtDate = (d, time) => {
              if (!d) return '—'
              const parts = d.split('-')
              const dateStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d
              return time ? `${dateStr} ${time}` : dateStr
            }

            const SortIcon = ({ col }) => {
              if (!col.sortable) return null
              if (sortBy !== col.key) return <ChevronsUpDown size={10} className="text-gray-300 ml-0.5" />
              return sortDir === 'asc'
                ? <ChevronUp size={10} className="text-orange-500 ml-0.5" />
                : <ChevronDown size={10} className="text-orange-500 ml-0.5" />
            }

            const sorted = [...enriched]
              .filter((m) => {
                // Filter by post type or platform
                if (filterPostType) {
                  if (filterPostType === 'linkedin') {
                    if (m.platform !== 'linkedin') return false
                  } else if (filterPostType === 'story') {
                    if (m.post_type !== 'story') return false
                  } else if (filterPostType === 'feed') {
                    if (m.post_type === 'story' || m.platform === 'linkedin') return false
                  }
                }
                // Filter by search term
                if (rawDataSearch) {
                  const searchLower = rawDataSearch.toLowerCase()
                  const matchDate = m.date && m.date.toLowerCase().includes(searchLower)
                  const matchPlatform = m.platform && m.platform.toLowerCase().includes(searchLower)
                  const matchType = m.post_type && m.post_type.toLowerCase().includes(searchLower)
                  const matchDesc = m.description && m.description.toLowerCase().includes(searchLower)
                  const matchLink = m.link && m.link.toLowerCase().includes(searchLower)
                  const matchClient = m.client && m.client.toLowerCase().includes(searchLower)
                  if (!matchDate && !matchPlatform && !matchType && !matchDesc && !matchLink && !matchClient) return false
                }
                return true
              })
              .sort((a, b) => {
                let va = a[sortBy], vb = b[sortBy]
                if (sortBy === 'date') { va = new Date(va); vb = new Date(vb) }
                else { va = Number(va) || 0; vb = Number(vb) || 0 }
                if (va < vb) return sortDir === 'asc' ? -1 : 1
                if (va > vb) return sortDir === 'asc' ? 1 : -1
                return 0
              })

            const exportRawDataPDF = () => {
              const doc = new jsPDF({ orientation: 'landscape' })
              const pw = doc.internal.pageSize.getWidth()
              const ph = doc.internal.pageSize.getHeight()
              const today = new Date()
              const dateStr = today.toLocaleDateString('pt-BR')
              const timeStr = today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

              // ── Cabeçalho ──
              doc.setFillColor(234, 88, 12)
              doc.rect(0, 0, pw, 24, 'F')
              doc.setFillColor(180, 50, 0)
              doc.rect(0, 20, pw, 4, 'F')

              doc.setFontSize(15)
              doc.setFont(undefined, 'bold')
              doc.setTextColor(255, 255, 255)
              doc.text('Dados Brutos — Relatório de Métricas', 14, 13)

              doc.setFontSize(7.5)
              doc.setFont(undefined, 'normal')
              doc.setTextColor(255, 220, 190)
              doc.text(`Gerado em ${dateStr} às ${timeStr}   •   ${sorted.length} ${sorted.length === 1 ? 'registro' : 'registros'}`, pw - 14, 13, { align: 'right' })

              // ── Cards de resumo ──
              const totalImp = sorted.reduce((s, m) => s + (m.impressions || 0), 0)
              const totalEng = sorted.reduce((s, m) => s + (m.engagement || 0), 0)
              const avgER = sorted.length ? sorted.reduce((s, m) => s + (m.engagement_rate || 0), 0) / sorted.length * 100 : 0
              const totalLikes = sorted.reduce((s, m) => s + (m.likes || 0), 0)
              const totalSavesSum = sorted.reduce((s, m) => s + (m.saves || 0), 0)

              const cards = [
                { label: 'Publicações', value: sorted.length.toString() },
                { label: 'Impressões totais', value: totalImp.toLocaleString('pt-BR') },
                { label: 'Engajamento total', value: totalEng.toLocaleString('pt-BR') },
                { label: 'Taxa de eng. média', value: avgER.toFixed(2) + '%' },
                { label: 'Curtidas totais', value: totalLikes.toLocaleString('pt-BR') },
                { label: 'Salvamentos totais', value: totalSavesSum.toLocaleString('pt-BR') },
              ]

              const cardW = (pw - 28) / cards.length
              const cardY = 28
              const cardH = 16

              cards.forEach((card, i) => {
                const cx = 14 + i * cardW
                doc.setFillColor(255, 248, 243)
                doc.setDrawColor(234, 88, 12)
                doc.setLineWidth(0.15)
                doc.rect(cx, cardY, cardW - 3, cardH, 'FD')
                doc.setFontSize(6.5)
                doc.setFont(undefined, 'normal')
                doc.setTextColor(160, 100, 60)
                doc.text(card.label.toUpperCase(), cx + (cardW - 3) / 2, cardY + 5.5, { align: 'center' })
                doc.setFontSize(10)
                doc.setFont(undefined, 'bold')
                doc.setTextColor(180, 55, 0)
                doc.text(card.value, cx + (cardW - 3) / 2, cardY + 12, { align: 'center' })
              })

              // ── Tabela ──
              const colDefs = [
                { label: 'Data', w: 28, fmt: m => (m.date || '—').replace('T', ' ').slice(0, 16) },
                { label: 'Tipo', w: 16, fmt: m => m.post_type || '—' },
                { label: 'Plataforma', w: 20, fmt: m => m.platform || '—' },
                { label: 'Cliente', w: 24, fmt: m => m.client || '—' },
                { label: 'Descrição', w: 50, fmt: m => ((m.description || '—').length > 38 ? (m.description || '').slice(0, 38) + '…' : (m.description || '—')) },
                { label: 'Impressões', w: 24, fmt: m => (m.impressions || 0).toLocaleString('pt-BR') },
                { label: 'Alcance', w: 20, fmt: m => (m.reach || 0).toLocaleString('pt-BR') },
                { label: 'Curtidas', w: 18, fmt: m => (m.likes || 0).toLocaleString('pt-BR') },
                { label: 'Coment.', w: 16, fmt: m => (m.comments || 0).toString() },
                { label: 'Compart.', w: 17, fmt: m => (m.shares || 0).toString() },
                { label: 'Salvam.', w: 17, fmt: m => (m.saves || 0).toString() },
                { label: 'Engaj.', w: 19, fmt: m => (m.engagement || 0).toLocaleString('pt-BR') },
                { label: 'Taxa Eng.', w: 20, fmt: m => (m.engagement_rate * 100).toFixed(2) + '%', key: 'er' },
              ]

              const headerH = 7
              const rowH = 6
              let y = cardY + cardH + 5

              const drawTableHeader = () => {
                let x = 14
                doc.setFillColor(45, 45, 55)
                doc.rect(14, y, pw - 28, headerH, 'F')
                doc.setFontSize(6.5)
                doc.setFont(undefined, 'bold')
                doc.setTextColor(255, 255, 255)
                colDefs.forEach(col => { doc.text(col.label, x + 2, y + 4.8); x += col.w })
                y += headerH
              }

              drawTableHeader()

              sorted.forEach((m, idx) => {
                if (y > ph - 12) {
                  doc.addPage()
                  y = 14
                  drawTableHeader()
                }

                if (idx % 2 === 0) {
                  doc.setFillColor(250, 250, 252)
                  doc.rect(14, y - 0.5, pw - 28, rowH, 'F')
                }
                if ((m.engagement_rate || 0) > 0.04) {
                  doc.setFillColor(236, 253, 245)
                  doc.rect(14, y - 0.5, pw - 28, rowH, 'F')
                }

                let x = 14
                doc.setFontSize(6.5)
                doc.setFont(undefined, 'normal')
                colDefs.forEach(col => {
                  if (col.key === 'er') {
                    const er = m.engagement_rate || 0
                    doc.setTextColor(er > 0.04 ? 5 : er > 0.02 ? 160 : 130, er > 0.04 ? 150 : er > 0.02 ? 100 : 130, er > 0.04 ? 80 : er > 0.02 ? 0 : 140)
                  } else {
                    doc.setTextColor(50, 50, 60)
                  }
                  doc.text(col.fmt(m), x + 2, y + 3.8)
                  x += col.w
                })
                y += rowH
              })

              // ── Rodapé em todas as páginas ──
              const totalPages = doc.internal.getNumberOfPages()
              for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p)
                doc.setFillColor(248, 248, 250)
                doc.rect(0, ph - 9, pw, 9, 'F')
                doc.setDrawColor(220, 220, 225)
                doc.setLineWidth(0.2)
                doc.line(0, ph - 9, pw, ph - 9)
                doc.setFontSize(6.5)
                doc.setFont(undefined, 'normal')
                doc.setTextColor(150, 150, 160)
                doc.text('Content Intelligence OS', 14, ph - 3.5)
                doc.text(`Página ${p} de ${totalPages}`, pw / 2, ph - 3.5, { align: 'center' })
                doc.text(`Exportado em ${dateStr}`, pw - 14, ph - 3.5, { align: 'right' })
              }

              doc.save(`dados_brutos_${today.toISOString().slice(0, 10)}.pdf`)
            }

            return (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Dados Brutos
                    <span className="ml-2 text-xs text-gray-400 font-normal">{sorted.length} entradas {rawDataSearch ? `(filtrados de ${enriched.length})` : `de ${enriched.length}`}</span>
                  </h3>
                  {enriched.length > 0 && (
                    <div className="flex items-center gap-2">
                      {sorted.length > 0 && (
                        <button
                          onClick={() => {
                            const headers = ['Data', 'Tipo', 'Plataforma', 'Cliente', 'Descrição', 'Impressões', 'Alcance', 'Curtidas', 'Comentários', 'Compartilhamentos', 'Salvamentos', 'Seguimentos', 'Engajamento', 'Taxa Eng.%']
                            const rows = sorted.map(m => [
                              m.date || '',
                              m.post_type || '',
                              m.platform || '',
                              m.client || '',
                              (m.description || '').replace(/"/g, '""'),
                              m.impressions || 0,
                              m.reach || 0,
                              m.likes || 0,
                              m.comments || 0,
                              m.shares || 0,
                              m.saves || 0,
                              m.follows || 0,
                              m.engagement || 0,
                              (m.engagement_rate * 100).toFixed(2),
                            ])
                            const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
                            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `dados_brutos_${new Date().toISOString().slice(0,10)}.csv`
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
                          title={`Exportar ${sorted.length} entradas como CSV`}
                        >
                          <Download size={12} /> Exportar CSV
                        </button>
                      )}
                      {sorted.length > 0 && (
                        <button
                          onClick={exportRawDataPDF}
                          className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                          title={`Exportar ${sorted.length} entradas como PDF`}
                        >
                          <FileText size={12} /> Exportar PDF
                        </button>
                      )}
                      {confirmClear ? (
                        <>
                          <span className="text-xs text-red-500">Apagar tudo?</span>
                          <button onClick={() => { clearMetrics(); setConfirmClear(false) }} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Confirmar</button>
                          <button onClick={() => setConfirmClear(false)} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">Cancelar</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                          <AlertTriangle size={12} /> Limpar todos os dados
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {enriched.length > 0 && (
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por data, plataforma, tipo, descrição..."
                      value={rawDataSearch}
                      onChange={(e) => setRawDataSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                )}

                {enriched.length > 0 && (
                  <div className="flex gap-1.5 mb-4 flex-wrap">
                    {[
                      { id: '', label: 'Todos' },
                      { id: 'story', label: 'Stories' },
                      { id: 'feed', label: 'Feed' },
                      ...(enriched.some(m => m.platform === 'linkedin') ? [{ id: 'linkedin', label: 'LinkedIn' }] : []),
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setFilterPostType(id)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all ${
                          id === 'linkedin'
                            ? filterPostType === 'linkedin'
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-white text-violet-500 border-violet-200 hover:border-violet-400 hover:text-violet-700'
                            : filterPostType === id
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {enriched.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-400 text-sm">Nenhuma métrica registrada ainda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {SORT_COLS.map((col) => (
                            <th key={col.key}
                              className={`text-left py-2 px-2.5 text-gray-400 font-medium whitespace-nowrap select-none ${col.sortable ? 'cursor-pointer hover:text-orange-600 transition-colors' : ''}`}
                              onClick={() => col.sortable && handleSort(col.key)}>
                              <span className="inline-flex items-center">
                                {col.label}
                                <SortIcon col={col} />
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((m) => (
                          <tr key={m.id} className="border-b border-gray-100 hover:bg-orange-50/50 group">
                            <td className="py-2 px-2.5 text-gray-400 whitespace-nowrap">{fmtDate(m.date, m.publish_time)}</td>
                            <td className="py-2 px-2.5"><PostTypeBadge type={m.post_type} /></td>
                            <td className="py-2 px-2.5"><PlatformBadge platform={m.platform} /></td>
                            <td className="py-2 px-2.5 min-w-[110px]">
                              <select
                                value={m.client || ''}
                                onChange={(e) => updateMetric(m.id, { client: e.target.value })}
                                className={`text-xs rounded-full px-2 py-0.5 border font-medium cursor-pointer focus:outline-none transition-colors ${
                                  m.client
                                    ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                                    : 'bg-gray-50 text-gray-300 border-gray-200 hover:bg-gray-100 hover:text-gray-500'
                                }`}
                              >
                                <option value="">+ cliente</option>
                                {clients.map(c => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-2.5 max-w-[200px]">
                              <div className="flex items-center gap-1.5">
                                {m.description ? (
                                  m.platform === 'linkedin' && m.link ? (
                                    <a href={m.link} target="_blank" rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-violet-600 hover:text-violet-800 hover:underline truncate block text-xs"
                                      title={m.link}>
                                      {m.description.slice(0, 50)}{m.description.length > 50 ? '…' : ''}
                                    </a>
                                  ) : (
                                    <span className="text-gray-500 truncate block" title={m.description}>
                                      {m.description.slice(0, 50)}{m.description.length > 50 ? '…' : ''}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                                {m.link && m.platform !== 'linkedin' && (
                                  <a href={m.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-600">
                                    <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2.5 text-gray-700">{(m.impressions || 0).toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{(m.reach || 0).toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{(m.likes || 0).toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{(m.comments || 0).toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{(m.shares || 0).toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{(m.saves || 0).toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{(m.follows || 0).toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-700 font-medium">{(m.engagement || 0).toLocaleString()}</td>
                            <td className="py-2 px-2.5">
                              <span className={`font-semibold ${m.engagement_rate > 0.04 ? 'text-emerald-600' : m.engagement_rate > 0.02 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {(m.engagement_rate * 100).toFixed(2)}%
                              </span>
                            </td>
                            <td className="py-2 px-2.5">
                              <button onClick={() => deleteMetric(m.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all" title="Excluir">
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}
        </>
      )}

      {/* ===== POSTS — Performance Intelligence ===== */}
      {tab === 'posts' && (() => {
        const perf = classifyPerformance(enriched)

        // Apply filters to all posts
        const filterFn = (m) => {
          if (postTabType && m.post_type !== postTabType) return false
          if (postTabPlatform && m.platform !== postTabPlatform) return false
          if (postTabSearch && !m.description?.toLowerCase().includes(postTabSearch.toLowerCase())) return false
          if (postTabDateFrom && m.date < postTabDateFrom) return false
          if (postTabDateTo && m.date > postTabDateTo) return false
          if (postTabClient) {
            const client = clients.find(c => c.id === postTabClient)
            if (client) {
              const desc = (m.description || '').toLowerCase()
              const name = client.name?.toLowerCase() || ''
              const tags = (client.hashtags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
              const matchName = desc.includes(name)
              const matchTag = tags.some(tag => desc.includes(tag))
              if (!matchName && !matchTag) return false
            }
          }
          return true
        }

        const sortFn = (a, b) => {
          if (postTabSort === 'date') return new Date(b.date || 0) - new Date(a.date || 0)
          if (postTabSort === 'engagement') return (b.engagement || 0) - (a.engagement || 0)
          if (postTabSort === 'impressions') return (b.impressions || 0) - (a.impressions || 0)
          if (postTabSort === 'likes') return (b.likes || 0) - (a.likes || 0)
          if (postTabSort === 'engagement_rate') return (b.engagement_rate || 0) - (a.engagement_rate || 0)
          return 0
        }

        const topFiltered = perf.top.filter(filterFn).sort(sortFn)
        const goodFiltered = perf.good.filter(filterFn).sort(sortFn)
        const lowFiltered = perf.low.filter(filterFn).sort(sortFn)
        const totalFiltered = topFiltered.length + goodFiltered.length + lowFiltered.length

        const toggleZone = (zone) => setCollapsedZones(prev => ({ ...prev, [zone]: !prev[zone] }))

        return (
          <div className="space-y-4">
            {/* Performance summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center border border-emerald-100">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Crown size={14} className="text-emerald-500" />
                  <p className="text-2xl font-bold text-emerald-600">{perf.top.length}</p>
                </div>
                <p className="text-xs text-gray-400">Top Performers</p>
                <p className="text-[10px] text-emerald-500 mt-0.5">
                  {perf.thresholds.p75 ? `>${(perf.thresholds.p75 * 100).toFixed(1)}% eng.` : ''}
                </p>
              </div>
              <div className="card p-4 text-center border border-amber-100">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <CheckCircle size={14} className="text-amber-500" />
                  <p className="text-2xl font-bold text-amber-600">{perf.good.length}</p>
                </div>
                <p className="text-xs text-gray-400">Bom Desempenho</p>
                <p className="text-[10px] text-amber-500 mt-0.5">performance média</p>
              </div>
              <div className="card p-4 text-center border border-red-100">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <AlertCircle size={14} className="text-red-400" />
                  <p className="text-2xl font-bold text-red-500">{perf.low.length}</p>
                </div>
                <p className="text-xs text-gray-400">Abaixo da Média</p>
                <p className="text-[10px] text-red-400 mt-0.5">
                  {perf.thresholds.p25 ? `<${(perf.thresholds.p25 * 100).toFixed(1)}% eng.` : ''}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="card p-4 space-y-3">
              <div className="flex gap-2 items-center flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    className="input text-xs py-1.5 pl-8"
                    placeholder="Buscar por descrição…"
                    value={postTabSearch}
                    onChange={(e) => setPostTabSearch(e.target.value)}
                  />
                </div>
                <select className="select text-xs py-1.5 w-40" value={postTabPlatform} onChange={(e) => setPostTabPlatform(e.target.value)}>
                  <option value="">Todas plataformas</option>
                  {['instagram', 'linkedin', 'twitter', 'youtube', 'tiktok'].map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <select className="select text-xs py-1.5 w-36" value={postTabType} onChange={(e) => setPostTabType(e.target.value)}>
                  <option value="">Todos os tipos</option>
                  {['story', 'reel', 'carousel', 'image', 'video', 'artigo'].map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                {clients.length > 0 && (
                  <select className="select text-xs py-1.5 w-44" value={postTabClient} onChange={(e) => setPostTabClient(e.target.value)}>
                    <option value="">Todos os clientes</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-medium">De:</span>
                  <input type="date" className="input text-xs py-1 w-36" value={postTabDateFrom} onChange={(e) => setPostTabDateFrom(e.target.value)} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-medium">Até:</span>
                  <input type="date" className="input text-xs py-1 w-36" value={postTabDateTo} onChange={(e) => setPostTabDateTo(e.target.value)} />
                </div>
                <select className="select text-xs py-1.5 w-44" value={postTabSort} onChange={(e) => setPostTabSort(e.target.value)}>
                  <option value="date">Ordenar: Mais recente</option>
                  <option value="engagement">Ordenar: Mais engajamento</option>
                  <option value="impressions">Ordenar: Mais impressões</option>
                  <option value="likes">Ordenar: Mais curtidas</option>
                  <option value="engagement_rate">Ordenar: Melhor taxa eng.</option>
                </select>
                {(postTabSearch || postTabPlatform || postTabType || postTabDateFrom || postTabDateTo || postTabClient) && (
                  <button
                    onClick={() => { setPostTabSearch(''); setPostTabPlatform(''); setPostTabType(''); setPostTabDateFrom(''); setPostTabDateTo(''); setPostTabClient('') }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                  >
                    <X size={10} /> Limpar filtros
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-auto">{totalFiltered} resultado{totalFiltered !== 1 ? 's' : ''}</span>
                <input type="file" ref={csvRef} accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const { data, linkedinSingle } = await parseFile(file)
                      let rows
                      if (linkedinSingle) {
                        // Formato vertical de post único do LinkedIn — já normalizado
                        rows = data
                      } else if (isLinkedinFile(data)) {
                        // Formato tabular do LinkedIn (relatório de múltiplos posts)
                        rows = data.map(normalizeLinkedinRow).filter(Boolean)
                      } else {
                        // Instagram / formato padrão
                        rows = data.map(normalizeRow).filter(r => r.date || r.impressions > 0)
                      }
                      rows.forEach(row => addMetric(row))
                    } catch (err) {
                      console.error(err)
                    }
                    e.target.value = ''
                  }}
                />
                <button
                  onClick={() => csvRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Upload size={12} /> Importar arquivo
                </button>
                <button
                  onClick={() => {
                    if (confirm('Isso vai limpar todos os dados atuais e permitir reimportar. Continuar?')) {
                      clearMetrics()
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw size={12} /> Atualizar Dados
                </button>
              </div>
            </div>

            {/* Empty state */}
            {enriched.length === 0 ? (
              <div className="card p-14 text-center">
                <BarChart2 size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-1">Nenhuma métrica registrada ainda.</p>
                <p className="text-xs text-gray-300 mb-4">Importe um CSV ou adicione métricas manualmente.</p>
                <button onClick={() => setFormOpen(true)} className="btn-primary mx-auto">
                  <Plus size={14} /> Adicionar Métricas
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* TOP PERFORMERS */}
                {topFiltered.length > 0 && (
                  <div>
                    <ZoneHeader
                      icon={Crown}
                      title="Top Performers"
                      count={topFiltered.length}
                      color="emerald"
                      description="Posts com melhor taxa de engajamento — replique estes padrões"
                      collapsed={collapsedZones.top}
                      onToggle={() => toggleZone('top')}
                    />
                    {!collapsedZones.top && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                        {topFiltered.map((m) => (
                          <PostCard key={m.id} m={m}
                            onDelete={deleteMetric}
                            onTemplate={handleSaveTemplate}
                            onGenerate={handleGenerateSimilar}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* GOOD PERFORMANCE */}
                {goodFiltered.length > 0 && (
                  <div>
                    <ZoneHeader
                      icon={CheckCircle}
                      title="Bom Desempenho"
                      count={goodFiltered.length}
                      color="amber"
                      description="Posts com desempenho médio — potencial de melhoria"
                      collapsed={collapsedZones.good}
                      onToggle={() => toggleZone('good')}
                    />
                    {!collapsedZones.good && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                        {goodFiltered.map((m) => (
                          <PostCard key={m.id} m={m}
                            onDelete={deleteMetric}
                            onTemplate={handleSaveTemplate}
                            onGenerate={handleGenerateSimilar}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* LOW PERFORMANCE */}
                {lowFiltered.length > 0 && (
                  <div>
                    <ZoneHeader
                      icon={AlertCircle}
                      title="Abaixo da Média"
                      count={lowFiltered.length}
                      color="red"
                      description="Posts com baixo engajamento — analise o que ajustar"
                      collapsed={collapsedZones.low}
                      onToggle={() => toggleZone('low')}
                    />
                    {!collapsedZones.low && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                        {lowFiltered.map((m) => (
                          <PostCard key={m.id} m={m}
                            onDelete={deleteMetric}
                            onTemplate={handleSaveTemplate}
                            onGenerate={handleGenerateSimilar}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* No results after filter */}
                {totalFiltered === 0 && enriched.length > 0 && (
                  <div className="card p-10 text-center">
                    <Filter size={24} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Nenhum resultado para os filtros aplicados.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* ===== PUBLI — Relatório de Publicidade ===== */}
      {tab === 'publi' && (() => {
        const [year, month] = publiMonth.split('-').map(Number)
        const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDayNum = new Date(year, month, 0).getDate()
        const lastDay = `${year}-${String(month).padStart(2, '0')}-${lastDayNum}`

        const monthLabel = new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

        // Filtra por mês + sinalizadores publi
        // Inclui: posts com sinais na descrição (hashtags/menções) OU com cliente preenchido manualmente
        let publiPosts = enriched.filter(m => {
          if (m.date < firstOfMonth || m.date > lastDay) return false
          if (m.client && m.client.trim()) return true   // cliente preenchido = publi
          const desc = (m.description || '').toLowerCase()
          const hasSignal = PUBLI_SIGNALS.some(s => desc.includes(s))
          const hasMention = /@[\w._]+/i.test(desc)
          return hasSignal || hasMention
        }).sort((a, b) => new Date(b.date) - new Date(a.date))

        // Filtra por cliente selecionado
        if (publiClient) {
          const client = clients.find(c => c.id === publiClient)
          if (client) {
            const cName = client.name?.toLowerCase() || ''
            const cTags = (client.hashtags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
            publiPosts = publiPosts.filter(m => {
              // Verifica campo client direto (LinkedIn/manual) OU sinais na descrição
              const clientField = (m.client || '').toLowerCase()
              if (clientField && (clientField === cName || clientField.includes(cName) || cName.includes(clientField))) return true
              const desc = (m.description || '').toLowerCase()
              return desc.includes(cName) || desc.includes('@' + cName) || cTags.some(t => desc.includes(t))
            })
          }
        }

        // Aplica filtro de busca
        if (publiSearch) {
          const searchLower = publiSearch.toLowerCase()
          publiPosts = publiPosts.filter(m => {
            const desc = (m.description || '').toLowerCase()
            const brand = detectBrand(m.description).toLowerCase()
            return (
              desc.includes(searchLower) ||
              brand.includes(searchLower) ||
              m.platform?.toLowerCase().includes(searchLower)
            )
          })
        }

        const fmtDateShort = (d) => {
          if (!d) return '—'
          try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
          catch { return d }
        }

        const selectedClientName = publiClient ? (clients.find(c => c.id === publiClient)?.name || '') : ''

        // Gera meses disponíveis baseado nos dados
        const availableMonths = (() => {
          const months = new Set()
          enriched.forEach(m => {
            if (m.date) months.add(m.date.slice(0, 7))
          })
          // Sempre incluir mês atual
          const _now = new Date()
          const cur = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`
          months.add(cur)
          return [...months].sort().reverse()
        })()

        // ── Análise de Maturidade (prompt técnico) ──
        const handlePubliAnalysis = async () => {
          if (publiPosts.length === 0) return
          setPubliLoading(true)
          setPubliError(null)
          setPubliReport(null)

          const apiKey = localStorage.getItem('cio-anthropic-key') || ''
          if (!apiKey) { setPubliError('Configure sua API key em Relatórios > ícone de chave.'); setPubliLoading(false); return }

          const tableData = publiPosts.map(m => ({
            data: fmtDateShort(m.date), marca: detectBrand(m.description),
            alcance: m.impressions, er: (m.engagement_rate * 100).toFixed(2) + '%',
            curtidas: m.likes || 0, comentarios: m.comments || 0, compartilhamentos: m.shares || 0,
            desc: (m.description || '').slice(0, 120),
          }))

          const prompt = `Atue como um Analista de Dados sênior. Prioridade absoluta: recorte cronológico. Filtre e organize dados de forma técnica e minimalista.

PERÍODO: ${fmtDateShort(firstOfMonth)} a ${fmtDateShort(lastDay)} (${monthLabel})
${selectedClientName ? `CLIENTE: ${selectedClientName}` : 'TODOS OS CLIENTES'}
POSTS PUBLI: ${publiPosts.length}

DADOS:
${tableData.map((r, i) => `${i + 1}. ${r.data} | ${r.marca} | Alcance: ${r.alcance} | ER: ${r.er} | Curtidas: ${r.curtidas} | Coment: ${r.comentarios} | Compart: ${r.compartilhamentos} | "${r.desc}"`).join('\n')}

Retorne EXCLUSIVAMENTE JSON válido:
{
  "status_periodo": "ex: 01/04 a 30/04",
  "ranking_marcas": [{"marca": "...", "posts": 0, "alcance_total": 0, "er_medio": "...", "veredicto": "frase curta"}],
  "insight_maturidade": "qual publi gerou conversas mais qualificadas. Direto, sem adjetivos.",
  "recomendacoes": ["...", "...", "..."],
  "melhor_post": {"marca": "...", "alcance": 0, "er": "...", "motivo": "..."},
  "pior_post": {"marca": "...", "alcance": 0, "er": "...", "motivo": "..."},
  "por_formato": [{"formato": "...", "posts": 0, "er_medio": "..."}]
}`

          try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
              body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
            })
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Erro: ${res.status}`) }
            const data = await res.json()
            const text = data.content?.[0]?.text || ''
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (!jsonMatch) throw new Error('Resposta inválida da IA')
            setPubliReport(JSON.parse(jsonMatch[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')))
          } catch (err) { setPubliError(err.message) }
          finally { setPubliLoading(false) }
        }

        // ── Relatório para Cliente (formatado para enviar) ──
        const handleClientReport = async () => {
          if (publiPosts.length === 0) return
          setPubliClientLoading(true)
          setPubliError(null)
          setPubliClientReport(null)
          setPubliWhatsapp('')

          const apiKey = localStorage.getItem('cio-anthropic-key') || ''
          if (!apiKey) { setPubliError('Configure sua API key em Relatórios > ícone de chave.'); setPubliClientLoading(false); return }

          const clientLabel = selectedClientName || 'Cliente'
          const totalImp = publiPosts.reduce((s, m) => s + m.impressions, 0)
          const totalEng = publiPosts.reduce((s, m) => s + m.engagement, 0)
          const avgER = (publiPosts.reduce((s, m) => s + m.engagement_rate, 0) / publiPosts.length * 100).toFixed(2)
          const top = [...publiPosts].sort((a, b) => b.engagement_rate - a.engagement_rate)[0]
          const worst = [...publiPosts].sort((a, b) => a.engagement_rate - b.engagement_rate)[0]

          const totalSaves = publiPosts.reduce((s, m) => s + (m.saves || 0), 0)
          const totalClicks = publiPosts.reduce((s, m) => s + (m.link_clicks || 0), 0)

          const formatMap = {}
          publiPosts.forEach(m => {
            const t = m.post_type || 'outro'
            if (!formatMap[t]) formatMap[t] = { count: 0, er_sum: 0 }
            formatMap[t].count++
            formatMap[t].er_sum += (m.engagement_rate || 0)
          })

          // Agrupar por plataforma
          const platformMap = {}
          publiPosts.forEach(m => {
            const p = m.platform || 'instagram'
            if (!platformMap[p]) platformMap[p] = { count: 0, imp: 0, er_sum: 0 }
            platformMap[p].count++
            platformMap[p].imp += (m.impressions || 0)
            platformMap[p].er_sum += (m.engagement_rate || 0)
          })
          const platforms = Object.keys(platformMap)

          const hashtagCount = {}
          publiPosts.forEach(m => {
            const tags = (m.description || '').match(/#[\w\u00C0-\u024F]+/gi) || []
            tags.forEach(t => { const l = t.toLowerCase(); hashtagCount[l] = (hashtagCount[l] || 0) + 1 })
          })
          const topHashtags = Object.entries(hashtagCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => `${t} (${c}x)`)

          // Detalhes de cada post para o prompt
          const postDetails = publiPosts.map((m, i) => {
            const parts = [`${i + 1}. ${fmtDateShort(m.date)} [${m.platform || 'instagram'}]`]
            parts.push(`Marca: ${detectBrand(m.description)}`)
            parts.push(`Tipo: ${m.post_type || '—'}`)
            parts.push(`Alcance: ${m.impressions} | ER: ${(m.engagement_rate * 100).toFixed(2)}%`)
            parts.push(`Curtidas: ${m.likes || 0} | Coment: ${m.comments || 0} | Compart: ${m.shares || 0} | Salv: ${m.saves || 0} | Cliques: ${m.link_clicks || 0}`)
            if (m.link) parts.push(`Link: ${m.link}`)
            parts.push(`Legenda: "${(m.description || '').slice(0, 100)}"`)
            return parts.join(' | ')
          }).join('\n')

          const prompt = `Você é um analista de conteúdo gerando relatório mensal para enviar ao cliente.

DADOS:
- Cliente: ${clientLabel}
- Período: ${monthLabel}
- Plataformas: ${platforms.join(', ')}
- Posts: ${publiPosts.length}
- Impressões totais: ${totalImp.toLocaleString('pt-BR')}
- Engajamento total: ${totalEng.toLocaleString('pt-BR')}
- Taxa eng. média: ${avgER}%
- Salvamentos totais: ${totalSaves}
- Cliques no link totais: ${totalClicks}
- Melhor post: "${(top?.description || '').slice(0, 80)}" — ER: ${top ? (top.engagement_rate * 100).toFixed(2) : 0}%
- Pior post: "${(worst?.description || '').slice(0, 80)}" — ER: ${worst ? (worst.engagement_rate * 100).toFixed(2) : 0}%
- Hashtags mais usadas: ${topHashtags.join(', ') || 'nenhuma'}
- Por formato: ${Object.entries(formatMap).map(([f, d]) => `${f}: ${d.count} posts, ER médio ${(d.er_sum / d.count * 100).toFixed(2)}%`).join('; ')}
${platforms.length > 1 ? `- Por plataforma: ${Object.entries(platformMap).map(([p, d]) => `${p}: ${d.count} posts, ${d.imp.toLocaleString('pt-BR')} imp, ER ${(d.er_sum / d.count * 100).toFixed(2)}%`).join('; ')}` : ''}

DETALHES DOS POSTS:
${postDetails}

Gere EXCLUSIVAMENTE JSON:
{
  "resumo_executivo": "3-4 linhas max. Total de posts, melhor resultado, observação da audiência.",
  "numeros": {"posts": 0, "impressoes": "...", "er_medio": "...", "salvamentos": "...", "cliques_link": "...", "melhor_post": "...", "pior_post": "...", "hashtags_top": ["..."], "mencoes_top": ["..."]},
  "por_formato": [{"formato": "...", "posts": 0, "er_medio": "...", "veredicto": "..."}],
  ${platforms.length > 1 ? '"por_plataforma": [{"plataforma": "...", "posts": 0, "impressoes": "...", "er_medio": "...", "veredicto": "..."}],' : ''}
  "proximos_passos": ["passo 1", "passo 2", "passo 3"],
  "whatsapp": "Resumo em 5 linhas para WhatsApp. Tom próximo, direto, número mais importante primeiro. Formato brasileiro. Sem emojis."
}

REGRAS: Tom profissional e direto. Sem emojis. Números formato brasileiro (1.234). Se dado falta, use '— dado não disponível'. Foco no essencial.`

          try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
              body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
            })
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Erro: ${res.status}`) }
            const data = await res.json()
            const text = data.content?.[0]?.text || ''
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (!jsonMatch) throw new Error('Resposta inválida da IA')
            const parsed = JSON.parse(jsonMatch[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
            setPubliClientReport(parsed)
            setPubliWhatsapp(parsed.whatsapp || '')
          } catch (err) { setPubliError(err.message) }
          finally { setPubliClientLoading(false) }
        }

        const copyToClipboard = (text) => { navigator.clipboard.writeText(text) }

        // ── Relatório Unificado (Instagram + LinkedIn) ──
        const handleUnifiedReport = async () => {
          if (publiPosts.length === 0) return

          setPubliUnifiedLoading(true)
          setPubliError(null)

          try {
            // 1. Separar por plataforma
            const igPosts = publiPosts.filter(p => p.platform === 'instagram')
            const liPosts = publiPosts.filter(p => p.platform === 'linkedin')

            // 2. Calcular métricas unificadas
            const totalReach = igPosts.reduce((s, p) => s + p.impressions, 0) +
                              liPosts.reduce((s, p) => s + p.impressions, 0)
            const totalEngagement = publiPosts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0)
            const avgER = publiPosts.length > 0
              ? (publiPosts.reduce((s, p) => s + p.engagement_rate, 0) / publiPosts.length * 100).toFixed(2)
              : '0.00'

            const unifiedData = {
              period: `${fmtDateShort(firstOfMonth)} a ${fmtDateShort(lastDay)}`,
              client: selectedClientName || 'Todos os Clientes',
              totalPosts: publiPosts.length,
              totalReach,
              totalEngagement,
              avgER,
              byPlatform: {
                instagram: {
                  posts: igPosts.length,
                  reach: igPosts.reduce((s, p) => s + p.impressions, 0),
                  engagement: igPosts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0),
                  er: igPosts.length > 0 ? (igPosts.reduce((s, p) => s + p.engagement_rate, 0) / igPosts.length * 100).toFixed(2) : '0'
                },
                linkedin: {
                  posts: liPosts.length,
                  reach: liPosts.reduce((s, p) => s + p.impressions, 0),
                  engagement: liPosts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0),
                  er: liPosts.length > 0 ? (liPosts.reduce((s, p) => s + p.engagement_rate, 0) / liPosts.length * 100).toFixed(2) : '0'
                }
              },
              posts: publiPosts.sort((a, b) => b.engagement_rate - a.engagement_rate)
            }

            // 3. Gerar PDF
            generateUnifiedPDF(unifiedData)
            setPubliUnifiedReport(unifiedData)
          } catch (err) {
            setPubliError(err.message)
          } finally {
            setPubliUnifiedLoading(false)
          }
        }

        // ── Gerar PDF Unificado ──
        const generateUnifiedPDF = (data) => {
          const doc = new jsPDF()
          const pageHeight = doc.internal.pageSize.getHeight()
          const pageWidth = doc.internal.pageSize.getWidth()
          let currentY = 20

          // PÁGINA 1: CAPA
          doc.setFillColor(16, 185, 129) // Emerald
          doc.rect(0, 0, pageWidth, pageHeight / 3, 'F')

          doc.setFontSize(28)
          doc.setTextColor(255, 255, 255)
          doc.setFont(undefined, 'bold')
          doc.text('RELATÓRIO UNIFICADO', 20, 60)
          doc.text(data.client, 20, 85)

          doc.setFontSize(11)
          doc.setTextColor(200, 200, 200)
          doc.setFont(undefined, 'normal')
          doc.text(`Período: ${data.period}`, 20, 110)
          doc.text(`Plataformas: Instagram + LinkedIn`, 20, 120)

          // Overview cards
          doc.setFillColor(240, 240, 240)
          doc.rect(20, 140, pageWidth - 40, 60, 'F')
          doc.setFontSize(10)
          doc.setTextColor(80, 80, 80)
          doc.text(`Total de Posts: ${data.totalPosts}`, 30, 155)
          doc.text(`Alcance Total: ${data.totalReach.toLocaleString('pt-BR')}`, 30, 167)
          doc.text(`Engajamento: ${data.totalEngagement.toLocaleString('pt-BR')} | ER Médio: ${data.avgER}%`, 30, 179)

          // PÁGINA 2: OVERVIEW
          doc.addPage()
          currentY = 20

          doc.setFontSize(14)
          doc.setTextColor(0, 0, 0)
          doc.setFont(undefined, 'bold')
          doc.text('Performance por Plataforma', 20, currentY)
          currentY += 20

          // Instagram
          doc.setFillColor(245, 245, 245)
          doc.rect(20, currentY, pageWidth - 40, 35, 'F')
          doc.setFontSize(10)
          doc.setFont(undefined, 'bold')
          doc.text('📷 Instagram', 30, currentY + 8)
          doc.setFont(undefined, 'normal')
          doc.setFontSize(9)
          doc.text(`Posts: ${data.byPlatform.instagram.posts} | Alcance: ${data.byPlatform.instagram.reach.toLocaleString('pt-BR')} | ER: ${data.byPlatform.instagram.er}%`, 30, currentY + 18)
          doc.text(`Engajamento: ${data.byPlatform.instagram.engagement.toLocaleString('pt-BR')}`, 30, currentY + 27)
          currentY += 40

          // LinkedIn
          doc.setFillColor(245, 245, 245)
          doc.rect(20, currentY, pageWidth - 40, 35, 'F')
          doc.setFontSize(10)
          doc.setFont(undefined, 'bold')
          doc.text('💼 LinkedIn', 30, currentY + 8)
          doc.setFont(undefined, 'normal')
          doc.setFontSize(9)
          doc.text(`Posts: ${data.byPlatform.linkedin.posts} | Alcance: ${data.byPlatform.linkedin.reach.toLocaleString('pt-BR')} | ER: ${data.byPlatform.linkedin.er}%`, 30, currentY + 18)
          doc.text(`Engajamento: ${data.byPlatform.linkedin.engagement.toLocaleString('pt-BR')}`, 30, currentY + 27)
          currentY += 45

          // PÁGINA 3: RANKING DE POSTS
          doc.addPage()
          currentY = 20

          doc.setFontSize(14)
          doc.setFont(undefined, 'bold')
          doc.text('Ranking de Posts (por ER)', 20, currentY)
          currentY += 15

          // Table header
          doc.setFillColor(16, 185, 129)
          doc.setTextColor(255, 255, 255)
          doc.setFont(undefined, 'bold')
          doc.setFontSize(8)

          const headers = ['Data', 'Plat.', 'ER %', 'Alcance', 'Engajamento']
          const colX = [20, 45, 70, 95, 145]
          const rowHeight = 6

          headers.forEach((h, i) => doc.text(h, colX[i], currentY))
          currentY += 8

          doc.setTextColor(0, 0, 0)
          doc.setFont(undefined, 'normal')
          doc.setFontSize(7)

          data.posts.slice(0, 15).forEach(post => {
            if (currentY > pageHeight - 20) {
              doc.addPage()
              currentY = 20
            }

            const isBest = post === data.posts[0]
            if (isBest) {
              doc.setFillColor(240, 255, 240)
              doc.rect(20, currentY - 5, pageWidth - 40, rowHeight, 'F')
            }

            const data_fmt = new Date(post.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            const platform = post.platform === 'instagram' ? 'IG' : 'LI'
            const erVal = (post.engagement_rate * 100).toFixed(2)
            const engVal = (post.likes || 0) + (post.comments || 0) + (post.shares || 0)

            doc.text(data_fmt, colX[0], currentY)
            doc.text(platform, colX[1], currentY)
            doc.text(erVal + '%', colX[2], currentY)
            doc.text(post.impressions.toLocaleString('pt-BR').substring(0, 8), colX[3], currentY)
            doc.text(engVal.toString(), colX[4], currentY)

            currentY += 7
          })

          doc.setFontSize(7)
          doc.setTextColor(150, 150, 150)
          doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, pageHeight - 10)

          doc.save(`Relatorio_Unificado_${data.client.replace(/ /g, '_')}_${new Date().getTime()}.pdf`)
        }

        return (
          <div className="space-y-4">
            {/* Header + Filtros */}
            <div className="card p-5 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Target size={16} className="text-orange-500" />
                    Relatório Publi
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Sinalizadores: <span className="font-mono text-orange-600">#publi #ad #parceria @marca</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400" />
                    <select
                      className="select text-xs py-1.5 w-44"
                      value={publiMonth}
                      onChange={(e) => { setPubliMonth(e.target.value); setPubliSearch(''); setPubliReport(null); setPubliClientReport(null) }}
                    >
                      {availableMonths.map(m => {
                        const [y, mo] = m.split('-').map(Number)
                        const label = new Date(y, mo - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                        return <option key={m} value={m}>{label}</option>
                      })}
                    </select>
                  </div>
                  {clients.length > 0 && (
                    <select
                      className="select text-xs py-1.5 w-44"
                      value={publiClient}
                      onChange={(e) => { setPubliClient(e.target.value); setPubliSearch(''); setPubliReport(null); setPubliClientReport(null) }}
                    >
                      <option value="">Todos os clientes</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  <div className="relative flex-1 sm:max-w-xs">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                      className="input text-xs py-1.5 pl-8"
                      placeholder="Buscar marca, descrição…"
                      value={publiSearch}
                      onChange={(e) => setPubliSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-orange-200/50">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase">Período</span>
                  <p className="text-xs font-semibold text-gray-700">{fmtDateShort(firstOfMonth)} a {fmtDateShort(lastDay)}</p>
                </div>
                {selectedClientName && (
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Cliente</span>
                    <p className="text-xs font-semibold text-blue-600">{selectedClientName}</p>
                  </div>
                )}
                <div className="ml-auto text-right">
                  <p className="text-2xl font-bold text-orange-600">{publiPosts.length}</p>
                  <p className="text-[10px] text-gray-400 uppercase">posts detectados</p>
                </div>
              </div>
            </div>

            {publiPosts.length === 0 ? (
              <div className="card p-8 text-center">
                <AlertTriangle size={24} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">Nenhum dado de publicidade detectado em {monthLabel}.</p>
                <p className="text-xs text-gray-400 mt-1">Certifique-se de que seus posts contêm #publi, #ad, #parceria ou @marca na descrição.</p>
              </div>
            ) : (
              <>
                {/* ── Resumo de Métricas ── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="card p-3 text-center">
                    <p className="text-xs text-gray-400">Total Impressões</p>
                    <p className="text-lg font-bold text-gray-900">{(publiPosts.reduce((s, m) => s + m.impressions, 0) / 1000).toFixed(1)}K</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xs text-gray-400">Total Cliques</p>
                    <p className="text-lg font-bold text-blue-600">{publiPosts.reduce((s, m) => s + (m.link_clicks || 0), 0).toLocaleString()}</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xs text-gray-400">CTR Médio</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {publiPosts.length > 0
                        ? ((publiPosts.reduce((s, m) => s + (m.link_clicks || 0), 0) / publiPosts.reduce((s, m) => s + m.impressions, 0) * 100).toFixed(2) + '%')
                        : '0%'}
                    </p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xs text-gray-400">Engajamento</p>
                    <p className="text-lg font-bold text-orange-600">{publiPosts.reduce((s, m) => s + (m.likes || 0) + (m.comments || 0) + (m.shares || 0), 0).toLocaleString()}</p>
                  </div>
                  <div className="card p-3 text-center">
                    <p className="text-xs text-gray-400">Conversões</p>
                    <p className="text-lg font-bold text-purple-600">{publiPosts.reduce((s, m) => s + (m.saves || 0), 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* ── Gráficos ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Performance por Plataforma */}
                  <div className="card p-4">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <BarChart2 size={14} className="text-blue-500" />
                      Performance por Plataforma
                    </h4>
                    {(() => {
                      const platformData = {};
                      publiPosts.forEach(m => {
                        const p = m.platform || 'instagram';
                        if (!platformData[p]) platformData[p] = { impressions: 0, clicks: 0, engagement: 0, posts: 0, er: 0 };
                        platformData[p].impressions += m.impressions;
                        platformData[p].clicks += m.link_clicks || 0;
                        platformData[p].engagement += (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
                        platformData[p].posts += 1;
                        platformData[p].er += m.engagement_rate;
                      });
                      const data = Object.entries(platformData).map(([name, stats]) => ({
                        name: name.charAt(0).toUpperCase() + name.slice(1),
                        impressoes: Math.round(stats.impressions / 1000),
                        er: parseFloat((stats.er / stats.posts * 100).toFixed(1)),
                      }));
                      return (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v) => v.toFixed(1)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                            <Bar yAxisId="left" dataKey="impressoes" fill="#3b82f6" name="Impressões (K)" />
                            <Bar yAxisId="right" dataKey="er" fill="#10b981" name="ER (%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>

                  {/* ER por Dia */}
                  <div className="card p-4">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp size={14} className="text-green-500" />
                      Engajamento ao Longo do Período
                    </h4>
                    {(() => {
                      const dayData = {};
                      publiPosts.forEach(m => {
                        const day = m.date;
                        if (!dayData[day]) dayData[day] = { date: day, posts: 0, engagement: 0, impressions: 0 };
                        dayData[day].posts += 1;
                        dayData[day].engagement += (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
                        dayData[day].impressions += m.impressions;
                      });
                      const data = Object.values(dayData)
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .map(d => ({
                          date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                          engajamento: d.engagement,
                          posts: d.posts,
                        }));
                      return (
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={data}>
                            <defs>
                              <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v) => v} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                            <Area type="monotone" dataKey="engajamento" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEng)" name="Engajamento" />
                          </AreaChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>

                {/* Tabela Técnica */}
                <div className="card overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Data</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Marca</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Plat.</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Alcance</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">ER</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Curtidas</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Coment.</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Compart.</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Salv.</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Cliques</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Tipo</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {publiPosts.map((m, i) => {
                        const erColor = m.engagement_rate > 0.04 ? 'text-emerald-600 font-bold' : m.engagement_rate > 0.02 ? 'text-amber-600' : 'text-gray-400'
                        return (
                          <tr key={m.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-orange-50/30 transition-colors`}>
                            <td className="py-2.5 px-3 text-gray-700 font-medium">{fmtDateShort(m.date)}</td>
                            <td className="py-2.5 px-3 text-blue-600 font-medium">{detectBrand(m.description)}</td>
                            <td className="py-2.5 px-3 text-gray-500 capitalize text-[10px]">{m.platform || '—'}</td>
                            <td className="py-2.5 px-3 text-right text-gray-700 font-medium">{m.impressions.toLocaleString()}</td>
                            <td className={`py-2.5 px-3 text-right ${erColor}`}>{(m.engagement_rate * 100).toFixed(2)}%</td>
                            <td className="py-2.5 px-3 text-right text-gray-600">{(m.likes || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right text-gray-600">{(m.comments || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right text-gray-600">{(m.shares || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right text-gray-600">{(m.saves || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right text-gray-600">{(m.link_clicks || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-3 capitalize text-gray-500 text-[10px]">{m.post_type || '—'}</td>
                            <td className="py-2.5 px-3 text-center">
                              {m.link ? (
                                <a href={m.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600"><ExternalLink size={11} /></a>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 border-t-2 border-gray-300">
                        <td className="py-2.5 px-3 font-bold text-gray-700" colSpan={3}>TOTAL</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-800">{publiPosts.reduce((s, m) => s + m.impressions, 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-800">{(publiPosts.reduce((s, m) => s + m.engagement_rate, 0) / publiPosts.length * 100).toFixed(2)}%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-800">{publiPosts.reduce((s, m) => s + (m.likes || 0), 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-800">{publiPosts.reduce((s, m) => s + (m.comments || 0), 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-800">{publiPosts.reduce((s, m) => s + (m.shares || 0), 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-800">{publiPosts.reduce((s, m) => s + (m.saves || 0), 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-800">{publiPosts.reduce((s, m) => s + (m.link_clicks || 0), 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3" colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="card p-4 text-center">
                    <p className="text-lg font-bold text-gray-900">{publiPosts.length}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Posts Publi</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {[...new Set(publiPosts.map(m => detectBrand(m.description)).filter(b => b !== '—'))].length}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase">Marcas</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-lg font-bold text-emerald-600">
                      {(publiPosts.reduce((s, m) => s + m.engagement_rate, 0) / publiPosts.length * 100).toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase">ER Medio Publi</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-lg font-bold text-blue-600">
                      {publiPosts.reduce((s, m) => s + m.impressions, 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase">Alcance Total</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Análise Técnica */}
                  <div className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <Wand2 size={12} className="text-purple-500" /> Analise Tecnica
                        </h4>
                        <p className="text-[10px] text-gray-400">Ranking, maturidade, recomendacoes</p>
                      </div>
                      <button onClick={handlePubliAnalysis} disabled={publiLoading} className="btn-primary text-xs py-1.5 px-3">
                        {publiLoading ? <><RefreshCw size={12} className="animate-spin" /> Analisando...</> : <><Wand2 size={12} /> Gerar</>}
                      </button>
                    </div>
                  </div>

                  {/* Relatório para Cliente */}
                  <div className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <FileText size={12} className="text-blue-500" /> Relatorio para Cliente
                        </h4>
                        <p className="text-[10px] text-gray-400">Pronto para enviar + resumo WhatsApp</p>
                      </div>
                      <button onClick={handleClientReport} disabled={publiClientLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors">
                        {publiClientLoading ? <><RefreshCw size={12} className="animate-spin" /> Gerando...</> : <><FileText size={12} /> Gerar</>}
                      </button>
                    </div>
                  </div>

                  {/* Relatório Unificado */}
                  <div className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <BarChart2 size={12} className="text-emerald-500" /> Relatorio Unificado
                        </h4>
                        <p className="text-[10px] text-gray-400">Instagram + LinkedIn consolidado</p>
                      </div>
                      <button
                        onClick={handleUnifiedReport}
                        disabled={publiPosts.length === 0 || publiUnifiedLoading}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {publiUnifiedLoading ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" /> Gerando...
                          </>
                        ) : (
                          <>
                            <BarChart2 size={12} /> Relatorio Unificado
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Exibição do Relatório Unificado Gerado */}
                {publiUnifiedReport && (
                  <div className="card p-6 bg-emerald-50 border border-emerald-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-600" />
                      Relatório Unificado Gerado
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Total Posts</p>
                        <p className="text-lg font-bold text-gray-900">{publiUnifiedReport.totalPosts}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Alcance Total</p>
                        <p className="text-lg font-bold text-emerald-600">{(publiUnifiedReport.totalReach / 1000).toFixed(1)}K</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Engajamento</p>
                        <p className="text-lg font-bold text-blue-600">{publiUnifiedReport.totalEngagement.toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">ER Médio</p>
                        <p className="text-lg font-bold text-orange-600">{publiUnifiedReport.avgER}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {publiError && (
                  <div className="card p-4 border-red-200 bg-red-50">
                    <p className="text-xs text-red-600 flex items-center gap-2"><AlertTriangle size={14} /> {publiError}</p>
                  </div>
                )}

                {/* ═══ Análise Técnica Result ═══ */}
                {publiReport && (
                  <div className="space-y-4">
                    <div className="card p-4 bg-gray-50 border-gray-200">
                      <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Status:</span> {publiReport.status_periodo}</p>
                    </div>

                    {publiReport.ranking_marcas?.length > 0 && (
                      <div className="card p-5">
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Trophy size={14} className="text-orange-500" /> Ranking por Marca
                        </h4>
                        <div className="space-y-2">
                          {publiReport.ranking_marcas.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                              <span className="text-sm font-bold text-gray-300 w-5 text-center">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900">{r.marca}</p>
                                <p className="text-[10px] text-gray-500">{r.veredicto}</p>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-600 shrink-0">
                                <span>{r.posts} post{r.posts !== 1 ? 's' : ''}</span>
                                <span>{(r.alcance_total || 0).toLocaleString()} alcance</span>
                                <span className="font-semibold text-emerald-600">{r.er_medio}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {publiReport.por_formato?.length > 0 && (
                      <div className="card p-5">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">Por Formato</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {publiReport.por_formato.map((f, i) => (
                            <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                              <p className="text-xs font-bold text-gray-900 capitalize">{f.formato}</p>
                              <p className="text-[10px] text-gray-500">{f.posts} posts</p>
                              <p className="text-xs font-semibold text-emerald-600 mt-1">{f.er_medio}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {publiReport.insight_maturidade && (
                      <div className="card p-5 border-purple-200 bg-purple-50/50">
                        <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <Target size={14} className="text-purple-500" /> Insight de Maturidade
                        </h4>
                        <p className="text-xs text-gray-700 leading-relaxed">{publiReport.insight_maturidade}</p>
                      </div>
                    )}

                    {publiReport.recomendacoes?.length > 0 && (
                      <div className="card p-5">
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <TrendingUp size={14} className="text-blue-500" /> Recomendacoes
                        </h4>
                        <div className="space-y-2">
                          {publiReport.recomendacoes.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-[10px]">{i + 1}</span>
                              <p>{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ Relatório para Cliente Result ═══ */}
                {publiClientReport && (
                  <div className="space-y-4" id="client-report">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <FileText size={14} className="text-blue-500" />
                        Relatorio — {selectedClientName || 'Cliente'} — {monthLabel}
                      </h3>
                      <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        <Printer size={12} /> Imprimir / PDF
                      </button>
                    </div>

                    {/* Resumo Executivo */}
                    <div className="card p-5 border-blue-200 bg-blue-50/50">
                      <h4 className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Resumo Executivo</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">{publiClientReport.resumo_executivo}</p>
                    </div>

                    {/* Números do Mês */}
                    <div className="card p-5">
                      <h4 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider">Numeros do Mes</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div><span className="text-gray-400">Posts:</span> <span className="font-semibold text-gray-900">{publiClientReport.numeros?.posts}</span></div>
                        <div><span className="text-gray-400">Impressoes:</span> <span className="font-semibold text-gray-900">{publiClientReport.numeros?.impressoes}</span></div>
                        <div><span className="text-gray-400">ER Medio:</span> <span className="font-semibold text-emerald-600">{publiClientReport.numeros?.er_medio}</span></div>
                        <div><span className="text-gray-400">Salvamentos:</span> <span className="font-semibold text-gray-900">{publiClientReport.numeros?.salvamentos || '—'}</span></div>
                        <div><span className="text-gray-400">Cliques no link:</span> <span className="font-semibold text-gray-900">{publiClientReport.numeros?.cliques_link || '—'}</span></div>
                        <div><span className="text-gray-400">Melhor post:</span> <span className="font-semibold text-gray-900">{publiClientReport.numeros?.melhor_post}</span></div>
                        <div className="col-span-2"><span className="text-gray-400">Pior post:</span> <span className="font-semibold text-gray-900">{publiClientReport.numeros?.pior_post}</span></div>
                        {publiClientReport.numeros?.hashtags_top?.length > 0 && (
                          <div className="col-span-2"><span className="text-gray-400">Hashtags top:</span> <span className="font-semibold text-orange-600">{publiClientReport.numeros.hashtags_top.join(', ')}</span></div>
                        )}
                      </div>
                    </div>

                    {/* Por Formato */}
                    {publiClientReport.por_formato?.length > 0 && (
                      <div className="card p-5">
                        <h4 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider">Analise por Formato</h4>
                        <div className="space-y-2">
                          {publiClientReport.por_formato.map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                              <span className="text-xs font-medium text-gray-900 capitalize">{f.formato}</span>
                              <span className="text-xs text-gray-500">{f.posts} posts</span>
                              <span className="text-xs font-semibold text-emerald-600">{f.er_medio}</span>
                              <span className="text-[10px] text-gray-500 max-w-[200px] truncate">{f.veredicto}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Por Plataforma */}
                    {publiClientReport.por_plataforma?.length > 0 && (
                      <div className="card p-5">
                        <h4 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider">Por Plataforma</h4>
                        <div className="space-y-2">
                          {publiClientReport.por_plataforma.map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                              <span className="text-xs font-medium text-gray-900 capitalize">{p.plataforma}</span>
                              <span className="text-xs text-gray-500">{p.posts} posts</span>
                              <span className="text-xs text-gray-500">{p.impressoes} imp.</span>
                              <span className="text-xs font-semibold text-emerald-600">{p.er_medio}</span>
                              <span className="text-[10px] text-gray-500 max-w-[200px] truncate">{p.veredicto}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observações da Consultora */}
                    <div className="card p-5">
                      <h4 className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider">Observacoes da Consultora</h4>
                      <textarea
                        value={publiNotes}
                        onChange={(e) => setPubliNotes(e.target.value)}
                        placeholder="Escreva suas observacoes pessoais aqui antes de enviar ao cliente..."
                        className="w-full text-xs border border-gray-200 rounded-xl p-3 min-h-[80px] outline-none focus:border-orange-300 resize-y"
                      />
                    </div>

                    {/* Próximos Passos */}
                    {publiClientReport.proximos_passos?.length > 0 && (
                      <div className="card p-5">
                        <h4 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider">Proximos Passos</h4>
                        <div className="space-y-2">
                          {publiClientReport.proximos_passos.map((p, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 text-[10px]">{i + 1}</span>
                              <p>{p}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resumo WhatsApp */}
                    {publiWhatsapp && (
                      <div className="card p-5 border-green-200 bg-green-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <MessageSquare size={12} className="text-green-600" /> Resumo para WhatsApp
                          </h4>
                          <button
                            onClick={() => copyToClipboard(publiWhatsapp)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <Copy size={10} /> Copiar
                          </button>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{publiWhatsapp}</p>
                      </div>
                    )}

                    <div className="text-center py-3 border-t border-gray-100">
                      <p className="text-[10px] text-gray-300">Relatorio gerado por Content Intelligence OS</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* ===== LINKEDIN ANALYTICS ===== */}
      {tab === 'linkedin' && (() => {
        const parseLinkedinCSV = (file) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            try {
              setLinkedinLoading(true)
              setLinkedinError(null)
              const text = e.target.result
              const lines = text.split('\n').filter(l => l.trim())
              const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

              const data = {
                period: { start: null, end: null },
                metrics: {
                  reach: 0,
                  impressions: 0,
                  newFollowers: 0,
                  totalFollowers: 0,
                  engagementRate: 0,
                  clicks: 0,
                },
                topJobs: [],
                seniorityBreakdown: {},
                companySize: {},
                rawData: lines.slice(1).map(line => {
                  const values = line.split(',').map(v => v.trim())
                  return headers.reduce((obj, h, i) => {
                    obj[h] = values[i] || ''
                    return obj
                  }, {})
                })
              }

              // Parse metrics
              data.rawData.forEach(row => {
                if (row.reach) data.metrics.reach += parseInt(row.reach) || 0
                if (row.impressions) data.metrics.impressions += parseInt(row.impressions) || 0
                if (row['new followers']) data.metrics.newFollowers += parseInt(row['new followers']) || 0
                if (row['total followers']) data.metrics.totalFollowers = parseInt(row['total followers']) || 0
                if (row['engagement rate']) {
                  const er = parseFloat(row['engagement rate'].replace('%', '')) || 0
                  data.metrics.engagementRate = Math.max(data.metrics.engagementRate, er)
                }
                if (row['clicks']) data.metrics.clicks += parseInt(row['clicks']) || 0
              })

              // Parse jobs and seniority
              const jobsMap = {}
              const seniorityMap = {}
              const companySizeMap = {}

              data.rawData.forEach(row => {
                if (row['job title']) {
                  jobsMap[row['job title']] = (jobsMap[row['job title']] || 0) + 1
                }
                if (row['seniority level']) {
                  seniorityMap[row['seniority level']] = (seniorityMap[row['seniority level']] || 0) + 1
                }
                if (row['company size']) {
                  companySizeMap[row['company size']] = (companySizeMap[row['company size']] || 0) + 1
                }
              })

              data.topJobs = Object.entries(jobsMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([job, count]) => ({ job, count }))
              data.seniorityBreakdown = seniorityMap
              data.companySize = companySizeMap

              setLinkedinData(data)
              setLinkedinLoading(false)
            } catch (err) {
              setLinkedinError(err.message)
              setLinkedinLoading(false)
            }
          }
          reader.readAsText(file)
        }

        const qualifiedAudienceCount = linkedinData?.rawData?.filter(r =>
          (r['seniority level']?.toLowerCase().includes('senior') ||
           r['seniority level']?.toLowerCase().includes('manager') ||
           r['job title']?.toLowerCase().includes('director') ||
           r['job title']?.toLowerCase().includes('ceo') ||
           r['job title']?.toLowerCase().includes('vp') ||
           r['job title']?.toLowerCase().includes('chief'))
        ).length || 0

        const qualifiedPercentage = linkedinData?.rawData?.length ? ((qualifiedAudienceCount / linkedinData.rawData.length) * 100).toFixed(1) : 0

        return (
          <div className="space-y-4">
            {/* Header com Upload */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">📊 Performance LinkedIn</h3>
                <button
                  onClick={() => linkedinRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Upload size={14} />
                  Importar CSV
                </button>
              </div>
              <input
                ref={linkedinRef}
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && parseLinkedinCSV(e.target.files[0])}
                className="hidden"
              />
              {linkedinError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  Erro ao processar arquivo: {linkedinError}
                </div>
              )}
            </div>

            {linkedinData ? (
              <>
                {/* Métricas Principais */}
                <div className="card p-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-4">Métricas Principais</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-600">Métrica</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-600">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-3 text-gray-700">Alcance</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-600">{linkedinData.metrics.reach.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-3 text-gray-700">Impressões</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-orange-600">{linkedinData.metrics.impressions.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-3 text-gray-700">Novos Seguidores</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{linkedinData.metrics.newFollowers.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-3 text-gray-700">Total de Seguidores</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-purple-600">{linkedinData.metrics.totalFollowers.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2.5 px-3 text-gray-700">Taxa de Engajamento</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-600">{linkedinData.metrics.engagementRate.toFixed(2)}%</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 text-gray-700">Cliques</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-sky-600">{linkedinData.metrics.clicks.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Perfil da Audiência */}
                <div className="card p-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-4">👥 Perfil da Audiência (Qualificação)</h4>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Top 3 Cargos</p>
                      <div className="space-y-1.5">
                        {linkedinData.topJobs.length ? (
                          linkedinData.topJobs.map((job, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{job.job}</span>
                              <span className="text-gray-500 font-medium">{job.count} {job.count === 1 ? 'perfil' : 'perfis'}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">—</p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Senioridade Dominante</p>
                      <div className="space-y-1.5">
                        {Object.entries(linkedinData.seniorityBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([seniority, count]) => {
                          const pct = ((count / linkedinData.rawData.length) * 100).toFixed(1)
                          return (
                            <div key={seniority} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{seniority}</span>
                              <span className="text-gray-500 font-medium">{pct}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Público Qualificado (Sênior + C-Level)</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-emerald-600 h-2.5 rounded-full"
                            style={{ width: `${Math.min(qualifiedPercentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">{qualifiedPercentage}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insights Estratégicos */}
                <div className="card p-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-4">💡 Insight Estratégico</h4>
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      • Alcance de <span className="font-semibold">{linkedinData.metrics.reach.toLocaleString()}</span> usuários com <span className="font-semibold">{linkedinData.metrics.newFollowers}</span> novos seguidores indica crescimento de <span className="font-semibold">{((linkedinData.metrics.newFollowers / linkedinData.metrics.totalFollowers) * 100).toFixed(2)}%</span>.
                    </p>
                    <p>
                      • Taxa de engajamento de <span className="font-semibold">{linkedinData.metrics.engagementRate.toFixed(2)}%</span> com {qualifiedPercentage}% de audiência qualificada (Sênior + C-Level).
                    </p>
                    <p>
                      • Foco em <span className="font-semibold">{linkedinData.topJobs[0]?.job || '—'}</span> como público-alvo primário. Continuar alinhando conteúdo com demandas profissionais de cargos sênior.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="card p-12 text-center">
                <AlertTriangle size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600 font-medium">Nenhum arquivo importado ainda</p>
                <p className="text-sm text-gray-400 mt-1">Clique em "Importar CSV" para carregar dados do LinkedIn</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ===== INSIGHTS IA ===== */}
      {tab === 'insights' && <AIInsights />}

      {/* ===== PLANEJADOR SEMANAL ===== */}
      {tab === 'planner' && <WeeklyPlanner />}

      <MetricsForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
