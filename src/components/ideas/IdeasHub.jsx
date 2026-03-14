import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Plus, Search, Calendar, Tag,
  GripVertical, Kanban, Zap, RefreshCw, Sparkles, Radar, Loader2,
  Check, ChevronLeft, ChevronRight, X, Brain, Target, ChevronDown,
  ChevronUp, Hash, FileText, Users, AlertCircle, KeyRound,
} from 'lucide-react'
import useStore from '../../store/useStore'
import IdeaForm from './IdeaForm'
import { PlatformBadge, PriorityBadge, FormatBadge } from '../common/Badge'
import { generateIdeasFromInsights, generateIdeasFromTrends, generateIdeasWithClaude } from '../../utils/ideaGenerator'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const KANBAN_COLUMNS = [
  { id: 'idea',      label: 'Ideias',     color: 'border-orange-200 bg-orange-50/60',   dot: 'bg-orange-400',  count_bg: 'bg-orange-100 text-orange-700' },
  { id: 'draft',     label: 'Rascunhos',  color: 'border-blue-200 bg-blue-50/60',       dot: 'bg-blue-400',    count_bg: 'bg-blue-100 text-blue-700' },
  { id: 'ready',     label: 'Pronto',     color: 'border-emerald-200 bg-emerald-50/60', dot: 'bg-emerald-400', count_bg: 'bg-emerald-100 text-emerald-700' },
  { id: 'published', label: 'Publicado',  color: 'border-green-200 bg-green-50/60',     dot: 'bg-green-400',   count_bg: 'bg-green-100 text-green-700' },
]

const SOURCE_COLORS = {
  insight: 'bg-purple-100 text-purple-700 border-purple-200',
  trend:   'bg-blue-100 text-blue-700 border-blue-200',
  ai:      'bg-amber-100 text-amber-700 border-amber-200',
}
const SOURCE_ICONS = { insight: Sparkles, trend: Radar, ai: Zap }

const CONTENT_TYPE_LABELS = { paid: 'Publi', partnership: 'Parceria', other: 'Outros' }
const CONTENT_TYPE_COLORS = {
  paid:        'bg-purple-100 text-purple-700 border-purple-200',
  partnership: 'bg-blue-100 text-blue-700 border-blue-200',
  other:       'bg-gray-100 text-gray-600 border-gray-200',
}

// Helper: retorna plataformas como array (suporta formato antigo e novo)
const getPlatforms = (idea) =>
  idea.platforms?.length
    ? idea.platforms
    : idea.platform
      ? [idea.platform]
      : []

