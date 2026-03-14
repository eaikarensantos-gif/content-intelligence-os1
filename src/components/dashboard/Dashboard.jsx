import { useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  Lightbulb, BarChart2, Eye, TrendingUp, Plus, ArrowRight,
  Sparkles, Radar, Zap, Video, Brain, Wand2, Calendar,
  ChevronRight, FileText, Film, Clock, Target, Flame,
  CheckCircle2, AlignLeft, Layers, Star, Bookmark,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { enrichMetric, aggregateByFormat } from '../../utils/analytics'
import { PlatformBadge, StatusBadge } from '../common/Badge'

// ── Helpers ───────────────────────────────────────────────────────────────────
const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6']
const STATUS_PT = { idea: 'Ideia', draft: 'Rascunho', ready: 'Pronto', published: 'Publicado' }
const STATUS_COLORS = { idea: 'bg-orange-400', draft: 'bg-blue-400', ready: 'bg-emerald-400', published: 'bg-violet-400' }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function daysAgo(dateStr) {
  if (!dateStr) return Infinity
  const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(diff)
}

function formatRelative(dateStr) {
  const d = daysAgo(dateStr)
  if (d === 0) return 'Hoje'
  if (d === 1) return 'Ontem'
  if (d < 7) return `${d} dias atrás`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-xs shadow-md">
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="text-gray-900 font-medium">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Pipeline Bar ──────────────────────────────────────────────────────────────
function PipelineBar({ statusCounts, total, navigate }) {
  const stages = [
    { key: 'idea', label: 'Ideias', count: statusCounts.idea, color: 'bg-orange-400', hoverBg: 'hover:bg-orange-50' },
    { key: 'draft', label: 'Rascunhos', count: statusCounts.draft, color: 'bg-blue-400', hoverBg: 'hover:bg-blue-50' },
    { key: 'ready', label: 'Prontos', count: statusCounts.ready, color: 'bg-emerald-400', hoverBg: 'hover:bg-emerald-50' },
    { key: 'published', label: 'Publicados', count: statusCounts.published, color: 'bg-violet-400', hoverBg: 'hover:bg-violet-50' },
  ]

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Layers size={14} className="text-orange-500" /> Pipeline de Conteúdo
        </h3>
        <button onClick={() => navigate('/ideas')} className="text-[11px] text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
          Ver Kanban <ChevronRight size={11} />
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 ? (
        <>
          <div className="flex rounded-full overflow-hidden h-3 mb-4 bg-gray-100">
            {stages.map(({ key, color, count }) => (
              count > 0 && (
                <div
                  key={key}
                  className={`${color} transition-all duration-500`}
                  style={{ width: `${(count / total) * 100}%` }}
                  title={`${STATUS_PT[key]}: ${count}`}
                />
              )
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stages.map(({ key, label, count, color, hoverBg }) => (
              <button
                key={key}
                onClick={() => navigate('/ideas')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 ${hoverBg} transition-all text-left`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{count}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-6">
          <p className="text-xs text-gray-400 mb-3">Nenhuma ideia no pipeline ainda</p>
          <button onClick={() => navigate('/ideas')} className="btn-primary text-xs mx-auto">
            <Plus size={13} /> Criar Primeira Ideia
          </button>
        </div>
      )}
    </div>
  )
}

// ── Activity Feed ─────────────────────────────────────────────────────────────
function ActivityFeed({ activities, navigate }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock size={20} className="text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-400">Nenhuma atividade recente</p>
        <p className="text-[10px] text-gray-300 mt-1">Crie ideias, analise vídeos ou explore tendências para começar</p>
      </div>
    )
  }

  const ACTIVITY_META = {
    idea:     { icon: Lightbulb, color: 'bg-orange-100 text-orange-600', label: 'Nova ideia' },
    video:    { icon: Video, color: 'bg-violet-100 text-violet-600', label: 'Vídeo analisado' },
    thought:  { icon: Brain, color: 'bg-cyan-100 text-cyan-600', label: 'Pensamento capturado' },
    insight:  { icon: Sparkles, color: 'bg-amber-100 text-amber-600', label: 'Insight gerado' },
    trend:    { icon: Radar, color: 'bg-blue-100 text-blue-600', label: 'Tendência explorada' },
  }

  return (
    <div className="space-y-1.5">
      {activities.slice(0, 8).map((act, i) => {
        const meta = ACTIVITY_META[act.type] || ACTIVITY_META.idea
        const Icon = meta.icon
        return (
          <button
            key={i}
            onClick={() => navigate(act.to)}
            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
          >
            <div className={`w-7 h-7 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
              <Icon size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-800 font-medium truncate">{act.title}</p>
              <p className="text-[10px] text-gray-400">{meta.label} · {formatRelative(act.date)}</p>
            </div>
            <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
          </button>
        )
      })}
    </div>
  )
}

// ── Quick Action Card ─────────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, sub, to, gradient, iconColor, navigate, badge }) {
  return (
    <button
      onClick={() => navigate(to)}
      className={`bg-gradient-to-br ${gradient} border rounded-xl p-3 sm:p-4 text-left hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 relative overflow-hidden group`}
    >
      <div className="flex items-start justify-between">
        <Icon size={18} className={`${iconColor} mb-1.5`} />
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/80 text-gray-600 border border-white">
            {badge}
          </span>
        )}
      </div>
      <div className="text-xs sm:text-sm font-semibold text-gray-800">{label}</div>
      <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{sub}</div>
      <ArrowRight size={12} className="absolute bottom-3 right-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </button>
  )
}

// ── Upcoming Calendar ─────────────────────────────────────────────────────────
function UpcomingSchedule({ ideas, navigate }) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = ideas
    .filter(i => i.scheduled_date && i.scheduled_date >= today)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 5)

  const overdue = ideas
    .filter(i => i.scheduled_date && i.scheduled_date < today && i.status !== 'published')

  if (upcoming.length === 0 && overdue.length === 0) {
    return (
      <div className="text-center py-6">
        <Calendar size={20} className="text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-400 mb-2">Nenhum conteúdo agendado</p>
        <button onClick={() => navigate('/ideas')} className="text-[11px] text-orange-600 font-medium hover:underline">
          Agendar ideias →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {overdue.length > 0 && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <p className="text-[11px] text-red-600 font-medium">{overdue.length} atrasada{overdue.length > 1 ? 's' : ''}</p>
        </div>
      )}
      {upcoming.map((idea) => {
        const date = new Date(idea.scheduled_date + 'T12:00:00')
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' })
        const dayNum = date.getDate()
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
        const isToday = idea.scheduled_date === today
        return (
          <button
            key={idea.id}
            onClick={() => navigate('/ideas')}
            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-orange-50/50 transition-colors text-left"
          >
            <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              <span className="text-[9px] font-medium uppercase leading-none">{dayName}</span>
              <span className="text-sm font-bold leading-none">{dayNum}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{idea.title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <PlatformBadge platform={idea.platform || idea.platforms?.[0]} />
                <StatusBadge status={idea.status} />
                {isToday && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">HOJE</span>}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Smart Suggestion ──────────────────────────────────────────────────────────
function SmartSuggestion({ ideas, videoAnalyses, thoughtCaptures, insights, navigate }) {
  const readyCount = ideas.filter(i => i.status === 'ready').length
  const draftCount = ideas.filter(i => i.status === 'draft').length
  const noDateCount = ideas.filter(i => !i.scheduled_date && i.status !== 'published').length
  const hasApiKey = !!localStorage.getItem('cio-anthropic-key')

  let suggestion = null

  if (readyCount >= 3) {
    suggestion = {
      icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      text: `Você tem ${readyCount} conteúdos prontos para publicar! Hora de colocar no mundo.`,
      action: 'Ver Prontos', to: '/ideas',
    }
  } else if (ideas.length === 0) {
    suggestion = {
      icon: Lightbulb, color: 'text-orange-600 bg-orange-50 border-orange-200',
      text: 'Comece capturando um pensamento ou explorando tendências do seu nicho.',
      action: 'Capturar Pensamento', to: '/thoughts',
    }
  } else if (noDateCount > 5) {
    suggestion = {
      icon: Calendar, color: 'text-blue-600 bg-blue-50 border-blue-200',
      text: `${noDateCount} ideias sem data. Agende-as no calendário para manter consistência.`,
      action: 'Abrir Calendário', to: '/ideas',
    }
  } else if (draftCount >= 3) {
    suggestion = {
      icon: AlignLeft, color: 'text-violet-600 bg-violet-50 border-violet-200',
      text: `${draftCount} rascunhos esperando. Finalize-os para manter seu pipeline fluindo.`,
      action: 'Ver Rascunhos', to: '/ideas',
    }
  } else if (hasApiKey && videoAnalyses.length === 0) {
    suggestion = {
      icon: Video, color: 'text-purple-600 bg-purple-50 border-purple-200',
      text: 'Analise um vídeo de referência para extrair estruturas e ideias de conteúdo.',
      action: 'Analisar Vídeo', to: '/video',
    }
  } else if (hasApiKey && thoughtCaptures.length === 0) {
    suggestion = {
      icon: Brain, color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      text: 'Capture um pensamento e transforme-o em 7 formatos de conteúdo prontos para usar.',
      action: 'Capturar Pensamento', to: '/thoughts',
    }
  }

  if (!suggestion) return null
  const Icon = suggestion.icon

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${suggestion.color}`}>
      <Icon size={16} className="shrink-0" />
      <p className="text-xs flex-1">{suggestion.text}</p>
      <button onClick={() => navigate(suggestion.to)} className="text-[11px] font-semibold whitespace-nowrap hover:underline flex items-center gap-1">
        {suggestion.action} <ArrowRight size={11} />
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate()
  const ideas = useStore((s) => s.ideas)
  const posts = useStore((s) => s.posts)
  const metrics = useStore((s) => s.metrics)
  const insights = useStore((s) => s.insights)
  const videoAnalyses = useStore((s) => s.videoAnalyses)
  const thoughtCaptures = useStore((s) => s.thoughtCaptures)
  const trendResults = useStore((s) => s.trendResults)

  // ── Computed data ───────────────────────────────────────────────────────────
  const statusCounts = {
    idea: ideas.filter((i) => i.status === 'idea').length,
    draft: ideas.filter((i) => i.status === 'draft').length,
    ready: ideas.filter((i) => i.status === 'ready').length,
    published: ideas.filter((i) => i.status === 'published').length,
  }

  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions || 0), 0)
  const avgER = metrics.length
    ? (metrics.reduce((s, m) => s + enrichMetric(m).engagement_rate, 0) / metrics.length * 100).toFixed(1)
    : 0

  const byFormat = aggregateByFormat(posts, metrics).map((d) => ({
    name: d.format.charAt(0).toUpperCase() + d.format.slice(1),
    engajamento: +(d.avg_engagement_rate * 100).toFixed(2),
    posts: d.count,
  }))

  const pieData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name: STATUS_PT[name] || name, value }))
    .filter(d => d.value > 0)

  // ── Activity feed (all features merged, sorted by date) ─────────────────────
  const activities = useMemo(() => {
    const items = []
    ideas.forEach(i => items.push({ type: 'idea', title: i.title, date: i.created_at, to: '/ideas' }))
    videoAnalyses.forEach(v => items.push({ type: 'video', title: v.title || v.url || 'Vídeo analisado', date: v.analyzed_at, to: '/video' }))
    thoughtCaptures.forEach(t => items.push({ type: 'thought', title: t.original_thought?.slice(0, 80) || 'Pensamento', date: t.created_at, to: '/thoughts' }))
    insights.forEach(ins => items.push({ type: 'insight', title: ins.description || ins.text || 'Insight', date: ins.created_at, to: '/analytics' }))
    if (trendResults?.topic) items.push({ type: 'trend', title: `Tendências: ${trendResults.topic}`, date: new Date().toISOString(), to: '/trends' })
    return items.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [ideas, videoAnalyses, thoughtCaptures, insights, trendResults])

  const hasApiKey = !!localStorage.getItem('cio-anthropic-key')

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5 animate-fade-in">

      {/* ── Welcome Banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50 via-orange-50/80 to-white border border-orange-200 p-4 sm:p-6">
        <div className="relative z-10">
          <p className="text-xs text-orange-500 font-medium mb-1">{getGreeting()}, Criador</p>
          <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-2">Seu sistema de conteúdo está ativo</h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 leading-relaxed">
            <span className="text-orange-600 font-medium">{ideas.length} ideia{ideas.length !== 1 ? 's' : ''}</span> no banco
            {statusCounts.ready > 0 && <> · <span className="text-emerald-600 font-medium">{statusCounts.ready} pronta{statusCounts.ready !== 1 ? 's' : ''}</span> para publicar</>}
            {statusCounts.draft > 0 && <> · <span className="text-blue-600 font-medium">{statusCounts.draft} em rascunho</span></>}
            {videoAnalyses.length > 0 && <> · <span className="text-violet-600 font-medium">{videoAnalyses.length} vídeo{videoAnalyses.length !== 1 ? 's' : ''}</span> analisado{videoAnalyses.length !== 1 ? 's' : ''}</>}
            {thoughtCaptures.length > 0 && <> · <span className="text-cyan-600 font-medium">{thoughtCaptures.length} pensamento{thoughtCaptures.length !== 1 ? 's' : ''}</span> capturado{thoughtCaptures.length !== 1 ? 's' : ''}</>}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate('/ideas')} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={13} /> Nova Ideia
            </button>
            <button onClick={() => navigate('/thoughts')} className="btn-secondary text-xs py-1.5 px-3">
              <Brain size={13} /> Capturar Pensamento
            </button>
            <button onClick={() => navigate('/trends')} className="btn-secondary text-xs py-1.5 px-3 hidden sm:flex">
              <Radar size={13} /> Explorar Tendências
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-orange-100/30 to-transparent pointer-events-none" />
      </div>

      {/* ── Smart Suggestion ────────────────────────────────────────────────── */}
      <SmartSuggestion
        ideas={ideas}
        videoAnalyses={videoAnalyses}
        thoughtCaptures={thoughtCaptures}
        insights={insights}
        navigate={navigate}
      />

      {/* ── Pipeline de Conteúdo ────────────────────────────────────────────── */}
      <PipelineBar statusCounts={statusCounts} total={ideas.length} navigate={navigate} />

      {/* ── Stats Row (compact) ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => navigate('/video')} className="card p-3 sm:p-4 border border-gray-100 hover:border-violet-200 transition-all text-left group">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Video size={14} className="text-violet-600" />
            </div>
            <ChevronRight size={12} className="text-gray-300 group-hover:text-violet-400" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{videoAnalyses.length}</p>
          <p className="text-[10px] sm:text-xs text-gray-400">Vídeos analisados</p>
        </button>

        <button onClick={() => navigate('/thoughts')} className="card p-3 sm:p-4 border border-gray-100 hover:border-cyan-200 transition-all text-left group">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
              <Brain size={14} className="text-cyan-600" />
            </div>
            <ChevronRight size={12} className="text-gray-300 group-hover:text-cyan-400" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{thoughtCaptures.length}</p>
          <p className="text-[10px] sm:text-xs text-gray-400">Pensamentos capturados</p>
        </button>

        <button onClick={() => navigate('/analytics')} className="card p-3 sm:p-4 border border-gray-100 hover:border-emerald-200 transition-all text-left group">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Eye size={14} className="text-emerald-600" />
            </div>
            <ChevronRight size={12} className="text-gray-300 group-hover:text-emerald-400" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{totalImpressions > 0 ? totalImpressions.toLocaleString() : '—'}</p>
          <p className="text-[10px] sm:text-xs text-gray-400">Impressões totais</p>
        </button>

        <button onClick={() => navigate('/analytics')} className="card p-3 sm:p-4 border border-gray-100 hover:border-amber-200 transition-all text-left group">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingUp size={14} className="text-amber-600" />
            </div>
            <ChevronRight size={12} className="text-gray-300 group-hover:text-amber-400" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{avgER > 0 ? `${avgER}%` : '—'}</p>
          <p className="text-[10px] sm:text-xs text-gray-400">Engajamento médio</p>
        </button>
      </div>

      {/* ── Middle Row: Charts + Calendar + Activity ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Engajamento por Formato (or placeholder) */}
        <div className="card p-4 sm:p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <BarChart2 size={14} className="text-orange-500" /> Engajamento por Formato
          </h3>
          <p className="text-[10px] text-gray-400 mb-4">Taxa média de engajamento (%) por formato de conteúdo</p>
          {byFormat.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byFormat} barSize={24} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="engajamento" name="Engajamento %" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center">
              <BarChart2 size={24} className="text-gray-200 mb-2" />
              <p className="text-xs text-gray-400 text-center">Adicione métricas em<br/><span className="text-orange-600 font-medium">Analytics</span> para ver o gráfico</p>
              <button onClick={() => navigate('/analytics')} className="text-[11px] text-orange-600 font-medium mt-2 hover:underline">
                Ir para Analytics →
              </button>
            </div>
          )}
        </div>

        {/* Center: Agenda Próxima */}
        <div className="card p-4 sm:p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" /> Próximos Conteúdos
            </h3>
            <button onClick={() => navigate('/ideas')} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Calendário <ChevronRight size={11} />
            </button>
          </div>
          <UpcomingSchedule ideas={ideas} navigate={navigate} />
        </div>

        {/* Right: Atividade Recente */}
        <div className="card p-4 sm:p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={14} className="text-gray-400" /> Atividade Recente
          </h3>
          <ActivityFeed activities={activities} navigate={navigate} />
        </div>
      </div>

      {/* ── Quick Actions (all features) ────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap size={14} className="text-orange-500" /> Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <QuickAction
            icon={Plus} label="Nova Ideia" sub="Criar manualmente"
            to="/ideas" navigate={navigate}
            gradient="from-orange-50 to-orange-100/50 border-orange-200" iconColor="text-orange-500"
          />
          <QuickAction
            icon={Brain} label="Pensamento" sub="Capturar e transformar"
            to="/thoughts" navigate={navigate}
            gradient="from-cyan-50 to-cyan-100/50 border-cyan-200" iconColor="text-cyan-500"
            badge={thoughtCaptures.length > 0 ? `${thoughtCaptures.length}` : null}
          />
          <QuickAction
            icon={Wand2} label="Text Studio" sub="Adaptar textos com IA"
            to="/text" navigate={navigate}
            gradient="from-violet-50 to-violet-100/50 border-violet-200" iconColor="text-violet-500"
          />
          <QuickAction
            icon={Video} label="Analisar Vídeo" sub="Extrair estruturas"
            to="/video" navigate={navigate}
            gradient="from-purple-50 to-purple-100/50 border-purple-200" iconColor="text-purple-500"
            badge={videoAnalyses.length > 0 ? `${videoAnalyses.length}` : null}
          />
          <QuickAction
            icon={Radar} label="Tendências" sub="Criadores e padrões"
            to="/trends" navigate={navigate}
            gradient="from-blue-50 to-blue-100/50 border-blue-200" iconColor="text-blue-500"
          />
          <QuickAction
            icon={Flame} label="Gerar Ideias" sub="IA + sinais culturais"
            to="/ideas" navigate={navigate}
            gradient="from-amber-50 to-amber-100/50 border-amber-200" iconColor="text-amber-500"
          />
        </div>
      </div>

      {/* ── Insights Spotlight (if available) ───────────────────────────────── */}
      {insights.length > 0 && (
        <div className="card p-4 sm:p-5 border border-amber-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" /> Insights do Seu Conteúdo
            </h3>
            <button onClick={() => navigate('/analytics')} className="text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              Ver todos <ChevronRight size={11} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {insights.slice(0, 3).map((ins, i) => (
              <div key={ins.id || i} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <Star size={11} className="text-amber-500" />
                  <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">{ins.type || 'Insight'}</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{ins.description || ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ideias por Status (pie) — compact, only if has ideas ─────────────── */}
      {ideas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Layers size={14} className="text-gray-400" /> Distribuição por Status
            </h3>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={55} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {Object.entries(statusCounts).map(([key, count], i) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-xs text-gray-600">{STATUS_PT[key]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                      {ideas.length > 0 && (
                        <span className="text-[10px] text-gray-400">
                          ({Math.round((count / ideas.length) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent ideas */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Lightbulb size={14} className="text-orange-500" /> Últimas Ideias
              </h3>
              <button onClick={() => navigate('/ideas')} className="text-[11px] text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1">
                Ver todas <ChevronRight size={11} />
              </button>
            </div>
            <div className="space-y-1.5">
              {[...ideas].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map((idea) => (
                <button
                  key={idea.id}
                  onClick={() => navigate('/ideas')}
                  className="flex items-start gap-3 w-full p-2.5 rounded-xl hover:bg-orange-50/50 transition-colors text-left group"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${STATUS_COLORS[idea.status] || 'bg-orange-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{idea.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <PlatformBadge platform={idea.platform || idea.platforms?.[0]} />
                      <StatusBadge status={idea.status} />
                      {idea.tags?.length > 0 && (
                        <span className="text-[9px] text-gray-400">{idea.tags[0]}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-300 shrink-0">{formatRelative(idea.created_at)}</span>
                </button>
              ))}
              {ideas.length === 0 && (
                <p className="text-xs text-gray-400 py-6 text-center">Nenhuma ideia ainda. Comece criando uma!</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
