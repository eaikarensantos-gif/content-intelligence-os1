import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Heart, X, Copy, Check, ChevronDown, ChevronUp, ExternalLink, BookOpen, Lightbulb, Search, FileText, Bookmark } from 'lucide-react'
import useStore from '../../store/useStore'

const TYPE_STYLES = {
  thought:      { label: 'Pensamento',   bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-200',  icon: BookOpen },
  idea:         { label: 'Ideia',        bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-200',  icon: Lightbulb },
  text:         { label: 'Texto',        bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: FileText },
  presentation: { label: 'Apresentação', bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-200',    icon: FileText },
  script:       { label: 'Roteiro',      bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200',    icon: FileText },
  insight:      { label: 'Insight',      bg: 'bg-teal-100',    text: 'text-teal-700',    border: 'border-teal-200',    icon: Lightbulb },
  search:       { label: 'Busca',        bg: 'bg-purple-100',  text: 'text-purple-700',  border: 'border-purple-200',  icon: Search },
}

const FILTERS = [
  { id: 'all',          label: 'Todos' },
  { id: 'idea',         label: 'Ideias' },
  { id: 'insight',      label: 'Insights' },
  { id: 'script',       label: 'Roteiros' },
  { id: 'search',       label: 'Buscas' },
  { id: 'thought',      label: 'Pensamentos' },
  { id: 'text',         label: 'Textos' },
]

export default function FavoritesDrawer() {
  const favoritesOpen  = useStore((s) => s.favoritesOpen)
  const closeFavorites = useStore((s) => s.closeFavorites)
  const favorites      = useStore((s) => s.favorites)
  const removeFavorite = useStore((s) => s.removeFavorite)
  const [copiedId, setCopiedId]   = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [visible, setVisible]     = useState(false)
  const [filter, setFilter]       = useState('all')

  useEffect(() => {
    if (favoritesOpen) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [favoritesOpen])

  const handleClose = () => {
    setVisible(false)
    setTimeout(closeFavorites, 250)
  }

  const handleCopy = (fav) => {
    navigator.clipboard.writeText(fav.content || fav.url || '')
    setCopiedId(fav.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const sorted = [...favorites].reverse()
  const filtered = filter === 'all' ? sorted : sorted.filter((f) => f.type === filter)

  // Count per type (only types that exist)
  const counts = {}
  favorites.forEach((f) => { counts[f.type] = (counts[f.type] || 0) + 1 })

  if (!favoritesOpen) return null

  return createPortal(
    <>
      <div onClick={handleClose}
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 250ms ease' }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />

      <div
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 250ms ease' }}
        className="fixed right-0 top-0 bottom-0 w-80 sm:w-96 bg-white shadow-2xl flex flex-col z-50"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-sm">
              <Heart size={14} className="text-white fill-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Favoritos</p>
              <p className="text-[10px] text-gray-400">
                {favorites.length} {favorites.length === 1 ? 'item salvo' : 'itens salvos'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Filter tabs */}
        {favorites.length > 0 && (
          <div className="px-3 py-2 border-b border-gray-100 flex gap-1 overflow-x-auto scrollbar-none shrink-0">
            {FILTERS.filter(f => f.id === 'all' || counts[f.id]).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                  filter === f.id
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {f.label}{f.id !== 'all' && counts[f.id] ? ` · ${counts[f.id]}` : ''}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <Heart size={32} className="text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">Nenhum favorito ainda</p>
              <p className="text-xs text-gray-400">
                Use o ícone ♥ ou 🔖 em qualquer módulo para salvar conteúdos aqui.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-6">
              <p className="text-xs text-gray-400">Nenhum favorito nessa categoria.</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {filtered.map((fav) => {
                const style = TYPE_STYLES[fav.type] || TYPE_STYLES.thought
                const isExpanded = expandedId === fav.id
                const isSearch = fav.type === 'search'

                return (
                  <div
                    key={fav.id}
                    onClick={() => setExpandedId(isExpanded ? null : fav.id)}
                    className="rounded-xl border border-gray-100 bg-white hover:border-orange-200 hover:shadow-md transition-all p-3.5 space-y-2 shadow-sm cursor-pointer"
                  >
                    {/* Top row: type badge + date + chevron */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${style.bg} ${style.text} ${style.border}`}>
                        {style.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">
                          {new Date(fav.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                        {isExpanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
                      </div>
                    </div>

                    {/* Title */}
                    <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">{fav.title}</p>

                    {/* Search type: show platform + search term */}
                    {isSearch && fav.search_term && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 font-mono">
                        🔍 {fav.search_term}
                      </span>
                    )}

                    {/* Preview (collapsed) */}
                    {!isSearch && fav.content && !isExpanded && (
                      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                        {fav.content.slice(0, 120)}{fav.content.length > 120 ? '...' : ''}
                      </p>
                    )}

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="space-y-2">
                        {fav.content && (
                          <p className={`text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap rounded-lg p-3 border border-gray-100 max-h-64 overflow-y-auto ${fav.type === 'script' ? 'font-mono text-[10px] bg-gray-50' : 'bg-gray-50'}`}>
                            {fav.content}
                          </p>
                        )}
                        {isSearch && fav.why_relevant && (
                          <p className="text-[11px] text-purple-600 bg-purple-50 rounded-lg p-2 border border-purple-100 leading-relaxed">
                            💡 {fav.why_relevant}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Source */}
                    {fav.source && (
                      <p className="text-[10px] text-gray-400 italic">{fav.source}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                      {isSearch && fav.url ? (
                        <a href={fav.url} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg text-purple-500 hover:text-purple-700 hover:bg-purple-50 transition-colors font-medium">
                          <ExternalLink size={11} /> Abrir busca
                        </a>
                      ) : (
                        <button onClick={() => handleCopy(fav)}
                          className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                          {copiedId === fav.id
                            ? <><Check size={11} className="text-emerald-500" /> Copiado</>
                            : <><Copy size={11} /> Copiar</>}
                        </button>
                      )}
                      <button onClick={() => removeFavorite(fav.id)}
                        className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-auto">
                        <Heart size={11} className="fill-current" /> Remover
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
