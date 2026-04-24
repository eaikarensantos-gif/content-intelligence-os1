import { useState, useRef, useEffect } from 'react'
import {
  Plus, Calendar, Tag, Flag, MoreHorizontal, Trash2, Edit3,
  CheckCircle2, Circle, Clock, ArrowRight, GripVertical,
  LayoutGrid, List, Filter, Search, X, ChevronDown, ChevronRight,
  AlertCircle, Flame, Minus, Star, CheckSquare, Square,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'

/* ── Constantes ──────────────────────────────────────────── */
const COLUMNS = [
  { id: 'todo', label: 'A Fazer', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' },
  { id: 'doing', label: 'Em Progresso', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  { id: 'review', label: 'Em Revisão', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
  { id: 'done', label: 'Concluído', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
]

const PRIORITIES = [
  { id: 'urgent', label: 'Urgente', icon: Flame, color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  { id: 'high', label: 'Alta', icon: Flag, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  { id: 'medium', label: 'Média', icon: Minus, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
  { id: 'low', label: 'Baixa', icon: ChevronDown, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
]

const TAG_COLORS = [
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-sky-100 text-sky-700 border-sky-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
]

const SUGGESTED_TAGS = ['Conteúdo', 'Cliente', 'Urgente', 'Reunião', 'Criação', 'Edição', 'Planejamento', 'Social Media', 'Entrega', 'Pesquisa']

function getTagColor(tag) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((d - today) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  if (diff === -1) return 'Ontem'
  if (diff < -1) return `${Math.abs(diff)}d atrás`
  if (diff <= 7) return `em ${diff}d`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T23:59:59')
  return d < new Date()
}

/* ── Quick Add ──────────────────────────────────────────── */
function QuickAdd({ columnId, onAdd }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const ref = useRef(null)

  useEffect(() => { if (open) ref.current?.focus() }, [open])

  const submit = () => {
    if (!title.trim()) return
    onAdd({ title: title.trim(), status: columnId })
    setTitle('')
    setOpen(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all group">
      <Plus size={14} className="group-hover:text-orange-500" />
      <span>Nova tarefa</span>
    </button>
  )

  return (
    <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-3 space-y-2">
      <input
        ref={ref}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="Nome da tarefa..."
        className="w-full text-sm border-0 outline-none placeholder:text-gray-300"
      />
      <div className="flex gap-2">
        <button onClick={submit} className="px-3 py-1 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">Adicionar</button>
        <button onClick={() => setOpen(false)} className="px-3 py-1 text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
      </div>
    </div>
  )
}

/* ── Task Card ──────────────────────────────────────────── */
function TaskCard({ task, onUpdate, onDelete, onEdit, onMove }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const dragStartPos = useRef(null)
  const priority = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[2]
  const PriorityIcon = priority.icon
  const completedSubs = (task.subtasks || []).filter(s => s.done).length
  const totalSubs = (task.subtasks || []).length

  useEffect(() => {
    const handleClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Distinguish click from drag — only open edit if mouse didn't move much
  const handleMouseDown = (e) => { dragStartPos.current = { x: e.clientX, y: e.clientY } }
  const handleClick = (e) => {
    if (!dragStartPos.current) return
    const dx = Math.abs(e.clientX - dragStartPos.current.x)
    const dy = Math.abs(e.clientY - dragStartPos.current.y)
    if (dx < 5 && dy < 5) onEdit(task)
    dragStartPos.current = null
  }

  return (
    <div
      className={clsx(
        'group bg-white rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer',
        task.status === 'done' ? 'opacity-70 border-gray-100' : 'border-gray-200 hover:border-orange-200'
      )}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="p-3 space-y-2.5">
        {/* Tags */}
        {task.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map(tag => (
              <span key={tag} className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded border', getTagColor(tag))}>{tag}</span>
            ))}
          </div>
        )}

        {/* Title */}
        <p className={clsx('text-sm font-medium leading-snug', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800')}>
          {task.title}
        </p>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-gray-400 line-clamp-2">{task.description}</p>
        )}

        {/* Subtasks progress */}
        {totalSubs > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${(completedSubs / totalSubs) * 100}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 font-medium">{completedSubs}/{totalSubs}</span>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {/* Priority */}
            <span className={clsx('flex items-center gap-0.5 text-[10px] font-medium', priority.color)} title={priority.label}>
              <PriorityIcon size={11} />
            </span>

            {/* Due date */}
            {task.due_date && (
              <span className={clsx('flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded',
                isOverdue(task.due_date) && task.status !== 'done' ? 'bg-red-50 text-red-600' : 'text-gray-400'
              )}>
                <Calendar size={10} />
                {formatDate(task.due_date)}
              </span>
            )}
          </div>

          {/* Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreHorizontal size={14} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-7 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44" onClick={(e) => e.stopPropagation()}>
                {/* Move options */}
                {COLUMNS.filter(c => c.id !== task.status).map(col => {
                  const Icon = col.icon
                  return (
                    <button key={col.id} onClick={() => { onMove(task.id, col.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                      <Icon size={12} className={col.color} /> Mover: {col.label}
                    </button>
                  )
                })}
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => { onDelete(task.id); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Task Detail Modal ──────────────────────────────────── */
function TaskDetail({ task, onClose, onUpdate, onDelete }) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority || 'medium')
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [tags, setTags] = useState(task.tags || [])
  const [subtasks, setSubtasks] = useState(task.subtasks || [])
  const [newTag, setNewTag] = useState('')
  const [newSubtask, setNewSubtask] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const save = () => {
    onUpdate(task.id, { title, description, priority, due_date: dueDate, tags, subtasks })
    onClose()
  }

  const addTag = (t) => {
    const tag = t.trim()
    if (tag && !tags.includes(tag)) setTags([...tags, tag])
    setNewTag('')
    setShowTagSuggestions(false)
  }

  const addSubtask = () => {
    if (!newSubtask.trim()) return
    setSubtasks([...subtasks, { id: Date.now().toString(), text: newSubtask.trim(), done: false }])
    setNewSubtask('')
  }

  const toggleSubtask = (id) => {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s))
  }

  const deleteSubtask = (id) => {
    setSubtasks(subtasks.filter(s => s.id !== id))
  }

  const currentCol = COLUMNS.find(c => c.id === task.status) || COLUMNS[0]
  const StatusIcon = currentCol.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={save} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className={clsx('flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border', currentCol.bg, currentCol.border, currentCol.color)}>
              <StatusIcon size={12} /> {currentCol.label}
            </div>
            <button onClick={save} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-semibold text-gray-900 border-0 outline-none placeholder:text-gray-300"
            placeholder="Nome da tarefa..."
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm text-gray-600 border border-gray-200 rounded-xl p-3 outline-none focus:border-orange-300 resize-none placeholder:text-gray-300"
            placeholder="Adicione uma descrição..."
          />

          {/* Priority + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Prioridade</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRIORITIES.map(p => {
                  const Icon = p.icon
                  return (
                    <button key={p.id} onClick={() => setPriority(p.id)}
                      className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        priority === p.id ? p.bg + ' ring-1 ring-offset-1 ring-' + p.id : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      )}>
                      <Icon size={12} className={priority === p.id ? p.color : ''} /> {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Data Limite</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(tag => (
                <span key={tag} className={clsx('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border', getTagColor(tag))}>
                  {tag}
                  <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:opacity-70"><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onFocus={() => setShowTagSuggestions(true)}
                onKeyDown={(e) => { if (e.key === 'Enter') addTag(newTag) }}
                placeholder="Adicionar tag..."
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-orange-300"
              />
              {showTagSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 max-h-32 overflow-y-auto">
                  {SUGGESTED_TAGS.filter(t => !tags.includes(t) && t.toLowerCase().includes(newTag.toLowerCase())).map(t => (
                    <button key={t} onClick={() => addTag(t)} className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-orange-50 hover:text-orange-700">{t}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Subtarefas {subtasks.length > 0 && <span className="text-gray-400">({subtasks.filter(s => s.done).length}/{subtasks.length})</span>}
            </label>
            <div className="space-y-1 mb-2">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 group">
                  <button onClick={() => toggleSubtask(sub.id)} className="shrink-0">
                    {sub.done ? <CheckSquare size={14} className="text-emerald-500" /> : <Square size={14} className="text-gray-300" />}
                  </button>
                  <span className={clsx('flex-1 text-sm', sub.done ? 'line-through text-gray-400' : 'text-gray-700')}>{sub.text}</span>
                  <button onClick={() => deleteSubtask(sub.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-400"><X size={12} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addSubtask() }}
                placeholder="Nova subtarefa..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-orange-300"
              />
              <button onClick={addSubtask} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Status change */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Mover Para</label>
            <div className="grid grid-cols-4 gap-1.5">
              {COLUMNS.map(col => {
                const Icon = col.icon
                return (
                  <button key={col.id}
                    onClick={() => { onUpdate(task.id, { title, description, priority, due_date: dueDate, tags, subtasks, status: col.id }); onClose() }}
                    className={clsx('flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium border transition-all',
                      task.status === col.id ? col.bg + ' ' + col.border + ' ' + col.color : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                    )}>
                    <Icon size={14} /> {col.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button onClick={save} className="flex-1 py-2 text-sm font-medium bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors">Salvar</button>
            <button onClick={() => { onDelete(task.id); onClose() }} className="px-4 py-2 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Kanban Column ──────────────────────────────────────── */
function KanbanColumn({ column, tasks, onAdd, onUpdate, onDelete, onEdit, onMove, onDrop }) {
  const [dragOver, setDragOver] = useState(false)
  const Icon = column.icon

  return (
    <div
      className={clsx('flex flex-col min-w-[280px] max-w-[320px] flex-1 rounded-2xl border transition-all',
        dragOver ? 'border-orange-300 bg-orange-50/50' : 'border-gray-200 bg-gray-50/50'
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(e, column.id) }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
        <div className={clsx('w-2 h-2 rounded-full', column.dot)} />
        <span className="text-sm font-semibold text-gray-700 flex-1">{column.label}</span>
        <span className="text-xs font-medium text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-100">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto max-h-[calc(100vh-260px)]">
        {tasks.map(task => (
          <div key={task.id} draggable
            onDragStart={(e) => { e.dataTransfer.setData('taskId', task.id); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.style.opacity = '0.4' }}
            onDragEnd={(e) => { e.currentTarget.style.opacity = '1' }}
            className="relative group/drag"
          >
            <div className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center opacity-0 group-hover/drag:opacity-100 cursor-grab active:cursor-grabbing z-10">
              <GripVertical size={12} className="text-gray-300" />
            </div>
            <TaskCard task={task} onUpdate={onUpdate} onDelete={onDelete} onEdit={onEdit} onMove={onMove} />
          </div>
        ))}
        <QuickAdd columnId={column.id} onAdd={onAdd} />
      </div>
    </div>
  )
}

/* ── List Row ───────────────────────────────────────────── */
function ListRow({ task, onUpdate, onDelete, onEdit, onMove }) {
  const priority = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[2]
  const PriorityIcon = priority.icon
  const col = COLUMNS.find(c => c.id === task.status) || COLUMNS[0]
  const completedSubs = (task.subtasks || []).filter(s => s.done).length
  const totalSubs = (task.subtasks || []).length

  const toggleDone = (e) => {
    e.stopPropagation()
    onUpdate(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
  }

  return (
    <div onClick={() => onEdit(task)}
      className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-orange-200 hover:shadow-sm transition-all cursor-pointer group"
    >
      <button onClick={toggleDone} className="shrink-0">
        {task.status === 'done'
          ? <CheckCircle2 size={18} className="text-emerald-500" />
          : <Circle size={18} className="text-gray-300 hover:text-orange-400" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={clsx('text-sm font-medium truncate', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800')}>
            {task.title}
          </span>
          {task.tags?.slice(0, 2).map(tag => (
            <span key={tag} className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded border hidden sm:inline', getTagColor(tag))}>{tag}</span>
          ))}
        </div>
        {task.description && <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>}
      </div>

      {totalSubs > 0 && (
        <span className="text-[10px] text-gray-400 font-medium hidden sm:flex items-center gap-1">
          <CheckSquare size={10} /> {completedSubs}/{totalSubs}
        </span>
      )}

      <span className={clsx('flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border', col.bg, col.border, col.color)}>
        <div className={clsx('w-1.5 h-1.5 rounded-full', col.dot)} /> {col.label}
      </span>

      <PriorityIcon size={14} className={priority.color} title={priority.label} />

      {task.due_date && (
        <span className={clsx('text-[10px] font-medium hidden sm:block',
          isOverdue(task.due_date) && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'
        )}>
          {formatDate(task.due_date)}
        </span>
      )}
    </div>
  )
}

/* ── Main TaskBoard ─────────────────────────────────────── */
export default function TaskBoard() {
  const tasks = useStore((s) => s.tasks)
  const addTask = useStore((s) => s.addTask)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)

  const [view, setView] = useState('kanban') // kanban | list
  const [editingTask, setEditingTask] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('priority') // priority | created | due

  // Filter tasks
  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.description || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    return true
  })

  // Sort
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1
    if (a.status !== 'done' && b.status === 'done') return -1
    if (sortBy === 'created') return (b.created_at || '').localeCompare(a.created_at || '')
    if (sortBy === 'due') {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    }
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
  })

  const handleAdd = (data) => addTask(data)
  const handleMove = (id, status) => updateTask(id, { status })
  const handleDrop = (e, status) => {
    const id = e.dataTransfer.getData('taskId')
    if (id) updateTask(id, { status })
  }

  // Stats
  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const overdueTasks = tasks.filter(t => isOverdue(t.due_date) && t.status !== 'done').length
  const todayTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    const d = new Date(t.due_date + 'T00:00:00')
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }).length

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><List size={16} className="text-blue-500" /></div>
          <div><div className="text-lg font-bold text-gray-900">{totalTasks}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Total</div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-500" /></div>
          <div><div className="text-lg font-bold text-gray-900">{doneTasks}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Concluídas</div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><Calendar size={16} className="text-amber-500" /></div>
          <div><div className="text-lg font-bold text-gray-900">{todayTasks}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Para Hoje</div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><AlertCircle size={16} className="text-red-500" /></div>
          <div><div className="text-lg font-bold text-gray-900">{overdueTasks}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Atrasadas</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefas..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-300"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button onClick={() => setShowFilters(!showFilters)}
            className={clsx('flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all',
              showFilters ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            )}>
            <Filter size={12} /> Filtros
          </button>

          {/* View toggle */}
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setView('kanban')}
              className={clsx('p-2 transition-colors', view === 'kanban' ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:text-gray-600')}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setView('list')}
              className={clsx('p-2 transition-colors', view === 'list' ? 'bg-orange-50 text-orange-600' : 'text-gray-400 hover:text-gray-600')}>
              <List size={14} />
            </button>
          </div>

          {/* Add task */}
          <button onClick={() => addTask({ title: 'Nova tarefa', status: 'todo' })}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-sm">
            <Plus size={14} /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Prioridade:</span>
            {[{ id: 'all', label: 'Todas' }, ...PRIORITIES].map(p => (
              <button key={p.id} onClick={() => setFilterPriority(p.id)}
                className={clsx('px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all',
                  filterPriority === p.id ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                )}>{p.label}</button>
            ))}
          </div>
          <div className="w-px bg-gray-200 mx-1" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Ordenar:</span>
            {[{ id: 'priority', label: 'Prioridade' }, { id: 'created', label: 'Criação' }, { id: 'due', label: 'Prazo' }].map(s => (
              <button key={s.id} onClick={() => setSortBy(s.id)}
                className={clsx('px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all',
                  sortBy === s.id ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                )}>{s.label}</button>
            ))}
          </div>
          <div className="w-px bg-gray-200 mx-1" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Status:</span>
            {[{ id: 'all', label: 'Todos' }, ...COLUMNS].map(c => (
              <button key={c.id} onClick={() => setFilterStatus(c.id)}
                className={clsx('px-2.5 py-1 text-[10px] font-medium rounded-lg border transition-all',
                  filterStatus === c.id ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                )}>{c.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={sorted.filter(t => t.status === col.id)}
              onAdd={handleAdd}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onEdit={setEditingTask}
              onMove={handleMove}
              onDrop={handleDrop}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">Nenhuma tarefa encontrada</p>
              <p className="text-xs text-gray-400 mt-1">Clique em "Nova Tarefa" para começar</p>
            </div>
          )}
          {sorted.map(task => (
            <ListRow key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} onEdit={setEditingTask} onMove={handleMove} />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingTask && (
        <TaskDetail
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdate={(id, updates) => { updateTask(id, updates); setEditingTask(null) }}
          onDelete={(id) => { deleteTask(id); setEditingTask(null) }}
        />
      )}
    </div>
  )
}
