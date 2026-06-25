import { useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  Lightbulb, BarChart2, Eye, TrendingUp, Plus, ArrowRight,
  Sparkles, Radar, Zap, Video, Brain, Wand2, Calendar,
  ChevronRight, Clock, Target, Flame,
  CheckCircle2, AlignLeft, Layers, Star, ClipboardList,
  Instagram, Youtube, Linkedin, Trophy, AlertCircle,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { enrichMetric, aggregateByFormat, aggregateByPlatform, topPosts } from '../../utils/analytics'
import { PlatformBadge, StatusBadge } from '../common/Badge'

// ── Helpers ───────────────────────────────────────────────────────────────────
const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6']
const STATUS_PT = { idea: 'Ideia', draft: 'Rascunho', ready: 'Pronto', published: 'Publicado' }
const STATUS_COLORS = { idea: 'bg-orange-400', draft: 'bg-blue-400', ready: 'bg-emerald-400', published: 'bg-violet-400' }
const TASK_STATUS_COLORS = { todo: 'bg-gray-300', in_progress: 'bg-blue-400', done: 'bg-emerald-400', blocked: 'bg-red-400' }
const TASK_STATUS_PT = { todo: 'A Fazer', in_progress: 'Em Andamento', done: 'Concluída', blocked: 'Bloqueada' }

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

// ── Top Posts ─────────────────────────────────────────────────────────────────
function TopPostsCard({ posts, metrics, navigate }) {
  const best = useMemo(() => topPosts(posts, metrics, 5), [posts, metrics])

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Trophy size={14} className="text-amber-500" /> Top Posts
        </h3>
        <button onClick={() => navigate('/analytics')} className="text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
          Ver Analytics <ChevronRight size={11} />
        </button>
      </div>

      {best.length > 0 ? (
        <div className="space-y-2">
          {best.map((item, i) => {
            const er = item.metric ? (enrichMetric(item.metric).engagement_rate * 100).toFixed(1) : null
            return (
              <div key={item.post.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-amber-50/50 transition-colors">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{item.post.title || item.post.topic || 'Post sem título'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <PlatformBadge platform={item.metric?.platform || item.post.platform} />
                    {er && <span className="text-[10px] text-emerald-600 font-semibold">{er}% eng.</span>}
                    {item.metric?.impressions > 0 && (
                      <span className="text-[10px] text-gray-400">{item.metric.impressions.toLocaleString()} imp.</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="h-44 flex flex-col items-center justify-center">
          <Trophy size={24} className="text-gray-200 mb-2" />
          <p className="text-xs text-gray-400 text-center">Importe métricas em<br/><span className="text-amber-600 font-medium">Analytics</span> para ver seus top posts</p>
          <button onClick={() => navigate('/analytics')} className="text-[11px] text-amber-600 font-medium mt-2 hover:underline">
            Ir para Analytics →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tasks Overview ────────────────────────────────────────────────────────────
function TasksOverview({ tasks, navigate }) {
  const todo = tasks.filter(t => t.status === 'todo')
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const done = tasks.filter(t => t.status === 'done')
  const blocked = tasks.filter(t => t.status === 'blocked')

  const today = new Date().toISOString().slice(0, 10)
  const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done')
  const dueToday = tasks.filter(t => t.due_date === today && t.status !== 'done')

  const recent = [...tasks]
    .filter(t => t.status !== 'done')
    .sort((a, b) => (a.due_date || '9999') > (b.due_date || '9999') ? 1 : -1)
    .slice(0, 4)

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList size={14} className="text-blue-500" /> Tarefas
        </h3>
        <button onClick={() => navigate('/tasks')} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          Ver todas <ChevronRight size={11} />
        </button>
      </div>

      {tasks.length > 0 ? (
        <>
          {/* Alertas */}
          {overdue.length > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100 mb-3">
              <AlertCircle size={12} className="text-red-500 shrink-0" />
              <p className="text-[11px] text-red-600 font-medium">{overdue.length} tarefa{overdue.length > 1 ? 's' : ''} atrasada{overdue.length > 1 ? 's' : ''}</p>
            </div>
          )}
          {dueToday.length > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100 mb-3">
              <Clock size={12} className="text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-600 font-medium">{dueToday.length} tarefa{dueToday.length > 1 ? 's' : ''} para hoje</p>
            </div>
          )}

          {/* Contadores */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[
              { label: 'A Fazer', count: todo.length, color: 'text-gray-600', bg: 'bg-gray-50' },
              { label: 'Em Andamento', count: inProgress.length, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Concluídas', count: done.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Bloqueadas', count: blocked.length, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className={`${bg} rounded-lg p-2 text-center`}>
                <p className={`text-base font-bold ${color}`}>{count}</p>
                <p className="text-[9px] text-gray-400 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Lista recente */}
          <div className="space-y-1.5">
            {recent.map(task => (
              <button
                key={task.id}
                onClick={() => navigate('/tasks')}
                className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${TASK_STATUS_COLORS[task.status] || 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 font-medium truncate">{task.title}</p>
                  {task.due_date && (
                    <p className={`text-[10px] ${task.due_date < today ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      Vence {formatRelative(task.due_date)}
                    </p>
                  )}
                </div>
                <ChevronRight size={11} className="text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="h-36 flex flex-col items-center justify-center">
          <ClipboardList size={24} className="text-gray-200 mb-2" />
          <p className="text-xs text-gray-400 mb-2">Nenhuma tarefa criada</p>
          <button onClick={() => navigate('/tasks')} className="text-[11px] text-blue-600 font-medium hover:underline">
            Criar primeira tarefa →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Platform Breakdown ────────────────────────────────────────────────────────
function PlatformBreakdown({ posts, metrics, navigate }) {
  const byPlatform = useMemo(() =>
    aggregateByPlatform(posts, metrics)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5)
      .map(d => ({
        name: d.platform?.charAt(0).toUpperCase() + d.platform?.slice(1) || 'Outros',
        impressões: d.impressions,
        engajamento: +(d.avg_engagement_rate * 100).toFixed(2),
        posts: d.count,
      })),
    [posts, metrics]
  )

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <BarChart2 size={14} className="text-orange-500" /> Performance por Plataforma
        </h3>
        <button onClick={() => navigate('/analytics')} className="text-[11px] text-orange-600 font-medium flex items-center gap-1">
          Detalhes <ChevronRight size={11} />
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mb-4">Impressões totais por plataforma</p>

      {byPlatform.length > 0 ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={byPlatform} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="impressões" name="Impressões" fill="#f97316" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-40 flex flex-col items-center justify-center">
          <BarChart2 size={24} className="text-gray-200 mb-2" />
          <p className="text-xs text-gray-400 text-center">Importe métricas em<br/><span className="text-orange-600 font-medium">Analytics</span> para ver o breakdown</p>
          <button onClick={() => navigate('/analytics')} className="text-[11px] text-orange-600 font-medium mt-2 hover:underline">
            Importar dados →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Upcoming Schedule ─────────────────────────────────────────────────────────
function UpcomingSchedule({ ideas, navigate }) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = ideas
    .filter(i => i.scheduled_date && i.scheduled_date >= today)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 4)
  const overdue = ideas.filter(i => i.scheduled_date && i.scheduled_date < today && i.status !== 'published')

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
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <p className="text-[11px] text-red-600 font-medium">{overdue.length} atrasada{overdue.length > 1 ? 's' : ''}</p>
        </div>
      )}
      {upcoming.map((idea) => {
        const date = new Date(idea.scheduled_date + 'T12:00:00')
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' })
        const dayNum = date.getDate()
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
function SmartSuggestion({ ideas, metrics, tasks, navigate }) {
  const readyCount = ideas.filter(i => i.status === 'ready').length
  const draftCount = ideas.filter(i => i.status === 'draft').length
  const noDateCount = ideas.filter(i => !i.scheduled_date && i.status !== 'published').length
  const today = new Date().toISOString().slice(0, 10)
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done')

  let suggestion = null

  if (overdueTasks.length > 0) {
    suggestion = {
      icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-200',
      text: `Você tem ${overdueTasks.length} tarefa${overdueTasks.length > 1 ? 's' : ''} atrasada${overdueTasks.length > 1 ? 's' : ''}. Resolva logo para manter o ritmo.`,
      action: 'Ver Tarefas', to: '/tasks',
    }
  } else if (readyCount >= 3) {
    suggestion = {
      icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      text: `Você tem ${readyCount} conteúdos prontos para publicar! Hora de colocar no mundo.`,
      action: 'Ver Prontos', to: '/ideas',
    }
  } else if (metrics.length === 0 && ideas.filter(i => i.status === 'published').length > 0) {
    suggestion = {
      icon: BarChart2, color: 'text-orange-600 bg-orange-50 border-orange-200',
      text: 'Você tem conteúdo publicado. Importe as métricas para ver o que está performando melhor.',
      action: 'Importar Métricas', to: '/analytics',
    }
  } else if (ideas.length === 0) {
    suggestion = {
      icon: Lightbulb, color: 'text-orange-600 bg-orange-50 border-orange-200',
      text: 'Comece capturando um pensamento ou gerando ideias com IA.',
      action: 'Gerar Ideias', to: '/generate',
    }
  } else if (noDateCount > 5) {
    suggestion = {
      icon: Calendar, color: 'text-blue-600 bg-blue-50 border-blue-200',
      text: `${noDateCount} ideias sem data. Agende-as para manter consistência.`,
      action: 'Abrir Calendário', to: '/ideas',
    }
  } else if (draftCount >= 3) {
    suggestion = {
      icon: AlignLeft, color: 'text-violet-600 bg-violet-50 border-violet-200',
      text: `${draftCount} rascunhos esperando. Finalize-os para manter o pipeline fluindo.`,
      action: 'Ver Rascunhos', to: '/ideas',
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
  const tasks = useStore((s) => s.tasks)

  // ── Computed ────────────────────────────────────────────────────────────────
  const statusCounts = {
    idea: ideas.filter((i) => i.status === 'idea').length,
    draft: ideas.filter((i) => i.status === 'draft').length,
    ready: ideas.filter((i) => i.status === 'ready').length,
    published: ideas.filter((i) => i.status === 'published').length,
  }

  const totalImpressions = metrics.reduce((s, m) => s + (m.impressions || 0), 0)
  const totalEngagement = metrics.reduce((s, m) => s + enrichMetric(m).engagement, 0)
  const avgER = metrics.length
    ? (metrics.reduce((s, m) => s + enrichMetric(m).engagement_rate, 0) / metrics.length * 100).toFixed(1)
    : 0
  const tasksOpen = tasks.filter(t => t.status !== 'done').length

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
            {tasksOpen > 0 && <> · <span className="text-blue-600 font-medium">{tasksOpen} tarefa{tasksOpen !== 1 ? 's' : ''}</span> em aberto</>}
            {metrics.length > 0 && <> · <span className="text-violet-600 font-medium">{metrics.length} post{metrics.length !== 1 ? 's' : ''}</span> com métricas</>}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate('/ideas')} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={13} /> Nova Ideia
            </button>
            <button onClick={() => navigate('/create')} className="btn-secondary text-xs py-1.5 px-3">
              <Wand2 size={13} /> Studio de Criação
            </button>
            <button onClick={() => navigate('/analytics')} className="btn-secondary text-xs py-1.5 px-3 hidden sm:flex">
              <BarChart2 size={13} /> Analytics
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-orange-100/30 to-transparent pointer-events-none" />
      </div>

      {/* ── Smart Suggestion ────────────────────────────────────────────────── */}
      <SmartSuggestion ideas={ideas} metrics={metrics} tasks={tasks} navigate={navigate} />

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

        <button onClick={() => navigate('/analytics')} className="card p-3 sm:p-4 border border-gray-100 hover:border-violet-200 transition-all text-left group">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Zap size={14} className="text-violet-600" />
            </div>
            <ChevronRight size={12} className="text-gray-300 group-hover:text-violet-400" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{totalEngagement > 0 ? totalEngagement.toLocaleString() : '—'}</p>
          <p className="text-[10px] sm:text-xs text-gray-400">Engajamento total</p>
        </button>

        <button onClick={() => navigate('/tasks')} className="card p-3 sm:p-4 border border-gray-100 hover:border-blue-200 transition-all text-left group">
          <div className="flex items-center justify-between mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ClipboardList size={14} className="text-blue-600" />
            </div>
            <ChevronRight size={12} className="text-gray-300 group-hover:text-blue-400" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{tasksOpen}</p>
          <p className="text-[10px] sm:text-xs text-gray-400">Tarefas em aberto</p>
        </button>
      </div>

      {/* ── Pipeline ────────────────────────────────────────────────────────── */}
      <PipelineBar statusCounts={statusCounts} total={ideas.length} navigate={navigate} />

      {/* ── Charts + Calendar + Tasks ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PlatformBreakdown posts={posts} metrics={metrics} navigate={navigate} />

        <div className="card p-4 sm:p-5">
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

        <TasksOverview tasks={tasks} navigate={navigate} />
      </div>

      {/* ── Top Posts + Insights ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopPostsCard posts={posts} metrics={metrics} navigate={navigate} />

        {insights.length > 0 ? (
          <div className="card p-4 sm:p-5 border border-amber-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" /> Insights do Seu Conteúdo
              </h3>
              <button onClick={() => navigate('/analytics')} className="text-[11px] text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                Ver todos <ChevronRight size={11} />
              </button>
            </div>
            <div className="space-y-2">
              {insights.slice(0, 4).map((ins, i) => (
                <div key={ins.id || i} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Star size={11} className="text-amber-500" />
                    <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">{ins.type || 'Insight'}</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{ins.description || ins.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Lightbulb size={14} className="text-orange-500" /> Últimas Ideias
              </h3>
              <button onClick={() => navigate('/ideas')} className="text-[11px] text-orange-600 font-medium flex items-center gap-1">
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
        )}
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap size={14} className="text-orange-500" /> Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <QuickAction icon={Plus} label="Nova Ideia" sub="Criar manualmente" to="/ideas" navigate={navigate}
            gradient="from-orange-50 to-orange-100/50 border-orange-200" iconColor="text-orange-500" />
          <QuickAction icon={Brain} label="Pensamento" sub="Capturar e transformar" to="/thoughts" navigate={navigate}
            gradient="from-cyan-50 to-cyan-100/50 border-cyan-200" iconColor="text-cyan-500"
            badge={thoughtCaptures.length > 0 ? `${thoughtCaptures.length}` : null} />
          <QuickAction icon={Wand2} label="Text Studio" sub="Adaptar textos com IA" to="/text" navigate={navigate}
            gradient="from-violet-50 to-violet-100/50 border-violet-200" iconColor="text-violet-500" />
          <QuickAction icon={Video} label="Analisar Vídeo" sub="Extrair estruturas" to="/video" navigate={navigate}
            gradient="from-purple-50 to-purple-100/50 border-purple-200" iconColor="text-purple-500"
            badge={videoAnalyses.length > 0 ? `${videoAnalyses.length}` : null} />
          <QuickAction icon={Radar} label="Tendências" sub="Criadores e padrões" to="/trends" navigate={navigate}
            gradient="from-blue-50 to-blue-100/50 border-blue-200" iconColor="text-blue-500" />
          <QuickAction icon={Flame} label="Gerar Ideias" sub="IA + sinais culturais" to="/generate" navigate={navigate}
            gradient="from-amber-50 to-amber-100/50 border-amber-200" iconColor="text-amber-500" />
        </div>
      </div>

    </div>
  )
}
