import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Lightbulb, Brain, Video, ClipboardList, ArrowRight, CornerDownLeft,
  BarChart2, PenTool, Clapperboard, Radar, Dna, Newspaper, FileBarChart,
  DollarSign, Flame, Settings, Shield, Users, Bookmark, FileText, PieChart,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'

// Páginas navegáveis — inclui páginas que só existem por URL (audiência,
// web clipper, pdf studio), que a busca agora torna acessíveis.
const PAGES = [
  { to: '/social', label: 'Analytics', icon: BarChart2 },
  { to: '/audience', label: 'Audiência', icon: PieChart },
  { to: '/create', label: 'Studio de Criação', icon: PenTool },
  { to: '/naomi', label: 'Naomi Studio', icon: Clapperboard },
  { to: '/ideas', label: 'Hub de Ideias', icon: Lightbulb },
  { to: '/tasks', label: 'Tarefas', icon: ClipboardList },
  { to: '/brain', label: 'Content Brain', icon: Brain },
  { to: '/reports', label: 'Relatórios', icon: FileBarChart },
  { to: '/news', label: 'Notícias', icon: Newspaper },
  { to: '/dna', label: 'Content DNA', icon: Dna },
  { to: '/trends', label: 'Creator Insights', icon: Radar },
  { to: '/video', label: 'Analisador de Vídeo', icon: Video },
  { to: '/swipe', label: 'Video Swipe', icon: Flame },
  { to: '/ads', label: 'Publicidade', icon: DollarSign },
  { to: '/community', label: 'Community Studio', icon: Users },
  { to: '/clipper', label: 'Web Clipper', icon: Bookmark },
  { to: '/pdf-studio', label: 'PDF Studio', icon: FileText },
  { to: '/settings', label: 'Configurações', icon: Settings },
  { to: '/security', label: 'Registro de Acessos', icon: Shield },
]

const GROUP_LABELS = {
  page: 'Páginas',
  idea: 'Ideias',
  thought: 'Pensamentos',
  video: 'Vídeos analisados',
  task: 'Tarefas',
  clip: 'Web Clips',
  brain: 'Content Brain',
}

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  const ideas = useStore((s) => s.ideas)
  const thoughtCaptures = useStore((s) => s.thoughtCaptures)
  const videoAnalyses = useStore((s) => s.videoAnalyses)
  const tasks = useStore((s) => s.tasks)
  const clips = useStore((s) => s.clips)
  const brainItems = useStore((s) => s.brainItems)

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = useMemo(() => {
    const q = normalize(query.trim())
    const items = []

    PAGES
      .filter((p) => !q || normalize(p.label).includes(q))
      .forEach((p) => items.push({ type: 'page', label: p.label, icon: p.icon, to: p.to }))

    if (q) {
      ideas
        .filter((i) => normalize(i.title).includes(q) || normalize(i.description).includes(q))
        .slice(0, 6)
        .forEach((i) => items.push({ type: 'idea', label: i.title, icon: Lightbulb, to: '/ideas' }))

      thoughtCaptures
        .filter((t) => normalize(t.original_thought).includes(q))
        .slice(0, 4)
        .forEach((t) => items.push({ type: 'thought', label: (t.original_thought || '').slice(0, 80), icon: Brain, to: '/thoughts' }))

      videoAnalyses
        .filter((v) => normalize(v.title || v.url).includes(q))
        .slice(0, 4)
        .forEach((v) => items.push({ type: 'video', label: v.title || v.url, icon: Video, to: '/video' }))

      tasks
        .filter((t) => normalize(t.title).includes(q))
        .slice(0, 4)
        .forEach((t) => items.push({ type: 'task', label: t.title, icon: ClipboardList, to: '/tasks' }))

      clips
        .filter((c) => normalize(c.title || c.url).includes(q) || normalize(c.summary).includes(q))
        .slice(0, 4)
        .forEach((c) => items.push({ type: 'clip', label: c.title || c.url || 'Clip', icon: Bookmark, to: '/clipper' }))

      brainItems
        .filter((b) => normalize(b.title).includes(q) || normalize(b.notes).includes(q))
        .slice(0, 4)
        .forEach((b) => items.push({ type: 'brain', label: b.title || 'Item', icon: Brain, to: '/brain' }))
    }

    return items.slice(0, 24)
  }, [query, ideas, thoughtCaptures, videoAnalyses, tasks, clips, brainItems])

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(results.length - 1, 0)))
  }, [results.length])

  const select = (item) => {
    if (!item) return
    onClose()
    navigate(item.to)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      select(results[cursor])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  let lastType = null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar páginas, ideias, pensamentos, vídeos, tarefas, clips..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:block text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-1.5">
          {results.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">Nada encontrado para "{query}"</p>
          )}
          {results.map((item, i) => {
            const Icon = item.icon
            const showHeader = item.type !== lastType
            lastType = item.type
            return (
              <div key={`${item.type}-${i}`}>
                {showHeader && (
                  <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {GROUP_LABELS[item.type]}
                  </p>
                )}
                <button
                  onClick={() => select(item)}
                  onMouseEnter={() => setCursor(i)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                    i === cursor ? 'bg-orange-50 text-orange-800' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Icon size={14} className={i === cursor ? 'text-orange-500' : 'text-gray-400'} />
                  <span className="flex-1 text-sm truncate">{item.label}</span>
                  {i === cursor
                    ? <CornerDownLeft size={12} className="text-orange-400" />
                    : <ArrowRight size={12} className="text-gray-200" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
