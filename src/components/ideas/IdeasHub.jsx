import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Plus, Search, Calendar, Tag,
  GripVertical, Kanban, Zap, RefreshCw, Sparkles, Radar, Loader2,
  Check, ChevronLeft, ChevronRight, X, Brain, Target, ChevronDown,
  ChevronUp, Hash, FileText, Users, AlertCircle, KeyRound, Trash2,
  TrendingUp, ArrowRight, Flame, Minus, SlidersHorizontal, ListOrdered,
} from 'lucide-react'
import useStore from '../../store/useStore'
import IdeaForm from './IdeaForm'
import { PlatformBadge, PriorityBadge, FormatBadge } from '../common/Badge'
import { generateIdeasFromInsights, generateIdeasFromTrends, generateIdeasWithClaude, generateSignalBasedIdeas } from '../../utils/ideaGenerator'

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
function KanbanMiniCard({ idea, onClick, dragHandleProps, isDragging, onTagClick, onDelete, compact }) {
  const platforms = getPlatforms(idea)
  const tags = idea.tags || []

  return (
    <div
      className={`bg-white border rounded-xl p-3 space-y-2 transition-all cursor-pointer relative group ${
        isDragging
          ? 'border-orange-400 shadow-lg shadow-orange-200/50 rotate-1 scale-105'
          : 'border-gray-200 hover:border-orange-300'
      }`}
      onClick={onClick}
    >
      {/* Delete button — hover only */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(idea.id) }}
          className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all z-10"
          title="Excluir ideia"
        >
          <Trash2 size={compact ? 10 : 11} />
        </button>
      )}

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
        <p className={`text-xs font-medium text-gray-800 leading-snug flex-1 line-clamp-2 ${onDelete && !compact ? 'pr-5' : ''}`}>{idea.title}</p>
      </div>

      <div className={`flex flex-wrap gap-1 ${dragHandleProps ? 'ml-5' : ''}`}>
        {platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
        <FormatBadge format={idea.format} />
        {idea.content_type && idea.content_type !== 'organic' && CONTENT_TYPE_LABELS[idea.content_type] && (
          <span className={`chip border text-[9px] ${CONTENT_TYPE_COLORS[idea.content_type]}`}>
            {CONTENT_TYPE_LABELS[idea.content_type]}
          </span>
        )}
      </div>

      {/* Tags dentro do card */}
      {!compact && tags.length > 0 && (
        <div className={`flex flex-wrap gap-1 ${dragHandleProps ? 'ml-5' : ''}`}>
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
  )
}

// ─── Visualização Kanban ──────────────────────────────────────────────────────
function KanbanView({ ideas, updateIdea, onCardClick, onTagClick, onDelete }) {
  const onDragEnd = ({ destination, draggableId }) => {
    if (!destination) return
    updateIdea(draggableId, { status: destination.droppableId })
  }
  const columnIdeas = (colId) => ideas.filter((i) => i.status === colId)

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0 min-h-[60vh]">
        {KANBAN_COLUMNS.map((col) => {
          const colIdeas = columnIdeas(col.id)
          return (
            <div key={col.id} className={`flex flex-col rounded-xl border min-w-[260px] sm:min-w-[280px] lg:min-w-0 snap-start ${col.color}`}>
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
                              onDelete={onDelete}
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
function CalendarView({ ideas, onCardClick, onNewIdea, onDelete, onAddGap }) {
  const today = new Date()
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [contextDay, setContextDay] = useState(null) // day string for context menu
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

      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <div className="min-w-[500px]">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] sm:text-xs font-medium text-gray-500">{d}</div>
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
                  className={`border-b border-r border-gray-100 p-1 sm:p-1.5 min-h-[56px] sm:min-h-0 relative ${!day ? 'bg-gray-50/40' : 'hover:bg-orange-50/30 cursor-pointer'} ${i % 7 === 6 ? 'border-r-0' : ''}`}
                  onClick={() => day && setContextDay(contextDay === dayStr ? null : dayStr)}
                >
                  {day && (
                    <>
                      <span className={`text-[10px] sm:text-xs font-medium block mb-0.5 sm:mb-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>
                        {day}
                      </span>
                      <div className="space-y-1 hidden sm:block" onClick={(e) => e.stopPropagation()}>
                        {dayIdeas.slice(0, 2).map((idea) => (
                          <KanbanMiniCard
                            key={idea.id}
                            idea={idea}
                            onClick={() => onCardClick(idea)}
                            onDelete={onDelete}
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
                      {/* Mobile: show dot indicators */}
                      {dayIdeas.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5 sm:hidden" onClick={(e) => { e.stopPropagation(); onCardClick(dayIdeas[0]) }}>
                          {dayIdeas.slice(0, 3).map((idea, idx) => (
                            <span key={idx} className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          ))}
                          {dayIdeas.length > 3 && <span className="text-[8px] text-gray-400">+{dayIdeas.length - 3}</span>}
                        </div>
                      )}
                      {/* Context menu — add idea or gap */}
                      {contextDay === dayStr && (
                        <div className="absolute z-20 mt-1 left-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px] animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setContextDay(null); onNewIdea(dayStr) }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                          >
                            <Plus size={11} /> Nova ideia
                          </button>
                          <button
                            onClick={() => { setContextDay(null); onAddGap(dayStr) }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Minus size={11} /> Lacuna
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
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
              <KanbanMiniCard key={idea.id} idea={idea} onClick={() => onCardClick(idea)} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Signal category config ───────────────────────────────────────────────────
const SIGNAL_CATEGORIES = {
  tecnologia:   { color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  comportamento:{ color: 'bg-blue-100 text-blue-700 border-blue-200',   dot: 'bg-blue-500' },
  plataforma:   { color: 'bg-teal-100 text-teal-700 border-teal-200',   dot: 'bg-teal-500' },
  debate:       { color: 'bg-red-100 text-red-600 border-red-200',      dot: 'bg-red-500' },
  formato:      { color: 'bg-amber-100 text-amber-700 border-amber-200',dot: 'bg-amber-500' },
  oportunidade: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
}
const ANGLE_LABELS = {
  'contrário':              { label: 'Contrário',         color: 'bg-red-100 text-red-600 border-red-200' },
  'consequência inesperada':{ label: 'Consequência',      color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'bastidores':             { label: 'Bastidores',        color: 'bg-gray-100 text-gray-600 border-gray-200' },
  'padrão emergente':       { label: 'Padrão Emergente',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'previsão':               { label: 'Previsão',          color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'erro comum':             { label: 'Erro Comum',        color: 'bg-amber-100 text-amber-700 border-amber-200' },
  'oportunidade':           { label: 'Oportunidade',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

const SIGNALS_LOADING_PHASES = [
  'Detectando sinais culturais...',
  'Identificando tensões subjacentes...',
  'Criando ângulos narrativos...',
  'Gerando ideias com estrutura...',
  'Rankeando por novidade e relevância...',
]
const INSIGHTS_LOADING_PHASES = [
  'Analisando seu contexto...',
  'Identificando ângulos únicos...',
  'Criando hooks irresistíveis...',
  'Estruturando roteiros...',
  'Refinando ideias finais...',
]

// ─── Signal card ─────────────────────────────────────────────────────────────
function SignalCard({ signal, relatedCount }) {
  const cat = SIGNAL_CATEGORIES[signal.category] || SIGNAL_CATEGORIES.oportunidade
  return (
    <div className="card p-4 space-y-2.5 hover:border-orange-200 transition-colors">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cat.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
          {signal.category}
        </span>
        {relatedCount > 0 && (
          <span className="ml-auto text-[10px] text-gray-400">{relatedCount} {relatedCount === 1 ? 'ideia' : 'ideias'}</span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-800 leading-snug">{signal.signal}</p>
      <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5">
        <p className="text-[10px] font-semibold text-orange-600 mb-0.5 uppercase tracking-wide">Tensão identificada</p>
        <p className="text-xs text-gray-700 leading-relaxed">{signal.tension}</p>
      </div>
    </div>
  )
}

// ─── Signal-based idea card ───────────────────────────────────────────────────
function SignalIdeaCard({ idea, signal, onSave, saved, rank }) {
  const [expanded, setExpanded] = useState(false)
  const angleInfo = ANGLE_LABELS[idea.angle] || { label: idea.angle, color: 'bg-gray-100 text-gray-600 border-gray-200' }
  const platforms = getPlatforms(idea)

  return (
    <div className={`card-hover p-5 space-y-4 relative flex flex-col transition-all ${saved ? 'opacity-60' : ''}`}>
      {saved && (
        <div className="absolute top-4 right-4 p-1.5 rounded-full bg-emerald-500 text-white">
          <Check size={11} />
        </div>
      )}

      {/* Rank + badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
          {rank}
        </span>
        <span className={`chip border text-[10px] ${angleInfo.color}`}>{angleInfo.label}</span>
        {signal && (
          <span className={`chip border text-[10px] ${(SIGNAL_CATEGORIES[signal.category] || SIGNAL_CATEGORIES.oportunidade).color}`}>
            {signal.category}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {idea.novelty_score && (
            <span className="text-[10px] text-gray-400">
              novidade <span className="font-bold text-orange-600">{idea.novelty_score}/10</span>
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-gray-900 leading-snug">{idea.title}</h3>

      {/* Core argument */}
      {idea.core_argument && (
        <p className="text-xs text-gray-600 leading-relaxed border-l-2 border-orange-300 pl-3">{idea.core_argument}</p>
      )}

      {/* Hook line */}
      {idea.hook_line && (
        <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
          <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-1 flex items-center gap-1">
            <Zap size={9} /> Hook de abertura
          </p>
          <p className="text-xs text-gray-800 font-medium italic leading-relaxed">"{idea.hook_line}"</p>
        </div>
      )}

      {/* Platform / format */}
      <div className="flex flex-wrap gap-1.5">
        {platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
        <FormatBadge format={idea.format} />
        <PriorityBadge priority={idea.priority} />
      </div>

      {/* Expandable: narrative structure */}
      {idea.narrative && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-orange-500 transition-colors font-medium"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Fechar estrutura' : 'Ver estrutura narrativa completa'}
          </button>

          {expanded && (
            <div className="space-y-2 pt-1 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Estrutura narrativa</p>
              {[
                { label: 'Hook', key: 'hook', color: 'border-orange-300 bg-orange-50' },
                { label: 'Observação', key: 'observation', color: 'border-blue-200 bg-blue-50' },
                { label: 'Tensão', key: 'tension', color: 'border-red-200 bg-red-50' },
                { label: 'Interpretação', key: 'interpretation', color: 'border-purple-200 bg-purple-50' },
                { label: 'Conclusão', key: 'conclusion', color: 'border-emerald-200 bg-emerald-50' },
              ].map(({ label, key, color }) => idea.narrative[key] && (
                <div key={key} className={`p-2.5 rounded-lg border ${color}`}>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{idea.narrative[key]}</p>
                </div>
              ))}

              {/* Hashtags */}
              {idea.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {idea.hashtags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Save */}
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

// ─── Visualização Gerar ───────────────────────────────────────────────────────
function GenerateView() {
  const insights          = useStore((s) => s.insights)
  const trendResults      = useStore((s) => s.trendResults)
  const generatedIdeas    = useStore((s) => s.generatedIdeas)
  const setGeneratedIdeas = useStore((s) => s.setGeneratedIdeas)
  const saveGeneratedIdea = useStore((s) => s.saveGeneratedIdea)
  const addIdea           = useStore((s) => s.addIdea)

  const [mode, setMode]             = useState('signals') // 'signals' | 'insights'
  const [loading, setLoading]       = useState(false)
  const [loadPhase, setLoadPhase]   = useState(0)
  const [niche, setNiche]           = useState('')
  const [audience, setAudience]     = useState('')
  const [source, setSource]         = useState('all')
  const [savedIds, setSavedIds]     = useState(new Set())
  const [error, setError]           = useState(null)
  const [signalResult, setSignalResult] = useState(null) // { signals, ideas }

  const hasInsights = insights.length > 0
  const hasTrends   = !!trendResults
  const hasApiKey   = !!localStorage.getItem('cio-anthropic-key')
  const PHASES      = mode === 'signals' ? SIGNALS_LOADING_PHASES : INSIGHTS_LOADING_PHASES

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setLoadPhase(0)
    setSavedIds(new Set())

    const phaseInterval = setInterval(() => {
      setLoadPhase((p) => (p < PHASES.length - 1 ? p + 1 : p))
    }, 1000)

    try {
      const apiKey = localStorage.getItem('cio-anthropic-key')

      if (mode === 'signals') {
        if (!apiKey) throw new Error('Sinais Culturais requer a chave Anthropic. Configure em Configurações.')
        const result = await generateSignalBasedIdeas(apiKey, {
          niche: niche.trim() || 'criação de conteúdo digital',
          audience: audience.trim() || undefined,
          insights: (source === 'insights' || source === 'all') ? insights : [],
          trendResults: (source === 'trends' || source === 'all') ? trendResults : null,
        })
        setSignalResult(result)
      } else {
        // Insights mode
        if (apiKey) {
          const ideas = await generateIdeasWithClaude(apiKey, {
            niche: niche.trim() || undefined,
            audience: audience.trim() || undefined,
            insights: (source === 'insights' || source === 'all') ? insights : [],
            trendResults: (source === 'trends' || source === 'all') ? trendResults : null,
            count: 10,
          })
          setGeneratedIdeas(ideas)
        } else {
          await new Promise((r) => setTimeout(r, 1200))
          let ideas = []
          if (source === 'insights' || source === 'all') ideas = [...ideas, ...generateIdeasFromInsights(insights, 6)]
          if ((source === 'trends' || source === 'all') && trendResults) ideas = [...ideas, ...generateIdeasFromTrends(trendResults, 4)]
          if (ideas.length === 0) ideas = generateIdeasFromInsights([], 6)
          setGeneratedIdeas(ideas)
        }
      }
    } catch (e) {
      setError(e.message || 'Erro ao gerar ideias')
    } finally {
      clearInterval(phaseInterval)
      setLoading(false)
    }
  }

  const handleSaveSignalIdea = (idea) => {
    addIdea({
      title: idea.title,
      description: idea.core_argument || idea.tension || '',
      topic: niche || 'Conteúdo',
      format: idea.format,
      hook_type: idea.hook_type,
      platform: idea.platform,
      priority: idea.priority || 'medium',
      status: 'idea',
      tags: ['sinal-cultural', niche].filter(Boolean),
    })
    setSavedIds((s) => new Set([...s, idea.id]))
  }

  const handleSaveAllSignals = () => {
    ;(signalResult?.ideas || []).forEach((idea) => {
      if (!savedIds.has(idea.id)) handleSaveSignalIdea(idea)
    })
  }

  const handleSaveInsight = (idea) => {
    saveGeneratedIdea(idea)
    setSavedIds((s) => new Set([...s, idea.id]))
  }

  const handleSaveAllInsights = () => {
    generatedIdeas.forEach((idea) => {
      if (!savedIds.has(idea.id)) saveGeneratedIdea(idea)
    })
    setSavedIds(new Set(generatedIdeas.map((i) => i.id)))
  }

  const hasResults = mode === 'signals' ? !!signalResult : generatedIdeas.length > 0

  return (
    <div className="space-y-5">

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            id: 'signals',
            icon: Flame,
            title: 'Sinais Culturais',
            desc: 'Detecta tensões reais e gera ideias que soam como conversas do momento',
            badge: 'Novo · Mais poderoso',
            badgeColor: 'bg-orange-100 text-orange-700',
          },
          {
            id: 'insights',
            icon: Sparkles,
            title: 'Por Insights & Tendências',
            desc: 'Usa seus dados de analytics e radar de tendências para gerar ideias',
            badge: hasApiKey ? 'IA Real' : 'Templates',
            badgeColor: hasApiKey ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
          },
        ].map(({ id, icon: Icon, title, desc, badge, badgeColor }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              mode === id
                ? 'border-orange-400 bg-orange-50/60'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${mode === id ? 'bg-orange-500' : 'bg-gray-100'}`}>
                <Icon size={14} className={mode === id ? 'text-white' : 'text-gray-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-bold ${mode === id ? 'text-gray-900' : 'text-gray-600'}`}>{title}</span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">{desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Config inputs */}
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <Target size={11} /> {mode === 'signals' ? 'Nicho (obrigatório para sinais)' : 'Nicho / Tema Principal'}
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
            <p className="text-[11px] text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Contexto:</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'all', label: 'Tudo', icon: RefreshCw },
                { id: 'insights', label: `Insights ${hasInsights ? `(${insights.length})` : '(0)'}`, icon: Sparkles, disabled: !hasInsights },
                { id: 'trends', label: `Tendências ${hasTrends ? `(${trendResults?.topic})` : '(nenhuma)'}`, icon: Radar, disabled: !hasTrends },
                { id: 'ai', label: 'Sem contexto', icon: Zap },
              ].map(({ id, label, icon: Icon, disabled }) => (
                <button key={id} onClick={() => !disabled && setSource(id)} disabled={disabled}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    source === id ? 'bg-orange-100 border-orange-300 text-orange-700'
                    : disabled ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}>
                  <Icon size={11} /> {label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleGenerate} disabled={loading || (mode === 'signals' && !niche.trim())}
            className="btn-primary shrink-0 gap-2">
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Gerando...</>
              : mode === 'signals'
                ? <><Flame size={14} /> Detectar Sinais e Gerar</>
                : <><Brain size={14} /> Gerar {hasApiKey ? '10 Ideias com IA' : 'Ideias'}</>
            }
          </button>
        </div>

        {mode === 'signals' && !hasApiKey && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">
              <span className="font-semibold">Sinais Culturais requer a chave Anthropic.</span> Configure em Configurações para ativar o gerador de próxima geração.
            </p>
          </div>
        )}
        {mode === 'signals' && !niche.trim() && (
          <p className="text-[11px] text-orange-500 flex items-center gap-1">
            <AlertCircle size={10} /> Preencha o nicho para gerar sinais específicos para o seu espaço.
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="card p-12 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            {mode === 'signals' ? <Flame size={20} className="absolute inset-0 m-auto text-orange-500" /> : <Brain size={20} className="absolute inset-0 m-auto text-orange-500" />}
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold text-gray-800">{PHASES[loadPhase]}</p>
            <div className="flex justify-center gap-1">
              {PHASES.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= loadPhase ? 'bg-orange-500 w-6' : 'bg-gray-200 w-3'}`} />
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {mode === 'signals' ? `Analisando o espaço de "${niche}" para sinais culturais reais` : 'Claude está criando ideias baseadas no seu contexto'}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div><p className="text-sm font-medium text-red-700">Erro ao gerar ideias</p><p className="text-xs text-red-500 mt-0.5">{error}</p></div>
          <button onClick={handleGenerate} className="ml-auto text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
            <RefreshCw size={11} /> Tentar novamente
          </button>
        </div>
      )}

      {/* ── Signals mode results ──────────────────────────────────────────────── */}
      {!loading && !error && mode === 'signals' && signalResult && (
        <div className="space-y-6">
          {/* Signals detected */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Flame size={14} className="text-orange-500" /> Sinais Culturais Detectados
                <span className="text-[11px] text-gray-400 font-normal">— tensões que sua audiência está vivendo agora</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(signalResult.signals || []).map((signal) => {
                const count = (signalResult.ideas || []).filter((i) => i.signal_id === signal.id).length
                return <SignalCard key={signal.id} signal={signal} relatedCount={count} />
              })}
            </div>
          </div>

          {/* Ideas ranked */}
          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-500" /> Ideias Rankeadas por Relevância Cultural
                {savedIds.size > 0 && <span className="text-xs text-emerald-600 font-normal">{savedIds.size} salvas</span>}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={handleSaveAllSignals} className="btn-ghost text-xs border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Check size={12} /> Salvar Todas
                </button>
                <button onClick={handleGenerate} className="btn-ghost text-xs">
                  <RefreshCw size={12} /> Regenerar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(signalResult.ideas || [])
                .sort((a, b) => (a.rank || 99) - (b.rank || 99))
                .map((idea, idx) => {
                  const signal = (signalResult.signals || []).find((s) => s.id === idea.signal_id)
                  return (
                    <SignalIdeaCard
                      key={idea.id}
                      idea={idea}
                      signal={signal}
                      rank={idea.rank || idx + 1}
                      onSave={handleSaveSignalIdea}
                      saved={savedIds.has(idea.id)}
                    />
                  )
                })}
            </div>
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

      {/* ── Insights mode results ─────────────────────────────────────────────── */}
      {!loading && !error && mode === 'insights' && generatedIdeas.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-semibold text-gray-800">
              {generatedIdeas.length} Ideias Geradas
              {savedIds.size > 0 && <span className="ml-2 text-xs text-emerald-600 font-normal">{savedIds.size} salvas</span>}
            </h3>
            <div className="flex items-center gap-2">
              {savedIds.size < generatedIdeas.length && (
                <button onClick={handleSaveAllInsights} className="btn-ghost text-xs border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Check size={12} /> Salvar Todas
                </button>
              )}
              <button onClick={handleGenerate} className="btn-ghost text-xs"><RefreshCw size={12} /> Regenerar</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {generatedIdeas.map((idea) => (
              <GeneratedIdeaCard key={idea.id} idea={idea} onSave={handleSaveInsight} saved={savedIds.has(idea.id)} />
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
      {!loading && !error && !hasResults && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shadow-sm ${mode === 'signals' ? 'bg-gradient-to-br from-orange-100 to-red-100 border border-orange-200' : 'bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200'}`}>
            {mode === 'signals' ? <Flame size={32} className="text-orange-500" /> : <Brain size={32} className="text-orange-500" />}
          </div>
          <h3 className="text-gray-800 font-semibold text-base mb-2">
            {mode === 'signals' ? 'Detectar sinais culturais no seu nicho' : 'Gerar ideias baseadas nos seus dados'}
          </h3>
          <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
            {mode === 'signals'
              ? `Preencha o nicho e clique em "Detectar Sinais". A IA vai identificar tensões reais de 2025–2026 e criar ideias que soam como conversas do momento — sem guias genéricos.`
              : 'Use seus insights de analytics e dados de tendências para criar ideias específicas ao seu contexto.'}
          </p>
          <button onClick={handleGenerate} disabled={mode === 'signals' && !niche.trim()} className="btn-primary mt-5 gap-2">
            {mode === 'signals' ? <><Flame size={14} /> Detectar Sinais e Gerar</> : <><Brain size={14} /> Gerar Ideias</>}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Insights mode card (existing shape) ─────────────────────────────────────
function GeneratedIdeaCard({ idea, onSave, saved }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = SOURCE_ICONS[idea.source_type] || Zap
  const sourceLabel = idea.source_type === 'insight' ? 'De Insights' : idea.source_type === 'trend' ? 'De Tendências' : 'Gerado por IA'
  const platforms = getPlatforms(idea)
  const hasExtras = idea.hook_suggestion || idea.script_outline?.length || idea.hashtags?.length || idea.angle || idea.why_now

  return (
    <div className={`card-hover p-4 space-y-3 relative flex flex-col transition-all ${saved ? 'opacity-70' : ''}`}>
      {saved && <div className="absolute top-3 right-3 p-1 rounded-full bg-emerald-500 text-white"><Check size={11} /></div>}
      <div className="flex items-center gap-1.5 flex-wrap">
        {idea.ai_powered
          ? <span className="chip border text-[10px] bg-orange-100 text-orange-700 border-orange-200"><Brain size={9} /> IA Real</span>
          : <span className={`chip border text-[10px] ${SOURCE_COLORS[idea.source_type] || SOURCE_COLORS.ai}`}><Icon size={9} /> {sourceLabel}</span>
        }
        {idea.hook && <span className="chip border text-[10px] bg-gray-100 text-gray-600 border-gray-200 capitalize">{idea.hook}</span>}
      </div>
      <h3 className="text-sm font-semibold text-gray-800 leading-snug">{idea.title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{idea.description}</p>
      {idea.hook_suggestion && (
        <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-100">
          <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-1 flex items-center gap-1"><Zap size={9} /> Hook de abertura</p>
          <p className="text-xs text-gray-700 italic leading-relaxed">"{idea.hook_suggestion}"</p>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
        <FormatBadge format={idea.format} />
        <PriorityBadge priority={idea.priority} />
      </div>
      {hasExtras && (
        <>
          <button onClick={() => setExpanded((e) => !e)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-orange-500 transition-colors font-medium">
            {expanded ? <><ChevronUp size={12} /> Menos detalhes</> : <><ChevronDown size={12} /> Ver roteiro, ângulo e hashtags</>}
          </button>
          {expanded && (
            <div className="space-y-3 pt-1 border-t border-gray-100">
              {idea.why_now && <div><p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1"><Radar size={9} /> Por que agora</p><p className="text-xs text-gray-600 leading-relaxed">{idea.why_now}</p></div>}
              {idea.angle && <div><p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-1 flex items-center gap-1"><Target size={9} /> Ângulo único</p><p className="text-xs text-gray-600 leading-relaxed">{idea.angle}</p></div>}
              {idea.script_outline?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1.5 flex items-center gap-1"><FileText size={9} /> Roteiro resumido</p>
                  <ol className="space-y-1">{idea.script_outline.map((pt, i) => <li key={i} className="text-xs text-gray-600 flex gap-2"><span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span><span>{pt}</span></li>)}</ol>
                </div>
              )}
              {idea.hashtags?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Hash size={9} /> Hashtags</p>
                  <div className="flex flex-wrap gap-1">{idea.hashtags.map((tag) => <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{tag}</span>)}</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <div className="pt-2 border-t border-gray-100 mt-auto">
        <button onClick={() => onSave(idea)} disabled={saved}
          className={saved ? 'flex items-center gap-1.5 text-xs text-emerald-600 font-medium' : 'btn-primary text-xs w-full justify-center py-2'}>
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
  { id: 'order',    label: 'Ordem',     icon: ListOrdered },
]

// ─── Visualização Ordem de Criação ────────────────────────────────────────────
function OrderView({ ideas, updateIdea, onCardClick }) {
  // Sort by creation_order (nulls at end), then by priority
  const sorted = [...ideas]
    .filter((i) => i.status !== 'published')
    .sort((a, b) => {
      const oa = a.creation_order ?? 9999
      const ob = b.creation_order ?? 9999
      if (oa !== ob) return oa - ob
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })

  const onDragEnd = ({ source, destination }) => {
    if (!destination || source.index === destination.index) return
    const reordered = [...sorted]
    const [moved] = reordered.splice(source.index, 1)
    reordered.splice(destination.index, 0, moved)
    reordered.forEach((idea, idx) => {
      updateIdea(idea.id, { creation_order: idx + 1 })
    })
  }

  const resetOrder = () => {
    sorted.forEach((idea) => updateIdea(idea.id, { creation_order: null }))
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ListOrdered size={28} className="text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Nenhuma ideia pendente</p>
        <p className="text-gray-400 text-xs mt-1">Ideias publicadas não aparecem aqui</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Arraste para definir a ordem de criação e postagem. {sorted.filter(i => i.creation_order).length}/{sorted.length} ordenadas.
        </p>
        <button onClick={resetOrder} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <RefreshCw size={10} /> Resetar ordem
        </button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="order-list">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
              {sorted.map((idea, idx) => {
                const platforms = getPlatforms(idea)
                return (
                  <Draggable key={idea.id} draggableId={idea.id} index={idx}>
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className={`flex items-center gap-3 bg-white border rounded-xl p-3 transition-all ${
                          snap.isDragging ? 'border-orange-400 shadow-lg shadow-orange-100/50' : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <span
                          {...prov.dragHandleProps}
                          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
                        >
                          <GripVertical size={14} />
                        </span>
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          idea.creation_order ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onCardClick(idea)}>
                          <p className="text-xs font-medium text-gray-800 truncate">{idea.title}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
                            <FormatBadge format={idea.format} />
                            <PriorityBadge priority={idea.priority} />
                            {idea.scheduled_date && (
                              <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                                <Calendar size={9} /> {idea.scheduled_date}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${
                          idea.status === 'idea' ? 'bg-orange-100 text-orange-600' :
                          idea.status === 'draft' ? 'bg-blue-100 text-blue-600' :
                          'bg-emerald-100 text-emerald-600'
                        }`}>
                          {idea.status === 'idea' ? 'Ideia' : idea.status === 'draft' ? 'Rascunho' : 'Pronto'}
                        </span>
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}

const STATUS_LABELS_FILTER   = { all: 'Todos Status',      idea: 'Ideia', draft: 'Rascunho', ready: 'Pronto', published: 'Publicado' }
const PRIORITY_LABELS_FILTER = { all: 'Todas Prioridades', high: 'Alta',  medium: 'Média',   low: 'Baixa' }

// ─── Componente principal ─────────────────────────────────────────────────────
export default function IdeasHub() {
  const navigate          = useNavigate()
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
  const [showFilters, setShowFilters]       = useState(false)

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
    .sort((a, b) => {
      const dateA = a.scheduled_date || ''
      const dateB = b.scheduled_date || ''
      if (dateA && dateB) return dateA.localeCompare(dateB)
      if (dateA) return -1
      if (dateB) return 1
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })

  const handleSave = (data) => {
    if (editTarget?.id) updateIdea(editTarget.id, data)
    else addIdea(data)
    setEditTarget(null)
  }

  const openEdit = (idea) => { setEditTarget(idea); setFormOpen(true) }
  const openNew  = (defaults = null) => { setEditTarget(defaults); setFormOpen(true) }
  const handleCalendarDateClick = (dateStr) => openNew({ scheduled_date: dateStr })

  const handleAddGap = (dateStr) => {
    addIdea({
      title: 'Lacuna — reservado',
      status: 'idea',
      priority: 'low',
      format: '',
      platforms: [],
      tags: ['lacuna'],
      scheduled_date: dateStr,
      notes: 'Espaço reservado no calendário. Substitua por uma ideia real.',
    })
  }

  const handleTagClick = (tag) => setFilterTag((prev) => (prev === tag ? null : tag))

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      {/* Barra de abas + botão Nova Ideia */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto flex-1 min-w-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 sm:px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                tab === id ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={13} /> <span className="hidden sm:inline">{label}</span>
              {id === 'kanban' && ideas.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-0.5">
                  {ideas.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => navigate('/generate')} className="btn-secondary text-xs sm:text-sm px-3 sm:px-4">
            <Zap size={14} /> <span className="hidden sm:inline">Gerar com IA</span>
          </button>
          {ideas.length > 0 && (
            <button onClick={() => openNew()} className="btn-primary text-xs sm:text-sm px-3 sm:px-4">
              <Plus size={15} /> <span className="hidden sm:inline">Nova Ideia</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {(tab === 'kanban' || tab === 'calendar' || tab === 'order') && (() => {
        const activeFilterCount = (filterPlatform !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (filterPriority !== 'all' ? 1 : 0) + (filterTag ? 1 : 0)
        return (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-8" placeholder="Buscar ideias..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button
              onClick={() => setShowFilters((f) => !f)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                showFilters || activeFilterCount > 0
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              <SlidersHorizontal size={13} />
              Filtros
              {activeFilterCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <p className="text-[11px] text-gray-400 sm:ml-auto">{filtered.length} de {ideas.length} ideias</p>
          </div>

          {showFilters && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap animate-fade-in">
              <div className="flex gap-2 flex-wrap">
                <select className="select w-auto flex-1 sm:flex-none text-xs" value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
                  {allPlatforms.map((p) => <option key={p} value={p}>{p === 'all' ? 'Plataforma' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                <select className="select w-auto flex-1 sm:flex-none text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  {['all','idea','draft','ready','published'].map((s) => <option key={s} value={s}>{STATUS_LABELS_FILTER[s] || s}</option>)}
                </select>
                <select className="select w-auto flex-1 sm:flex-none text-xs" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  {['all','high','medium','low'].map((p) => <option key={p} value={p}>{PRIORITY_LABELS_FILTER[p] || p}</option>)}
                </select>
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
        </div>
        )
      })()}

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
          <KanbanView ideas={filtered} updateIdea={updateIdea} onCardClick={openEdit} onTagClick={handleTagClick} onDelete={deleteIdea} />
        )
      )}

      {/* Visualização Calendário */}
      {tab === 'calendar' && (
        <CalendarView ideas={filtered} onCardClick={openEdit} onNewIdea={handleCalendarDateClick} onDelete={deleteIdea} onAddGap={handleAddGap} />
      )}

      {/* Visualização Ordem */}
      {tab === 'order' && (
        <OrderView ideas={filtered} updateIdea={updateIdea} onCardClick={openEdit} />
      )}

      {/* Link rápido para Gerador de Ideias */}

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
