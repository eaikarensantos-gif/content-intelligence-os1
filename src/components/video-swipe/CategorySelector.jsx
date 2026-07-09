import clsx from 'clsx'
import { Check, Users } from 'lucide-react'
import {
  VIDEO_CATEGORIES,
  IDENTITY_CATEGORIES,
  TOPIC_CATEGORIES,
} from '../../lib/videoCategories'

export default function CategorySelector({ selected, onToggle }) {
  const hasIdentity = selected.some((c) => VIDEO_CATEGORIES[c]?.type === 'identity')
  const hasTopic    = selected.some((c) => VIDEO_CATEGORIES[c]?.type === 'topic')

  const renderChip = (name) => {
    const def      = VIDEO_CATEGORIES[name]
    const active   = selected.includes(name)
    const isId     = def?.type === 'identity'
    return (
      <button
        key={name}
        type="button"
        onClick={() => onToggle(name)}
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
          active && isId  ? 'border-violet-500 bg-violet-500 text-white' :
          active          ? 'border-orange-500 bg-orange-500 text-white' :
          isId            ? 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-violet-100' :
                            'border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600'
        )}
      >
        {active ? <Check size={14} /> : isId ? <Users size={13} /> : null}
        {name}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Identity categories */}
      <div>
        <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-1.5">Perfil / Identidade</p>
        <div className="flex flex-wrap gap-2">
          {IDENTITY_CATEGORIES.map(renderChip)}
        </div>
      </div>

      {/* Topic categories */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Temas</p>
        <div className="flex flex-wrap gap-2">
          {TOPIC_CATEGORIES.map(renderChip)}
        </div>
      </div>

      {/* Intersection hint */}
      {hasIdentity && hasTopic && (
        <p className="text-[10px] text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-2.5 py-1.5">
          ✦ Busca interseccional ativa —{' '}
          {selected.filter((c) => VIDEO_CATEGORIES[c]?.type === 'identity').join(' + ')}
          {' '}falando sobre{' '}
          {selected.filter((c) => VIDEO_CATEGORIES[c]?.type === 'topic').join(' + ')}
        </p>
      )}
    </div>
  )
}
