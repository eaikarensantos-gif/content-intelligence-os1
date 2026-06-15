import clsx from 'clsx'
import { Check } from 'lucide-react'
import { CATEGORY_NAMES } from '../../lib/videoCategories'

// Multi-select chips for the pre-defined swipe categories.
export default function CategorySelector({ selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_NAMES.map((name) => {
        const active = selected.includes(name)
        return (
          <button
            key={name}
            type="button"
            onClick={() => onToggle(name)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
              active
                ? 'border-orange-500 bg-orange-500 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600'
            )}
          >
            {active && <Check size={14} />}
            {name}
          </button>
        )
      })}
    </div>
  )
}
