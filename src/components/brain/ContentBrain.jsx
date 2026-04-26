import { useState, useMemo } from 'react'
import {
  Brain, Plus, Trash2, ArrowRight, AlertTriangle, Archive,
  Clock, X, CheckCircle2, ChevronDown, ChevronUp, Flame,
  BarChart2, Target, RefreshCw, Inbox, CheckSquare, Layers, ListTodo,
} from 'lucide-react'
import useStore from '../../store/useStore'
import TaskBoard from '../tasks/TaskBoard'

// ── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_PILLARS = ['IA', 'Carreira', 'Maturidade', 'Negócio', 'Conteúdo', 'Pessoal']

const PILLAR_COLORS = {
  'IA':         'bg-violet-100 text-violet-700 border-violet-200',
  'Carreira':   'bg-blue-100 text-blue-700 border-blue-200',
  'Maturidade': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Negócio':    'bg-orange-100 text-orange-700 border-orange-200',
  'Conteúdo':   'bg-rose-100 text-rose-700 border-rose-200',
  'Pessoal':    'bg-amber-100 text-amber-700 border-amber-200',
}

const pillarColor = (p) =>
  PILLAR_COLORS[p] || 'bg-gray-100 text-gray-600 border-gray-200'

// ── Score formula: Impact² / Effort ───────────────────────────────────────
function calcScore(impact, effort) {
  if (!effort) return 0
  return Math.round((impact * impact) / effort * 10) / 10
}

function scoreColor(score) {
  if (score >= 10) return { ring: 'ring-emerald-400', bg: 'bg-emerald-50 text-emerald-700', label: 'Ouro' }
  if (score >= 6)  return { ring: 'ring-orange-400',  bg: 'bg-orange-50 text-orange-700',   label: 'Alto' }
  if (score >= 3)  return { ring: 'ring-amber-400',   bg: 'bg-amber-50 text-amber-700',     label: 'Médio' }
  return               { ring: 'ring-gray-300',    bg: 'bg-gray-100 text-gray-500',      label: 'Baixo' }
}

// ── Stale detection ────────────────────────────────────────────────────────
function staleDays(item) {
  return Math.floor((Date.now() - new Date(item.updated_at || item.created_at)) / 86400000)
}

// ── ImpactBar / EffortBar ──────────────────────────────────────────────────
function RatingDots({ value, max = 5, activeClass }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div key={i}
          className={`w-2 h-2 rounded-full border ${i < value ? activeClass : 'border-gray-200 bg-transparent'}`}
        />
      ))}
    </div>
  )
}

