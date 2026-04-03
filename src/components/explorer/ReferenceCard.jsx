import { Trash2, Copy, Volume2 } from 'lucide-react'
import clsx from 'clsx'

export default function ReferenceCard({ reference, onRemove, onDragStart, onTranscribe }) {
  const platformColors = {
    tiktok: 'from-gray-900 to-black',
    instagram: 'from-pink-500 to-purple-500',
    youtube: 'from-red-600 to-red-700',
    linkedin: 'from-blue-600 to-blue-700',
    x: 'from-gray-900 to-gray-800',
  }

  const platformBg = {
    tiktok: 'bg-gray-100 border-gray-200',
    instagram: 'bg-pink-50 border-pink-200',
    youtube: 'bg-red-50 border-red-200',
    linkedin: 'bg-blue-50 border-blue-200',
    x: 'bg-gray-50 border-gray-200',
  }

  const archetypeColors = {
    'authority-speech': { bg: 'bg-purple-100', text: 'text-purple-700', label: '👩‍💼 Autoridade' },
    'corporate-absurd': { bg: 'bg-amber-100', text: 'text-amber-700', label: '🤖 Corporativo Absurdo' },
    'metaphorical-humor': { bg: 'bg-orange-100', text: 'text-orange-700', label: '🐕 Humor Metafórico' },
    'tech-edge': { bg: 'bg-cyan-100', text: 'text-cyan-700', label: '⚡ Tech Edge' },
  }

  const archetype = archetypeColors[reference.archetype] || archetypeColors['tech-edge']

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={clsx(
        'group relative rounded-lg border p-3 cursor-move transition-all hover:shadow-md hover:-translate-y-0.5',
        platformBg[reference.platform]
      )}
    >
      {/* Platform badge */}
      <div className={clsx(
        'inline-block px-2 py-1 rounded text-xs font-semibold text-white mb-2',
        `bg-gradient-to-r ${platformColors[reference.platform]}`
      )}>
        {reference.platform.toUpperCase()}
      </div>

      {/* Archetype tag */}
      <div className={clsx('inline-block ml-2 px-2 py-1 rounded text-xs font-medium mb-2', archetype.bg, archetype.text)}>
        {archetype.label}
      </div>

      {/* Thumbnail */}
      {reference.thumbnail && (
        <div className="mb-2 rounded overflow-hidden h-20 bg-gray-200">
          <img
            src={reference.thumbnail}
            alt={reference.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title */}
      <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">
        {reference.title}
      </h4>

      {/* Author */}
      <p className="text-xs text-gray-600 mb-2">
        por <span className="font-medium">@{reference.author}</span>
      </p>

      {/* Engagement */}
      <div className="flex gap-3 text-xs text-gray-600 mb-3">
        <span>❤️ {reference.likes}k</span>
        <span>💬 {reference.comments}k</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTranscribe(reference)
          }}
          title="Transcrever áudio"
          className="p-1.5 rounded bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900"
        >
          <Volume2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(`@${reference.author} - ${reference.title}`)
          }}
          title="Copiar crédito"
          className="p-1.5 rounded bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(reference.id)
          }}
          title="Remover"
          className="p-1.5 rounded bg-white hover:bg-red-100 text-gray-600 hover:text-red-600 ml-auto"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
