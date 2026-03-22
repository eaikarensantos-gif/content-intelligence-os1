import { Heart, X, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import useStore from '../../store/useStore'

const TYPE_STYLES = {
  thought:      { label: 'Pensamento',    bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  idea:         { label: 'Ideia',         bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  text:         { label: 'Texto',         bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  presentation: { label: 'Apresentacao', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
}

export default function FavoritesPanel({ onClose }) {
  const { favorites, removeFavorite } = useStore()
  const [copiedId, setCopiedId] = useState(null)

  const handleCopy = (fav) => {
    navigator.clipboard.writeText(fav.content || '')
    setCopiedId(fav.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 sm:w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-sm">
              <Heart size={14} className="text-white fill-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Favoritos</p>
              <p className="text-[10px] text-gray-400">{favorites.length} {favorites.length === 1 ? 'item salvo' : 'itens salvos'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <Heart size={32} className="text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">Nenhum favorito ainda</p>
              <p className="text-xs text-gray-400">
                Use o icone de coracao nos modulos de criacao para salvar conteudos aqui.
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {[...favorites].reverse().map((fav) => {
                const style = TYPE_STYLES[fav.type] || TYPE_STYLES.thought
                return (
                  <div
                    key={fav.id}
                    className="rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all p-3.5 space-y-2 shadow-sm"
                  >
                    {/* Type badge + date */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${style.bg} ${style.text} ${style.border}`}>
                        {style.label}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(fav.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">
                      {fav.title}
                    </p>

                    {/* Content preview */}
                    {fav.content && (
                      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">
                        {fav.content.slice(0, 100)}{fav.content.length > 100 ? '...' : ''}
                      </p>
                    )}

                    {/* Source */}
                    {fav.source && (
                      <p className="text-[10px] text-gray-400 italic">{fav.source}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleCopy(fav)}
                        className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        {copiedId === fav.id ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
                      </button>
                      <button
                        onClick={() => removeFavorite(fav.id)}
                        className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-auto"
                      >
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
    </>
  )
}
