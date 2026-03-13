import { useState } from 'react'
import {
  Sparkles, RefreshCw, TrendingUp, Award, BarChart2,
  Layers, MessageSquare, Loader2, Clock, Filter,
  ChevronRight, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { InsightTypeBadge } from '../common/Badge'

const INSIGHT_TYPES = [
  { id: 'all', label: 'Todos' },
  { id: 'platform', label: 'Plataforma' },
  { id: 'format', label: 'Formato' },
  { id: 'hook', label: 'Gancho' },
  { id: 'topic', label: 'Tópico' },
  { id: 'time', label: 'Horário' },
  { id: 'summary', label: 'Resumo' },
]

const ICONS = {
  format: Layers,
  hook: MessageSquare,
  platform: TrendingUp,
  summary: BarChart2,
  topic: Award,
  time: Clock,
}

const CARD_COLORS = {
  format: 'border-indigo-200 bg-indigo-50/60',
  hook: 'border-amber-200 bg-amber-50/60',
  platform: 'border-blue-200 bg-blue-50/60',
  summary: 'border-orange-200 bg-orange-50/60',
  topic: 'border-emerald-200 bg-emerald-50/60',
  time: 'border-violet-200 bg-violet-50/60',
}

const ICON_COLORS = {
  format: 'bg-indigo-100 text-indigo-600',
  hook: 'bg-amber-100 text-amber-600',
  platform: 'bg-blue-100 text-blue-600',
  summary: 'bg-orange-100 text-orange-600',
  topic: 'bg-emerald-100 text-emerald-600',
  time: 'bg-violet-100 text-violet-600',
}

function TrendIcon({ title }) {
  if (title?.includes('📈') || title?.toLowerCase().includes('crescendo')) return <ArrowUpRight size={14} className="text-emerald-500" />
  if (title?.includes('📉') || title?.toLowerCase().includes('caindo')) return <ArrowDownRight size={14} className="text-red-400" />
  if (title?.includes('→')) return <Minus size={14} className="text-gray-400" />
  return null
}

function InsightCard({ insight, index }) {
  const Icon = ICONS[insight.type] || BarChart2
  const cardColor = CARD_COLORS[insight.type] || CARD_COLORS.summary
  const iconColor = ICON_COLORS[insight.type] || ICON_COLORS.summary

  return (
    <div
      className={`card border ${cardColor} p-5 space-y-3 animate-slide-up`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${iconColor}`}>
          <Icon size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <InsightTypeBadge type={insight.type} />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug flex items-center gap-1.5 flex-wrap">
            {insight.title}
            <TrendIcon title={insight.description} />
          </h3>
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed pl-11">{insight.description}</p>

      {insight.recommendation && (
        <div className="ml-11 p-3 rounded-lg bg-white/70 border border-gray-200/80 flex items-start gap-2">
          <ChevronRight size={13} className="text-orange-500 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-700 font-medium">{insight.recommendation}</p>
        </div>
      )}
    </div>
  )
}

function DimensionSummaryBar({ insights }) {
  const counts = INSIGHT_TYPES.filter((t) => t.id !== 'all').map((t) => ({
    ...t,
    count: insights.filter((i) => i.type === t.id).length,
  })).filter((t) => t.count > 0)

  if (counts.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {counts.map((t) => {
        const Icon = ICONS[t.id] || BarChart2
        const iconColor = ICON_COLORS[t.id] || ICON_COLORS.summary
        return (
          <div key={t.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${CARD_COLORS[t.id] || ''}`}>
            <span className={`p-0.5 rounded ${iconColor}`}>
              <Icon size={10} />
            </span>
            <span className="text-xs text-gray-600 font-medium">{t.label}</span>
            <span className="text-xs font-bold text-gray-800">{t.count}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function InsightEngine({ embedded = false }) {
  const metrics = useStore((s) => s.metrics)
  const posts = useStore((s) => s.posts)
  const insights = useStore((s) => s.insights)
  const generateInsightsAction = useStore((s) => s.generateInsights)
  const clearInsights = useStore((s) => s.clearInsights)
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')

  const handleGenerate = async () => {
    setLoading(true)
    setActiveFilter('all')
    await new Promise((r) => setTimeout(r, 1400))
    generateInsightsAction()
    setLoading(false)
  }

  const canGenerate = metrics.length >= 2

  const filtered = activeFilter === 'all'
    ? insights
    : insights.filter((i) => i.type === activeFilter)

  const availableFilters = INSIGHT_TYPES.filter(
    (t) => t.id === 'all' || insights.some((i) => i.type === t.id)
  )

  return (
    <div className={`${embedded ? '' : 'p-6'} space-y-5 animate-fade-in`}>
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-50 via-white to-white border border-orange-200 p-6">
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-orange-500" />
              <h2 className="text-base font-bold text-gray-900">Motor de Insights com IA</h2>
            </div>
            <p className="text-sm text-gray-500 max-w-lg">
              Analisa seu desempenho em <strong>5 dimensões</strong>: plataforma, formato, tipo de gancho, tópico e dia de publicação — gerando recomendações acionáveis para seu próximo conteúdo.
            </p>
            {!canGenerate && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠ Você precisa de pelo menos 2 registros de métricas para gerar insights. Adicione mais em Analytics.
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {insights.length > 0 && (
              <button onClick={clearInsights} className="btn-secondary text-xs">
                Limpar
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="btn-primary"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Analisando...</>
              ) : (
                <><RefreshCw size={14} /> {insights.length > 0 ? 'Regenerar' : 'Gerar Insights'}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Posts Rastreados', value: posts.length },
          { label: 'Snapshots de Métricas', value: metrics.length },
          { label: 'Insights Gerados', value: insights.length },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            <Sparkles size={18} className="absolute inset-0 m-auto text-orange-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">Processando seus dados...</p>
            <p className="text-xs text-gray-400 mt-1">Analisando plataforma, formato, gancho, tópico e dia de publicação</p>
          </div>
        </div>
      )}

      {/* Insights */}
      {!loading && insights.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-800">
              {insights.length} Insights Encontrados
            </h3>
            <span className="text-xs text-gray-400">Baseado em {metrics.length} snapshots de métricas</span>
          </div>

          <DimensionSummaryBar insights={insights} />

          {/* Filter tabs */}
          {availableFilters.length > 2 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter size={12} className="text-gray-400 shrink-0" />
              {availableFilters.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveFilter(t.id)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    activeFilter === t.id
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                  }`}
                >
                  {t.label}
                  {t.id !== 'all' && (
                    <span className={`ml-1 ${activeFilter === t.id ? 'opacity-80' : 'text-gray-400'}`}>
                      ({insights.filter((i) => i.type === t.id).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((ins, idx) => (
              <InsightCard key={ins.id} insight={ins} index={idx} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-sm text-gray-400">Nenhum insight nesta categoria ainda.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty states */}
      {!loading && insights.length === 0 && canGenerate && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center mb-4">
            <Sparkles size={28} className="text-orange-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Pronto para gerar insights</h3>
          <p className="text-gray-400 text-sm max-w-sm mb-4">
            Clique em "Gerar Insights" para analisar seus {metrics.length} snapshots e descobrir o que está funcionando — em 5 dimensões.
          </p>
          <button onClick={handleGenerate} className="btn-primary">
            <Sparkles size={14} /> Gerar Insights
          </button>
        </div>
      )}

      {!loading && !canGenerate && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center mb-4">
            <BarChart2 size={28} className="text-amber-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Dados insuficientes ainda</h3>
          <p className="text-gray-400 text-sm max-w-sm">
            Adicione pelo menos 2 snapshots de desempenho no módulo Analytics para ativar a geração de insights.
          </p>
        </div>
      )}
    </div>
  )
}
