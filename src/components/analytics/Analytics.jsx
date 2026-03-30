import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import Papa from 'papaparse'
import useStore from '../../store/useStore'
import MetricsForm from './MetricsForm'
import AIInsights from './AIInsights'
import WeeklyPlanner from './WeeklyPlanner'
import { enrichMetric, timelineData, aggregateByFormat, aggregateByPlatform, topPosts } from '../../utils/analytics'
import { normalizeRow } from '../../utils/csvNormalizer'
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
}
const POST_TYPE_ICONS = { story: Film, reel: Play, carousel: Layers, image: Image, video: Play }
function PostTypeBadge({ type }) {
  if (!type) return null
  const style = POST_TYPE_STYLES[type] || 'bg-gray-100 text-gray-500 border-gray-200'
  const Icon = POST_TYPE_ICONS[type]
  const labels = { story: 'Story', reel: 'Reel', carousel: 'Carrossel', image: 'Imagem', video: 'Vídeo' }
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
  { id: 'insights', label: 'Insights IA' },
  { id: 'planner', label: 'Próxima Semana' },
]

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
  const addMetric = useStore((s) => s.addMetric)
  const deleteMetric = useStore((s) => s.deleteMetric)
  const addIdea = useStore((s) => s.addIdea)
  const clearMetrics = useStore((s) => s.clearMetrics)
  const navigate = useNavigate()
  const csvRef = useRef(null)

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
  const [postTabSort, setPostTabSort] = useState('date')
  const [collapsedZones, setCollapsedZones] = useState({})
  const [savedTemplates, setSavedTemplates] = useState({})

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
                if (!filterPostType) return true
                if (filterPostType === 'story') return m.post_type === 'story'
                if (filterPostType === 'feed') return m.post_type !== 'story'
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

            return (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Dados Brutos
                    <span className="ml-2 text-xs text-gray-400 font-normal">{enriched.length} entradas</span>
                  </h3>
                  {enriched.length > 0 && (
                    confirmClear ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-500">Apagar tudo?</span>
                        <button onClick={() => { clearMetrics(); setConfirmClear(false) }} className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600">Confirmar</button>
                        <button onClick={() => setConfirmClear(false)} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                        <AlertTriangle size={12} /> Limpar todos os dados
                      </button>
                    )
                  )}
                </div>

                {enriched.some((m) => m.post_type) && (
                  <div className="flex gap-1.5 mb-4">
                    {[
                      { id: '', label: 'Todos' },
                      { id: 'story', label: 'Stories' },
                      { id: 'feed', label: 'Feed' },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setFilterPostType(id)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all ${
                          filterPostType === id
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
                            <td className="py-2 px-2.5 max-w-[200px]">
                              <div className="flex items-center gap-1.5">
                                {m.description ? (
                                  <span className="text-gray-500 truncate block" title={m.description}>
                                    {m.description.slice(0, 50)}{m.description.length > 50 ? '…' : ''}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                                {m.link && (
                                  <a href={m.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-600">
                                    <ExternalLink size={11} />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2.5 text-gray-700">{m.impressions.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{m.reach.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{m.likes.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{m.comments.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{m.shares.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{m.saves.toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-500">{(m.follows || 0).toLocaleString()}</td>
                            <td className="py-2 px-2.5 text-gray-700 font-medium">{m.engagement.toLocaleString()}</td>
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
                  {['story', 'reel', 'carousel', 'image', 'video'].map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
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
                {(postTabSearch || postTabPlatform || postTabType || postTabDateFrom || postTabDateTo) && (
                  <button
                    onClick={() => { setPostTabSearch(''); setPostTabPlatform(''); setPostTabType(''); setPostTabDateFrom(''); setPostTabDateTo('') }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
                  >
                    <X size={10} /> Limpar filtros
                  </button>
                )}
                <span className="text-xs text-gray-400 ml-auto">{totalFiltered} resultado{totalFiltered !== 1 ? 's' : ''}</span>
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
                <button
                  onClick={() => csvRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Upload size={12} /> Importar CSV
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

      {/* ===== INSIGHTS IA ===== */}
      {tab === 'insights' && <AIInsights />}

      {/* ===== PLANEJADOR SEMANAL ===== */}
      {tab === 'planner' && <WeeklyPlanner />}

      <MetricsForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