// ─── Card compartilhado ───────────────────────────────────────────────────────
function KanbanMiniCard({ idea, onClick, dragHandleProps, isDragging, onTagClick, compact }) {
  const platforms = getPlatforms(idea)
  const tags = idea.tags || []

  return (
    <div className="space-y-0">
      {/* Tags FORA do card — aparecem acima da borda */}
      {!compact && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1 pb-1">
          {tags.slice(0, 4).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={(e) => { e.stopPropagation(); onTagClick?.(tag) }}
              className="inline-flex items-center gap-0.5 bg-orange-100 text-orange-600 border border-orange-200 text-[9px] px-1.5 py-0.5 rounded-full font-medium hover:bg-orange-200 transition-colors"
            >
              <Tag size={7} />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Card */}
      <div
        className={`bg-white border rounded-xl p-3 space-y-2 transition-all cursor-pointer ${
          isDragging
            ? 'border-orange-400 shadow-lg shadow-orange-200/50 rotate-1 scale-105'
            : 'border-gray-200 hover:border-orange-300'
        }`}
        onClick={onClick}
      >
        <div className="flex items-start gap-2">
          {dragHandleProps && (
            <span
              {...dragHandleProps}
              className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={13} />
            </span>
          )}
          <p className="text-xs font-medium text-gray-800 leading-snug flex-1 line-clamp-2">{idea.title}</p>
        </div>

        <div className={`flex flex-wrap gap-1 ${dragHandleProps ? 'ml-5' : ''}`}>
          {platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
          <FormatBadge format={idea.format} />
          {/* Tipo de conteúdo (só mostra se não for orgânico) */}
          {idea.content_type && idea.content_type !== 'organic' && CONTENT_TYPE_LABELS[idea.content_type] && (
            <span className={`chip border text-[9px] ${CONTENT_TYPE_COLORS[idea.content_type]}`}>
              {CONTENT_TYPE_LABELS[idea.content_type]}
            </span>
          )}
        </div>

        <div className={`flex items-center justify-between ${dragHandleProps ? 'ml-5' : ''}`}>
          <PriorityBadge priority={idea.priority} />
          {idea.scheduled_date && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Calendar size={10} />
              {idea.scheduled_date}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Visualização Kanban ──────────────────────────────────────────────────────
function KanbanView({ ideas, updateIdea, onCardClick, onTagClick }) {
  const onDragEnd = ({ destination, draggableId }) => {
    if (!destination) return
    updateIdea(draggableId, { status: destination.droppableId })
  }
  const columnIdeas = (colId) => ideas.filter((i) => i.status === colId)

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-4 gap-4 min-h-[60vh]">
        {KANBAN_COLUMNS.map((col) => {
          const colIdeas = columnIdeas(col.id)
          return (
            <div key={col.id} className={`flex flex-col rounded-xl border ${col.color}`}>
              <div className="px-3 py-3 flex items-center justify-between border-b border-gray-200/80 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${col.count_bg}`}>{colIdeas.length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2 space-y-2 min-h-[200px] transition-colors ${snapshot.isDraggingOver ? 'bg-orange-50/60' : ''}`}
                  >
                    {colIdeas.map((idea, index) => (
                      <Draggable key={idea.id} draggableId={idea.id} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps}>
                            <KanbanMiniCard
                              idea={idea}
                              onClick={() => onCardClick(idea)}
                              dragHandleProps={provided.dragHandleProps}
                              isDragging={snapshot.isDragging}
                              onTagClick={onTagClick}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {colIdeas.length === 0 && (
                      <div className="flex items-center justify-center h-20">
                        <p className="text-[11px] text-gray-400">Solte cards aqui</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}

// ─── Visualização Calendário ──────────────────────────────────────────────────
function CalendarView({ ideas, onCardClick, onNewIdea }) {
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

  const makeDateStr = (day) =>
    `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`

  const unscheduled = ideas.filter((i) => !i.scheduled_date)
  const scheduled = ideas.filter((i) => i.scheduled_date)

  return (
    <div className="space-y-5">
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

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayStr = day ? makeDateStr(day) : null
            const isToday = dayStr === todayStr
            const dayIdeas = day ? ideasForDay(day) : []
            return (
              <div
                key={i}
                className={`border-b border-r border-gray-100 p-1.5 ${!day ? 'bg-gray-50/40' : 'hover:bg-orange-50/30 cursor-pointer'} ${i % 7 === 6 ? 'border-r-0' : ''}`}
                onClick={() => day && onNewIdea(dayStr)}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium block mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>
                      {day}
                    </span>
                    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                      {dayIdeas.slice(0, 2).map((idea) => (
                        <KanbanMiniCard
                          key={idea.id}
                          idea={idea}
                          onClick={() => onCardClick(idea)}
                          compact
                        />
                      ))}
                      {dayIdeas.length > 2 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onCardClick(dayIdeas[2]) }}
                          className="text-[10px] text-gray-400 pl-1 hover:text-orange-500"
                        >
                          +{dayIdeas.length - 2} mais
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span><span className="font-medium text-gray-700">{scheduled.length}</span> agendadas</span>
        <span><span className="font-medium text-gray-700">{unscheduled.length}</span> sem data</span>
        <span className="ml-auto text-[10px] text-gray-300">Clique em uma data para criar</span>
      </div>

      {unscheduled.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Ideias Sem Data</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {unscheduled.map((idea) => (
              <KanbanMiniCard key={idea.id} idea={idea} onClick={() => onCardClick(idea)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Loading phases ───────────────────────────────────────────────────────────
const LOADING_PHASES = [
  'Analisando seu contexto...',
  'Identificando ângulos únicos...',
  'Criando hooks irresistíveis...',
  'Estruturando roteiros...',
  'Refinando ideias finais...',
]

// ─── Visualização Gerar ───────────────────────────────────────────────────────
function GenerateView() {
  const insights          = useStore((s) => s.insights)
  const trendResults      = useStore((s) => s.trendResults)
  const generatedIdeas    = useStore((s) => s.generatedIdeas)
  const setGeneratedIdeas = useStore((s) => s.setGeneratedIdeas)
  const saveGeneratedIdea = useStore((s) => s.saveGeneratedIdea)

  const [loading, setLoading]       = useState(false)
  const [loadPhase, setLoadPhase]   = useState(0)
  const [niche, setNiche]           = useState('')
  const [audience, setAudience]     = useState('')
  const [source, setSource]         = useState('all')
  const [savedIds, setSavedIds]     = useState(new Set())
  const [error, setError]           = useState(null)
  const [usedAI, setUsedAI]         = useState(false)

  const hasInsights = insights.length > 0
  const hasTrends   = !!trendResults

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setLoadPhase(0)

    // Animate loading phases
    const phaseInterval = setInterval(() => {
      setLoadPhase((p) => (p < LOADING_PHASES.length - 1 ? p + 1 : p))
    }, 900)

    try {
      const apiKey = localStorage.getItem('cio-anthropic-key')

      if (apiKey) {
        // Real Claude AI generation
        const ideas = await generateIdeasWithClaude(apiKey, {
          niche: niche.trim() || undefined,
          audience: audience.trim() || undefined,
          insights: (source === 'insights' || source === 'all') ? insights : [],
          trendResults: (source === 'trends' || source === 'all') ? trendResults : null,
          count: 10,
        })
        setGeneratedIdeas(ideas)
        setUsedAI(true)
      } else {
        // Fallback: template-based
        await new Promise((r) => setTimeout(r, 1200))
        let ideas = []
        if (source === 'insights' || source === 'all') ideas = [...ideas, ...generateIdeasFromInsights(insights, 6)]
        if ((source === 'trends' || source === 'all') && trendResults) ideas = [...ideas, ...generateIdeasFromTrends(trendResults, 4)]
        if (source === 'ai' || ideas.length === 0) ideas = [...ideas, ...generateIdeasFromInsights([], 6)]
        setGeneratedIdeas(ideas)
        setUsedAI(false)
      }
    } catch (e) {
      setError(e.message || 'Erro ao gerar ideias')
    } finally {
      clearInterval(phaseInterval)
      setLoading(false)
      setSavedIds(new Set())
    }
  }

  const handleSaveAll = () => {
    generatedIdeas.forEach((idea) => {
      if (!savedIds.has(idea.id)) {
        saveGeneratedIdea(idea)
      }
    })
    setSavedIds(new Set(generatedIdeas.map((i) => i.id)))
  }

  const handleSave = (idea) => {
    saveGeneratedIdea(idea)
    setSavedIds((s) => new Set([...s, idea.id]))
  }

  const hasApiKey = !!localStorage.getItem('cio-anthropic-key')

  return (
    <div className="space-y-5">

      {/* Context inputs + source selector */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={16} className="text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-800">Configurar Geração</h3>
          {hasApiKey ? (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Brain size={9} /> IA Real Ativa
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              <KeyRound size={9} /> Modo Templates
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <Target size={11} /> Nicho / Tema Principal
            </label>
            <input
              className="input text-sm"
              placeholder="Ex: marketing digital, finanças pessoais, fitness..."
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <Users size={11} /> Audiência-Alvo
            </label>
            <input
              className="input text-sm"
              placeholder="Ex: empreendedores iniciantes, mães de 30-40 anos..."
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Contexto adicional:</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'all',      label: 'Tudo',       icon: RefreshCw },
                { id: 'insights', label: `Insights ${hasInsights ? `(${insights.length})` : '(0)'}`, icon: Sparkles, disabled: !hasInsights },
                { id: 'trends',   label: `Tendências ${hasTrends ? `(${trendResults?.topic})` : '(nenhuma)'}`, icon: Radar, disabled: !hasTrends },
                { id: 'ai',       label: 'Sem contexto', icon: Zap },
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
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary shrink-0 gap-2"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Gerando...</>
              : <><Brain size={14} /> Gerar {hasApiKey ? '10 Ideias com IA' : 'Ideias'}</>
            }
          </button>
        </div>

        {!hasApiKey && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">
              <span className="font-semibold">Configure sua chave Anthropic</span> para ativar a geração real com IA — ideias específicas com hooks, roteiros e hashtags personalizados. Adicione em Configurações.
            </p>
          </div>
        )}
      </div>

      {/* Context status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`card p-4 border ${hasInsights ? 'border-purple-200' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className={hasInsights ? 'text-purple-500' : 'text-gray-300'} />
            <span className="text-xs font-semibold text-gray-700">Insights Disponíveis</span>
            {hasInsights && (
              <span className="ml-auto text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {insights.length}
              </span>
            )}
          </div>
          {hasInsights ? (
            <div className="space-y-1">
              {insights.slice(0, 3).map((ins) => (
                <p key={ins.id} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                  <span className="text-purple-400 mt-0.5 shrink-0">•</span>
                  <span className="line-clamp-1">{ins.title}</span>
                </p>
              ))}
              {insights.length > 3 && <p className="text-[11px] text-gray-400">+ {insights.length - 3} mais insights</p>}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Nenhum insight ainda. Gere-os na aba Analytics.</p>
          )}
        </div>
        <div className={`card p-4 border ${hasTrends ? 'border-blue-200' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Radar size={14} className={hasTrends ? 'text-blue-500' : 'text-gray-300'} />
            <span className="text-xs font-semibold text-gray-700">Radar de Tendências</span>
            {hasTrends && (
              <span className="ml-auto text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {trendResults.opportunities?.length} oport.
              </span>
            )}
          </div>
          {hasTrends ? (
            <div className="space-y-1">
              <p className="text-[11px] text-gray-700 font-medium">Tópico: "{trendResults.topic}"</p>
              <div className="space-y-1">
                {(trendResults.opportunities || []).slice(0, 2).map((o, i) => (
                  <p key={i} className="text-[11px] text-gray-500 flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                    <span className="line-clamp-1">{o.title}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sem dados de tendências. Use o Radar de Tendências para analisar um nicho.</p>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            <Brain size={20} className="absolute inset-0 m-auto text-orange-500" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold text-gray-800">{LOADING_PHASES[loadPhase]}</p>
            <div className="flex justify-center gap-1">
              {LOADING_PHASES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${i <= loadPhase ? 'bg-orange-500 w-6' : 'bg-gray-200 w-3'}`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {hasApiKey ? 'Claude está criando ideias personalizadas com base no seu contexto' : 'Gerando ideias com templates personalizados'}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Erro ao gerar ideias</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
          </div>
          <button onClick={handleGenerate} className="ml-auto text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
            <RefreshCw size={11} /> Tentar novamente
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !error && generatedIdeas.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-800">
                {generatedIdeas.length} Ideias Geradas
              </h3>
              {usedAI ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                  <Brain size={9} /> Geradas com IA Real
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                  <FileText size={9} /> Via Templates
                </span>
              )}
              {savedIds.size > 0 && (
                <span className="text-xs text-emerald-600 font-medium">
                  {savedIds.size} salvas
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {savedIds.size < generatedIdeas.length && (
                <button
                  onClick={handleSaveAll}
                  className="btn-ghost text-xs border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <Check size={12} /> Salvar Todas
                </button>
              )}
              <button onClick={handleGenerate} className="btn-ghost text-xs">
                <RefreshCw size={12} /> Regenerar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {generatedIdeas.map((idea) => (
              <GeneratedIdeaCard key={idea.id} idea={idea} onSave={handleSave} saved={savedIds.has(idea.id)} />
            ))}
          </div>

          {savedIds.size > 0 && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-3">
              <Check size={16} className="text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700">
                <span className="font-semibold">{savedIds.size} {savedIds.size === 1 ? 'ideia salva' : 'ideias salvas'}</span> — visíveis no Quadro Kanban e Calendário.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && generatedIdeas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200 flex items-center justify-center mb-5 shadow-sm">
            <Brain size={32} className="text-orange-500" />
          </div>
          <h3 className="text-gray-800 font-semibold text-base mb-2">
            {hasApiKey ? 'IA pronta para criar suas ideias' : 'Gerador de Ideias'}
          </h3>
          <p className="text-gray-400 text-sm max-w-sm mb-2 leading-relaxed">
            {hasApiKey
              ? 'Preencha seu nicho e audiência para receber ideias altamente específicas e acionáveis, com hooks, roteiro e hashtags.'
              : 'Configure seu nicho e clique em Gerar para criar ideias baseadas em templates. Adicione sua chave Anthropic para resultados com IA real.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 items-center">
            {!niche && (
              <p className="text-xs text-orange-500 font-medium">💡 Dica: preencha o nicho acima para ideias mais precisas</p>
            )}
          </div>
          <button onClick={handleGenerate} className="btn-primary mt-5 gap-2">
            <Brain size={14} /> {hasApiKey ? 'Gerar Ideias com IA' : 'Gerar Ideias Agora'}
          </button>
        </div>
      )}
    </div>
  )
}

function GeneratedIdeaCard({ idea, onSave, saved }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = SOURCE_ICONS[idea.source_type] || Zap
  const sourceLabel = idea.source_type === 'insight' ? 'De Insights' : idea.source_type === 'trend' ? 'De Tendências' : 'Gerado por IA'
  const platforms = getPlatforms(idea)
  const hasExtras = idea.hook_suggestion || idea.script_outline?.length || idea.hashtags?.length || idea.angle || idea.why_now

  return (
    <div className={`card-hover p-4 space-y-3 relative flex flex-col transition-all ${saved ? 'opacity-70' : ''}`}>
      {saved && (
        <div className="absolute top-3 right-3 p-1 rounded-full bg-emerald-500 text-white">
          <Check size={11} />
        </div>
      )}

      {/* Header badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {idea.ai_powered ? (
          <span className="chip border text-[10px] bg-orange-100 text-orange-700 border-orange-200">
            <Brain size={9} /> IA Real
          </span>
        ) : (
          <span className={`chip border text-[10px] ${SOURCE_COLORS[idea.source_type] || SOURCE_COLORS.ai}`}>
            <Icon size={9} /> {sourceLabel}
          </span>
        )}
        {idea.hook && (
          <span className="chip border text-[10px] bg-gray-100 text-gray-600 border-gray-200 capitalize">
            {idea.hook}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-800 leading-snug">{idea.title}</h3>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{idea.description}</p>

      {/* Hook suggestion — always visible if present */}
      {idea.hook_suggestion && (
        <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-100">
          <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Zap size={9} /> Hook de abertura
          </p>
          <p className="text-xs text-gray-700 italic leading-relaxed">"{idea.hook_suggestion}"</p>
        </div>
      )}

      {/* Platform / format / priority */}
      <div className="flex flex-wrap gap-1.5">
        {platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
        <FormatBadge format={idea.format} />
        <PriorityBadge priority={idea.priority} />
      </div>

      {/* Expandable section */}
      {hasExtras && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-orange-500 transition-colors font-medium"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Menos detalhes' : 'Ver roteiro, ângulo e hashtags'}
          </button>

          {expanded && (
            <div className="space-y-3 pt-1 border-t border-gray-100">
              {/* Why now */}
              {idea.why_now && (
                <div>
                  <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Radar size={9} /> Por que agora
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">{idea.why_now}</p>
                </div>
              )}

              {/* Unique angle */}
              {idea.angle && (
                <div>
                  <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Target size={9} /> Ângulo único
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">{idea.angle}</p>
                </div>
              )}

              {/* Script outline */}
              {idea.script_outline?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <FileText size={9} /> Roteiro resumido
                  </p>
                  <ol className="space-y-1">
                    {idea.script_outline.map((point, i) => (
                      <li key={i} className="text-xs text-gray-600 flex gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Hashtags */}
              {idea.hashtags?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Hash size={9} /> Hashtags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {idea.hashtags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Save button */}
      <div className="pt-2 border-t border-gray-100 mt-auto">
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'kanban',   label: 'Quadro',    icon: Kanban },
  { id: 'calendar', label: 'Calendário', icon: Calendar },
  { id: 'generate', label: 'Gerar',     icon: Zap },
]

const STATUS_LABELS_FILTER   = { all: 'Todos Status',      idea: 'Ideia', draft: 'Rascunho', ready: 'Pronto', published: 'Publicado' }
const PRIORITY_LABELS_FILTER = { all: 'Todas Prioridades', high: 'Alta',  medium: 'Média',   low: 'Baixa' }

// ─── Componente principal ─────────────────────────────────────────────────────
export default function IdeasHub() {
  const ideas             = useStore((s) => s.ideas)
  const addIdea           = useStore((s) => s.addIdea)
  const updateIdea        = useStore((s) => s.updateIdea)
  const deleteIdea        = useStore((s) => s.deleteIdea)
  const convertIdeaToPost = useStore((s) => s.convertIdeaToPost)

  const [tab, setTab]                       = useState('kanban')
  const [formOpen, setFormOpen]             = useState(false)
  const [editTarget, setEditTarget]         = useState(null)
  const [search, setSearch]                 = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterTag, setFilterTag]           = useState(null)  // tag selecionável

  // Todas as plataformas únicas (suporta arrays e strings)
  const allPlatforms = ['all', ...new Set(
    ideas.flatMap((i) => getPlatforms(i)).filter(Boolean)
  )]

  // Todas as tags únicas
  const allTags = [...new Set(ideas.flatMap((i) => i.tags || []))]

  const filtered = ideas
    .filter((i) => {
      const platforms = getPlatforms(i)
      if (filterPlatform !== 'all' && !platforms.includes(filterPlatform)) return false
      if (filterStatus !== 'all' && i.status !== filterStatus) return false
      if (filterPriority !== 'all' && i.priority !== filterPriority) return false
      if (filterTag && !(i.tags || []).includes(filterTag)) return false
      if (search && !i.title?.toLowerCase().includes(search.toLowerCase()) &&
          !i.topic?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const handleSave = (data) => {
    if (editTarget?.id) updateIdea(editTarget.id, data)
    else addIdea(data)
    setEditTarget(null)
  }

  const openEdit = (idea) => { setEditTarget(idea); setFormOpen(true) }
  const openNew  = (defaults = null) => { setEditTarget(defaults); setFormOpen(true) }
  const handleCalendarDateClick = (dateStr) => openNew({ scheduled_date: dateStr })

  const handleTagClick = (tag) => setFilterTag((prev) => (prev === tag ? null : tag))

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
              {id === 'kanban' && ideas.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-0.5">
                  {ideas.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => openNew()} className="btn-primary shrink-0">
          <Plus size={15} /> Nova Ideia
        </button>
      </div>

      {/* Filtros */}
      {(tab === 'kanban' || tab === 'calendar') && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-8" placeholder="Buscar ideias..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="select w-auto" value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
              {allPlatforms.map((p) => <option key={p} value={p}>{p === 'all' ? 'Todas Plataformas' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <select className="select w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              {['all','idea','draft','ready','published'].map((s) => <option key={s} value={s}>{STATUS_LABELS_FILTER[s] || s}</option>)}
            </select>
            <select className="select w-auto" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              {['all','high','medium','low'].map((p) => <option key={p} value={p}>{PRIORITY_LABELS_FILTER[p] || p}</option>)}
            </select>
            <p className="text-xs text-gray-400 ml-auto">{filtered.length} de {ideas.length} ideias</p>
          </div>

          {/* Tags selecionáveis */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium flex items-center gap-1">
                <Tag size={10} /> Tags:
              </span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all ${
                    filterTag === tag
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {filterTag && (
                <button
                  onClick={() => setFilterTag(null)}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 ml-1"
                >
                  <X size={10} /> limpar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Visualização Kanban */}
      {tab === 'kanban' && (
        filtered.length === 0 && ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center mb-4">
              <Kanban size={28} className="text-orange-400" />
            </div>
            <p className="text-gray-500 font-medium">Nenhuma ideia ainda</p>
            <p className="text-gray-300 text-sm mt-1">Crie sua primeira ideia para começar</p>
            <button onClick={() => openNew()} className="btn-primary mt-4"><Plus size={14} /> Criar Primeira Ideia</button>
          </div>
        ) : (
          <KanbanView ideas={filtered} updateIdea={updateIdea} onCardClick={openEdit} onTagClick={handleTagClick} />
        )
      )}

      {/* Visualização Calendário */}
      {tab === 'calendar' && (
        <CalendarView ideas={filtered} onCardClick={openEdit} onNewIdea={handleCalendarDateClick} />
      )}

      {/* Visualização Gerar */}
      {tab === 'generate' && <GenerateView />}

      {/* Modal */}
      <IdeaForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSave={handleSave}
        initial={editTarget}
      />
    </div>
  )
}
