import { useState } from 'react'
import {
  Plus, Search, Lightbulb, Edit2, Trash2, ArrowRight, Calendar,
  Zap, RefreshCw, Sparkles, Radar, Loader2,
  Check, ChevronLeft, ChevronRight, LayoutGrid,
} from 'lucide-react'
import useStore from '../../store/useStore'
import IdeaForm from './IdeaForm'
import { PlatformBadge, StatusBadge, PriorityBadge, FormatBadge } from '../common/Badge'
import { generateIdeasFromInsights, generateIdeasFromTrends } from '../../utils/ideaGenerator'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']

const SOURCE_COLORS = {
  insight: 'bg-purple-100 text-purple-700 border-purple-200',
  trend: 'bg-blue-100 text-blue-700 border-blue-200',
  ai: 'bg-amber-100 text-amber-700 border-amber-200',
}
const SOURCE_ICONS = { insight: Sparkles, trend: Radar, ai: Zap }

const NEXT_STATUS_LABELS = { idea: 'Rascunho', draft: 'Pronto', ready: 'Publicado' }

// ─── Card de ideia (grid) ─────────────────────────────────────────────────────
function IdeaCard({ idea, onEdit, onDelete, onConvert, onStatusChange }) {
  const NEXT_STATUS = { idea: 'draft', draft: 'ready', ready: 'published', published: null }
  const nextStatus = NEXT_STATUS[idea.status]

  return (
    <div
      className="card-hover p-4 flex flex-col gap-3 group cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{idea.title}</h3>
          {idea.topic && <p className="text-[11px] text-gray-400 mt-0.5">{idea.topic}</p>}
        </div>
        <PriorityBadge priority={idea.priority} />
      </div>

      {idea.description && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{idea.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <PlatformBadge platform={idea.platform} />
        <FormatBadge format={idea.format} />
        <StatusBadge status={idea.status} />
      </div>

      {idea.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {idea.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{tag}</span>
          ))}
        </div>
      )}

      {idea.scheduled_date && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Calendar size={11} />
          <span>Agendado: {idea.scheduled_date}</span>
        </div>
      )}

      <div
        className="flex items-center gap-1.5 pt-1 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onEdit} className="btn-ghost text-xs py-1 px-2">
          <Edit2 size={12} /> Editar
        </button>
        {nextStatus && (
          <button onClick={(e) => { e.stopPropagation(); onStatusChange(nextStatus) }} className="btn-ghost text-xs py-1 px-2 text-orange-600 hover:text-orange-700">
            <ArrowRight size={12} /> {NEXT_STATUS_LABELS[idea.status]}
          </button>
        )}
        {idea.status !== 'published' && (
          <button onClick={(e) => { e.stopPropagation(); onConvert() }} className="btn-ghost text-xs py-1 px-2 text-blue-600 hover:text-blue-700 ml-auto">
            → Post
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="btn-ghost text-xs py-1 px-2 text-red-500 hover:text-red-600 ml-auto">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Visualização Calendário ──────────────────────────────────────────────────
function CalendarView({ ideas, onCardClick }) {
  const today = new Date()
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  const ideasForDay = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return ideas.filter((i) => i.scheduled_date === dateStr)
  }

  const unscheduled = ideas.filter((i) => !i.scheduled_date)
  const scheduled = ideas.filter((i) => i.scheduled_date)

  return (
    <div className="space-y-5">
      {/* Navegação do mês */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{MONTHS[month]} {year}</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={15} />
          </button>
          <button onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))} className="text-xs px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-500">
            Hoje
          </button>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Grade do calendário */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayStr = day ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : null
            const isToday = dayStr === todayStr
            const dayIdeas = day ? ideasForDay(day) : []
            return (
              <div
                key={i}
                className={`min-h-[90px] border-b border-r border-gray-100 p-1.5 ${!day ? 'bg-gray-50/40' : ''} ${i % 7 === 6 ? 'border-r-0' : ''}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium block mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayIdeas.slice(0, 3).map((idea) => (
                        <button
                          key={idea.id}
                          onClick={() => onCardClick(idea)}
                          className="w-full text-left p-1 rounded text-[10px] bg-orange-100 text-orange-700 border border-orange-200 truncate hover:bg-orange-200 transition-colors leading-tight"
                        >
                          {idea.title}
                        </button>
                      ))}
                      {dayIdeas.length > 3 && (
                        <span className="text-[10px] text-gray-400 pl-1">+{dayIdeas.length - 3} mais</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span><span className="font-medium text-gray-700">{scheduled.length}</span> agendadas</span>
        <span><span className="font-medium text-gray-700">{unscheduled.length}</span> sem data</span>
      </div>

      {/* Sem data */}
      {unscheduled.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Ideias Sem Data</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {unscheduled.map((idea) => (
              <button
                key={idea.id}
                onClick={() => onCardClick(idea)}
                className="card p-3 text-left hover:border-orange-300 transition-colors group"
              >
                <p className="text-xs font-medium text-gray-800 truncate">{idea.title}</p>
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <PlatformBadge platform={idea.platform} />
                  <StatusBadge status={idea.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Visualização Gerar ───────────────────────────────────────────────────────
function GenerateView({ onSaveIdea }) {
  const insights = useStore((s) => s.insights)
  const trendResults = useStore((s) => s.trendResults)
  const generatedIdeas = useStore((s) => s.generatedIdeas)
  const setGeneratedIdeas = useStore((s) => s.setGeneratedIdeas)
  const saveGeneratedIdea = useStore((s) => s.saveGeneratedIdea)

  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState('all')
  const [savedIds, setSavedIds] = useState(new Set())

  const hasInsights = insights.length > 0
  const hasTrends = !!trendResults

  const handleGenerate = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    let ideas = []
    if (source === 'insights' || source === 'all') ideas = [...ideas, ...generateIdeasFromInsights(insights, 6)]
    if ((source === 'trends' || source === 'all') && trendResults) ideas = [...ideas, ...generateIdeasFromTrends(trendResults, 4)]
    if (source === 'ai' || ideas.length === 0) ideas = [...ideas, ...generateIdeasFromInsights([], 6)]
    setGeneratedIdeas(ideas)
    setLoading(false)
    setSavedIds(new Set())
  }

  const handleSave = (idea) => {
    saveGeneratedIdea(idea)
    setSavedIds((s) => new Set([...s, idea.id]))
  }

  const fromInsights = generatedIdeas.filter((i) => i.source_type === 'insight')
  const fromTrends = generatedIdeas.filter((i) => i.source_type === 'trend')
  const fromAI = generatedIdeas.filter((i) => i.source_type === 'ai')

  return (
    <div className="space-y-5">
      {/* Fonte + gerar */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-2 font-medium">Gerar a partir de:</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: 'Tudo', icon: RefreshCw },
              { id: 'insights', label: `Insights ${hasInsights ? `(${insights.length})` : '(0)'}`, icon: Sparkles, disabled: !hasInsights },
              { id: 'trends', label: `Tendências ${hasTrends ? `(${trendResults?.topic})` : '(nenhuma)'}`, icon: Radar, disabled: !hasTrends },
              { id: 'ai', label: 'IA Pura', icon: Zap },
            ].map(({ id, label, icon: Icon, disabled }) => (
              <button
                key={id}
                onClick={() => !disabled && setSource(id)}
                disabled={disabled}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  source === id
                    ? 'bg-orange-100 border-orange-300 text-orange-700'
                    : disabled
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon size={11} /> {label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleGenerate} disabled={loading} className="btn-primary shrink-0">
          {loading ? <><Loader2 size={14} className="animate-spin" /> Gerando...</> : <><Zap size={14} /> Gerar Ideias</>}
        </button>
      </div>

      {/* Cards de contexto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`card p-4 border ${hasInsights ? 'border-purple-200' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className={hasInsights ? 'text-purple-500' : 'text-gray-300'} />
            <span className="text-xs font-semibold text-gray-700">Insights Disponíveis</span>
          </div>
          {hasInsights ? (
            <div className="space-y-1">
              {insights.slice(0, 3).map((ins) => (
                <p key={ins.id} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                  <span className="text-purple-500 mt-0.5 shrink-0">•</span> {ins.title}
                </p>
              ))}
              {insights.length > 3 && <p className="text-[11px] text-gray-400">+ {insights.length - 3} mais</p>}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Nenhum insight ainda. Gere-os no Motor de Insights.</p>
          )}
        </div>
        <div className={`card p-4 border ${hasTrends ? 'border-blue-200' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Radar size={14} className={hasTrends ? 'text-blue-500' : 'text-gray-300'} />
            <span className="text-xs font-semibold text-gray-700">Dados do Radar de Tendências</span>
          </div>
          {hasTrends ? (
            <div className="space-y-1">
              <p className="text-[11px] text-gray-700 font-medium">Tópico: "{trendResults.topic}"</p>
              <p className="text-[11px] text-gray-500">{trendResults.opportunities?.length} oportunidades encontradas</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sem dados de tendências ainda. Use o Radar de Tendências para analisar um nicho.</p>
          )}
        </div>
      </div>

      {/* Carregando */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
            <Zap size={18} className="absolute inset-0 m-auto text-amber-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-800">Gerando ideias...</p>
            <p className="text-xs text-gray-400 mt-1">Combinando insights, tendências e criatividade da IA</p>
          </div>
        </div>
      )}

      {/* Resultados */}
      {!loading && generatedIdeas.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              {generatedIdeas.length} Ideias Geradas
              {savedIds.size > 0 && <span className="ml-2 text-xs text-emerald-600 font-normal">({savedIds.size} salvas)</span>}
            </h3>
            <button onClick={handleGenerate} className="btn-ghost text-xs">
              <RefreshCw size={12} /> Regenerar
            </button>
          </div>

          {[
            { items: fromInsights, icon: Sparkles, color: 'text-purple-500', label: 'De Insights Analytics' },
            { items: fromTrends, icon: Radar, color: 'text-blue-500', label: 'Do Radar de Tendências' },
            { items: fromAI, icon: Zap, color: 'text-amber-500', label: 'Gerado por IA' },
          ].filter(({ items }) => items.length > 0).map(({ items, icon: Icon, color, label }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={13} className={color} />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((idea) => (
                  <GeneratedIdeaCard key={idea.id} idea={idea} onSave={handleSave} saved={savedIds.has(idea.id)} />
                ))}
              </div>
            </div>
          ))}

          {savedIds.size > 0 && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-3">
              <Check size={16} className="text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700">
                <span className="font-semibold">{savedIds.size} {savedIds.size === 1 ? 'ideia salva' : 'ideias salvas'}</span> — visível nas visualizações Grid e Calendário.
              </p>
            </div>
          )}
        </div>
      )}

      {!loading && generatedIdeas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center mb-4">
            <Zap size={28} className="text-amber-500" />
          </div>
          <h3 className="text-gray-700 font-semibold mb-2">Pronto para gerar ideias</h3>
          <p className="text-gray-400 text-sm max-w-sm mb-4">
            Escolha sua fonte e clique em "Gerar Ideias" para receber sugestões de conteúdo com IA.
          </p>
          <button onClick={handleGenerate} className="btn-primary">
            <Zap size={14} /> Gerar Ideias Agora
          </button>
        </div>
      )}
    </div>
  )
}

function GeneratedIdeaCard({ idea, onSave, saved }) {
  const Icon = SOURCE_ICONS[idea.source_type] || Zap
  const sourceLabel = idea.source_type === 'insight' ? 'De Insights' : idea.source_type === 'trend' ? 'De Tendências' : 'Gerado por IA'
  return (
    <div className={`card-hover p-4 space-y-3 relative transition-all ${saved ? 'opacity-60' : ''}`}>
      {saved && (
        <div className="absolute top-3 right-3 p-1 rounded-full bg-emerald-500 text-white">
          <Check size={11} />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className={`chip border text-[10px] ${SOURCE_COLORS[idea.source_type] || SOURCE_COLORS.ai}`}>
          <Icon size={10} />
          {sourceLabel}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-gray-800 leading-snug">{idea.title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{idea.description}</p>
      <div className="flex flex-wrap gap-1.5">
        <PlatformBadge platform={idea.platform} />
        <FormatBadge format={idea.format} />
        <PriorityBadge priority={idea.priority} />
      </div>
      {idea.hook && (
        <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
          <span className="text-orange-500 font-medium">Gancho:</span>
          <span className="capitalize">{idea.hook}</span>
        </div>
      )}
      <div className="pt-1 border-t border-gray-100">
        <button
          onClick={() => onSave(idea)}
          disabled={saved}
          className={saved ? 'flex items-center gap-1.5 text-xs text-emerald-600 font-medium' : 'btn-primary text-xs w-full justify-center py-2'}
        >
          {saved ? <><Check size={12} /> Salvo no Hub</> : <><Plus size={12} /> Salvar no Hub</>}
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
const TABS = [
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendário', icon: Calendar },
  { id: 'generate', label: 'Gerar', icon: Zap },
]

const STATUS_LABELS_FILTER = { all: 'Todos Status', idea: 'Ideia', draft: 'Rascunho', ready: 'Pronto', published: 'Publicado' }
const PRIORITY_LABELS_FILTER = { all: 'Todas Prioridades', high: 'Alta', medium: 'Média', low: 'Baixa' }

export default function IdeasHub() {
  const ideas = useStore((s) => s.ideas)
  const addIdea = useStore((s) => s.addIdea)
  const updateIdea = useStore((s) => s.updateIdea)
  const deleteIdea = useStore((s) => s.deleteIdea)
  const convertIdeaToPost = useStore((s) => s.convertIdeaToPost)

  const [tab, setTab] = useState('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  const platforms = ['all', ...new Set(ideas.map((i) => i.platform))]
  const statuses = ['all', 'idea', 'draft', 'ready', 'published']
  const priorities = ['all', 'high', 'medium', 'low']

  const filtered = ideas
    .filter((i) => {
      if (filterPlatform !== 'all' && i.platform !== filterPlatform) return false
      if (filterStatus !== 'all' && i.status !== filterStatus) return false
      if (filterPriority !== 'all' && i.priority !== filterPriority) return false
      if (search && !i.title.toLowerCase().includes(search.toLowerCase()) &&
        !i.topic?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const handleSave = (data) => {
    if (editTarget) updateIdea(editTarget.id, data)
    else addIdea(data)
    setEditTarget(null)
  }

  const openEdit = (idea) => { setEditTarget(idea); setFormOpen(true) }
  const openNew = () => { setEditTarget(null); setFormOpen(true) }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Barra de abas + botão Nova Ideia */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all ${
                tab === id ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={13} /> {label}
              {id === 'grid' && ideas.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-0.5">
                  {ideas.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={openNew} className="btn-primary shrink-0">
          <Plus size={15} /> Nova Ideia
        </button>
      </div>

      {/* Filtros (grid e calendário) */}
      {(tab === 'grid' || tab === 'calendar') && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-8" placeholder="Buscar ideias..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select w-auto" value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
            {platforms.map((p) => <option key={p} value={p}>{p === 'all' ? 'Todas Plataformas' : p}</option>)}
          </select>
          <select className="select w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {statuses.map((s) => <option key={s} value={s}>{STATUS_LABELS_FILTER[s] || s}</option>)}
          </select>
          <select className="select w-auto" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            {priorities.map((p) => <option key={p} value={p}>{PRIORITY_LABELS_FILTER[p] || p}</option>)}
          </select>
          <p className="text-xs text-gray-400 ml-auto">
            {filtered.length} de {ideas.length} ideias
          </p>
        </div>
      )}

      {/* Visualização Grid */}
      {tab === 'grid' && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Lightbulb size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma ideia encontrada</p>
            <p className="text-gray-300 text-sm mt-1">Ajuste os filtros ou crie uma nova ideia</p>
            <button onClick={openNew} className="btn-primary mt-4"><Plus size={14} /> Criar Primeira Ideia</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onEdit={() => openEdit(idea)}
                onDelete={() => deleteIdea(idea.id)}
                onConvert={() => convertIdeaToPost(idea.id)}
                onStatusChange={(status) => updateIdea(idea.id, { status })}
              />
            ))}
          </div>
        )
      )}

      {/* Visualização Calendário */}
      {tab === 'calendar' && (
        <CalendarView ideas={filtered} onCardClick={openEdit} />
      )}

      {/* Visualização Gerar */}
      {tab === 'generate' && (
        <GenerateView onSaveIdea={addIdea} />
      )}

      {/* Modais */}
      <IdeaForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSave={handleSave}
        initial={editTarget}
      />

    </div>
  )
}