// ── Item Card ──────────────────────────────────────────────────────────────
function BrainCard({ item, onMove, onDelete, compact = false }) {
  const [expanded, setExpanded] = useState(false)
  const score = calcScore(item.impact, item.effort)
  const sc = scoreColor(score)
  const days = staleDays(item)
  const stale = days >= 30
  const critical = days >= 60

  return (
    <div
      onClick={() => setExpanded((e) => !e)}
      className={`card p-3.5 space-y-2.5 cursor-pointer transition-all duration-150
        hover:border-orange-200 hover:shadow-md
        ${critical ? 'border-red-200' : stale ? 'border-amber-200' : ''}`}
    >
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        {/* Score badge */}
        <div className={`shrink-0 w-10 h-10 rounded-xl ring-2 ${sc.ring} flex flex-col items-center justify-center`}>
          <span className="text-[11px] font-bold text-gray-800 leading-none">{score}</span>
          <span className="text-[8px] text-gray-400 leading-none mt-0.5">{sc.label}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{item.title}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {item.pillar && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${pillarColor(item.pillar)}`}>
                {item.pillar}
              </span>
            )}
            {critical && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium flex items-center gap-1">
                <Archive size={9} /> Arquivando em breve
              </span>
            )}
            {stale && !critical && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium flex items-center gap-1">
                <AlertTriangle size={9} /> Degradando
              </span>
            )}
          </div>
        </div>

        {expanded
          ? <ChevronUp size={12} className="text-gray-400 shrink-0 mt-1" />
          : <ChevronDown size={12} className="text-gray-400 shrink-0 mt-1" />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-2 pt-1 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">Impacto</p>
              <RatingDots value={item.impact} activeClass="bg-orange-400 border-orange-400" />
            </div>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">Esforço</p>
              <RatingDots value={item.effort} activeClass="bg-blue-400 border-blue-400" />
            </div>
          </div>
          {item.notes && (
            <p className="text-[11px] text-gray-500 leading-relaxed bg-gray-50 rounded-lg p-2">
              {item.notes}
            </p>
          )}
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <Clock size={10} />
            {days === 0 ? 'Hoje' : `${days}d atrás`}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {item.status === 'inbox' && (
              <button onClick={() => onMove(item.id, 'backlog')}
                className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">
                <ArrowRight size={10} /> Backlog
              </button>
            )}
            {item.status === 'backlog' && (
              <button onClick={() => onMove(item.id, 'doing')}
                className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors">
                <Flame size={10} /> Focar
              </button>
            )}
            {item.status === 'doing' && (
              <button onClick={() => onMove(item.id, 'done')}
                className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                <CheckCircle2 size={10} /> Concluir
              </button>
            )}
            {item.status !== 'archived' && (
              <button onClick={() => onMove(item.id, 'backlog')}
                className={`text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${item.status === 'backlog' ? 'hidden' : ''}`}>
                <RefreshCw size={10} /> Backlog
              </button>
            )}
            {item.status !== 'inbox' && item.status !== 'archived' && (
              <button onClick={() => onMove(item.id, 'inbox')}
                className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <Inbox size={10} /> Fornalha
              </button>
            )}
            <button onClick={() => onMove(item.id, 'archived')}
              className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <Archive size={10} /> Arquivar
            </button>
            <button onClick={() => onDelete(item.id)}
              className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-auto">
              <Trash2 size={10} /> Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Form ───────────────────────────────────────────────────────────────
function AddForm({ onAdd, onClose }) {
  const [title, setTitle]   = useState('')
  const [pillar, setPillar] = useState(DEFAULT_PILLARS[0])
  const [impact, setImpact] = useState(3)
  const [effort, setEffort] = useState(3)
  const [notes, setNotes]   = useState('')
  const preview = calcScore(impact, effort)
  const sc = scoreColor(preview)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onAdd({ title: title.trim(), pillar, impact, effort, notes: notes.trim() })
    setTitle(''); setNotes(''); setImpact(3); setEffort(3)
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3 border-orange-200 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">Nova ideia / tarefa</p>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X size={14} />
        </button>
      </div>

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="O que precisa ser feito?"
        className="input text-sm"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Pilar</label>
          <select value={pillar} onChange={(e) => setPillar(e.target.value)} className="select text-sm">
            {DEFAULT_PILLARS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Score estimado</label>
          <div className={`flex items-center justify-center h-9 rounded-lg text-sm font-bold ${sc.bg} border border-current/20`}>
            {preview} — {sc.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label flex items-center justify-between">
            <span>Impacto</span>
            <span className="font-bold text-orange-600">{impact}/5</span>
          </label>
          <input type="range" min={1} max={5} value={impact}
            onChange={(e) => setImpact(+e.target.value)}
            className="w-full h-1.5 rounded-full accent-orange-500" />
          <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
            <span>Baixo</span><span>Alto</span>
          </div>
        </div>
        <div>
          <label className="label flex items-center justify-between">
            <span>Esforço</span>
            <span className="font-bold text-blue-600">{effort}/5</span>
          </label>
          <input type="range" min={1} max={5} value={effort}
            onChange={(e) => setEffort(+e.target.value)}
            className="w-full h-1.5 rounded-full accent-blue-500" />
          <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
            <span>Fácil</span><span>Difícil</span>
          </div>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Contexto ou observações (opcional)"
        rows={2}
        className="input text-sm resize-none"
      />

      <button type="submit" disabled={!title.trim()} className="btn-primary w-full justify-center">
        <Plus size={15} /> Adicionar à Fornalha
      </button>
    </form>
  )
}


// ── Doing-limit modal ──────────────────────────────────────────────────────
function FocusLimitModal({ doingItems, candidateId, onSwap, onCancel, onMove }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Target size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Limite de foco atingido</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Você já tem 3 itens em foco. Qual você vai pausar para trabalhar neste?
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {doingItems.map((item) => (
            <button key={item.id}
              onClick={() => onSwap(item.id, candidateId)}
              className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all group">
              <p className="text-xs font-medium text-gray-800 group-hover:text-orange-800">{item.title}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Score {calcScore(item.impact, item.effort)} · {item.pillar}
              </p>
            </button>
          ))}
        </div>

        <button onClick={onCancel}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
          Cancelar — manter foco atual
        </button>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ContentBrain() {
  const brainItems      = useStore((s) => s.brainItems)
  const addBrainItem    = useStore((s) => s.addBrainItem)
  const updateBrainItem = useStore((s) => s.updateBrainItem)
  const deleteBrainItem = useStore((s) => s.deleteBrainItem)

  const tasks = useStore((s) => s.tasks)

  const [tab, setTab]               = useState('inbox')
  const [showAdd, setShowAdd]       = useState(false)
  const [filterLH, setFilterLH]     = useState(false)
  const [groupPillar, setGroupPillar] = useState(false)
  const [focusModal, setFocusModal] = useState(null)
  const [showDone, setShowDone]     = useState(false)

  // ── Auto-archive stale items (60d) ───────────────────────────────────────
  const items = useMemo(() => {
    return brainItems.map((item) => {
      if (item.status === 'backlog' && staleDays(item) >= 60) {
        return { ...item, status: 'archived' }
      }
      return item
    })
  }, [brainItems])

  // ── Derived lists ─────────────────────────────────────────────────────────
  const inbox   = useMemo(() => items.filter((i) => i.status === 'inbox'), [items])
  const doing   = useMemo(() => items.filter((i) => i.status === 'doing'), [items])
  const done    = useMemo(() => items.filter((i) => i.status === 'done'), [items])

  const backlog = useMemo(() => {
    let list = items.filter((i) => i.status === 'backlog')
    if (filterLH) list = list.filter((i) => i.effort <= 2 && i.impact >= 4)
    return list.sort((a, b) => calcScore(b.impact, b.effort) - calcScore(a.impact, a.effort))
  }, [items, filterLH])

  const grouped = useMemo(() => {
    if (!groupPillar) return null
    const map = {}
    backlog.forEach((item) => {
      const key = item.pillar || 'Sem pilar'
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    return map
  }, [backlog, groupPillar])

  // ── Tasks count (for header/tab badge) ───────────────────────────────────
  const activeTasksCount = useMemo(() =>
    tasks.filter((t) => t.status !== 'done').length,
    [tasks])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const topScore = useMemo(() =>
    backlog.length > 0 ? calcScore(backlog[0].impact, backlog[0].effort) : 0,
    [backlog])

  const staleCount = useMemo(() =>
    items.filter((i) => i.status === 'backlog' && staleDays(i) >= 30).length,
    [items])

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAdd = (data) => {
    addBrainItem(data)
    setShowAdd(false)
  }

  const handleMove = (id, status) => {
    if (status === 'doing' && doing.length >= 3) {
      setFocusModal(id)
      return
    }
    updateBrainItem(id, { status, updated_at: new Date().toISOString() })
  }

  const handleSwap = (pauseId, focusId) => {
    updateBrainItem(pauseId, { status: 'backlog', updated_at: new Date().toISOString() })
    updateBrainItem(focusId, { status: 'doing', updated_at: new Date().toISOString() })
    setFocusModal(null)
  }

  const TABS = [
    { id: 'inbox',   label: 'Fornalha',  icon: Inbox,      count: inbox.length },
    { id: 'backlog', label: 'Backlog',   icon: BarChart2,   count: backlog.length },
    { id: 'doing',   label: 'Foco',      icon: Flame,      count: doing.length, max: 3 },
    { id: 'tasks',   label: 'Tarefas',   icon: CheckSquare, count: activeTasksCount },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Brain size={22} />
            <h1 className="text-lg font-bold">Content Brain</h1>
          </div>
          <p className="text-sm text-white/80">Score = Impacto² ÷ Esforço — o topo da lista é sempre o que entrega mais com menos suor.</p>
        </div>
        {/* Stats row */}
        <div className="relative z-10 flex gap-4 mt-4 flex-wrap">
          {[
            { label: 'No backlog', value: backlog.length },
            { label: 'Top score', value: topScore },
            { label: 'Degradando', value: staleCount },
            { label: 'Foco hoje', value: `${doing.length}/3` },
            { label: 'Tarefas', value: activeTasksCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/15 rounded-xl px-3 py-1.5">
              <div className="text-base font-bold">{value}</div>
              <div className="text-[10px] text-white/70">{label}</div>
            </div>
          ))}
        </div>
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map(({ id, label, icon: Icon, count, max }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              tab === id ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'
            } ${max && count >= max ? '!bg-red-100 !text-red-600' : ''}`}>
              {count}{max ? `/${max}` : ''}
            </span>
          </button>
        ))}
      </div>

      {/* ── FORNALHA ────────────────────────────────────────────────────── */}
      {tab === 'inbox' && (
        <div className="space-y-3">
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)}
              className="w-full flex items-center gap-2 p-3.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-all text-sm font-medium">
              <Plus size={16} /> Capturar nova ideia...
            </button>
          ) : (
            <AddForm onAdd={handleAdd} onClose={() => setShowAdd(false)} />
          )}

          {inbox.length === 0 && !showAdd && (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <Inbox size={32} className="mx-auto text-gray-200" />
              <p className="text-sm font-medium">Fornalha vazia</p>
              <p className="text-xs">Capture ideias sem julgamento. Classifique depois.</p>
            </div>
          )}

          {inbox.map((item) => (
            <BrainCard key={item.id} item={item} onMove={handleMove} onDelete={deleteBrainItem} />
          ))}
        </div>
      )}

      {/* ── BACKLOG ──────────────────────────────────────────────────────── */}
      {tab === 'backlog' && (
        <div className="space-y-3">
          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterLH((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                filterLH
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              🍎 Low Hanging {filterLH && '— ativo'}
            </button>
            <button onClick={() => setGroupPillar((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                groupPillar
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              <Layers size={12} /> Agrupar por pilar
            </button>
            {staleCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">
                <AlertTriangle size={12} /> {staleCount} degradando
              </span>
            )}
          </div>

          {backlog.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <ListTodo size={32} className="mx-auto text-gray-200" />
              <p className="text-sm font-medium">{filterLH ? 'Sem Low Hanging Fruits no momento' : 'Backlog vazio'}</p>
              <p className="text-xs">Mova itens da Fornalha para cá depois de classificar.</p>
            </div>
          ) : grouped ? (
            Object.entries(grouped).map(([pillar, pitems]) => (
              <div key={pillar} className="space-y-2">
                <div className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-semibold ${pillarColor(pillar)}`}>
                  {pillar} · {pitems.length}
                </div>
                {pitems.map((item) => (
                  <BrainCard key={item.id} item={item} onMove={handleMove} onDelete={deleteBrainItem} />
                ))}
              </div>
            ))
          ) : (
            backlog.map((item, i) => (
              <div key={item.id} className="relative">
                {i === 0 && (
                  <div className="absolute -left-1 -top-1 z-10">
                    <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                      #1
                    </span>
                  </div>
                )}
                <BrainCard item={item} onMove={handleMove} onDelete={deleteBrainItem} />
              </div>
            ))
          )}
        </div>
      )}

      {/* ── FOCO DO DIA ──────────────────────────────────────────────────── */}
      {tab === 'doing' && (
        <div className="space-y-3">
          {/* Progress */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Target size={13} className="text-orange-500" /> Capacidade de foco
              </p>
              <p className={`text-xs font-bold ${doing.length >= 3 ? 'text-red-600' : 'text-emerald-600'}`}>
                {doing.length}/3 slots
              </p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    i < doing.length ? 'bg-orange-400' : 'bg-gray-100'
                  }`}
                />
              ))}
            </div>
            {doing.length >= 3 && (
              <p className="text-[11px] text-red-500 mt-2 flex items-center gap-1">
                <AlertTriangle size={11} /> Para focar em algo novo, pause um dos itens abaixo.
              </p>
            )}
          </div>

          {doing.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <Flame size={32} className="mx-auto text-gray-200" />
              <p className="text-sm font-medium">Nenhum item em foco</p>
              <p className="text-xs">No Backlog, clique em "Focar" no item com maior score.</p>
            </div>
          ) : (
            doing.map((item) => (
              <BrainCard key={item.id} item={item} onMove={handleMove} onDelete={deleteBrainItem} />
            ))
          )}

          {/* Done section (collapsible) */}
          {done.length > 0 && (
            <div className="mt-4">
              <button onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                <CheckCircle2 size={13} className="text-emerald-500" />
                Concluídos ({done.length})
                {showDone ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showDone && (
                <div className="mt-2 space-y-2 opacity-70">
                  {done.map((item) => (
                    <BrainCard key={item.id} item={item} onMove={handleMove} onDelete={deleteBrainItem} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAREFAS ──────────────────────────────────────────────────────── */}
      {tab === 'tasks' && <TaskBoard />}

      {/* Focus limit modal */}
      {focusModal && (
        <FocusLimitModal
          doingItems={doing}
          candidateId={focusModal}
          onSwap={handleSwap}
          onCancel={() => setFocusModal(null)}
        />
      )}
    </div>
  )
}
