import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import useUIStore from '../../store/useUIStore'

// Host global do diálogo de confirmação. Renderizado uma vez no App e
// acionado de qualquer lugar via confirmDialog() (Promise<boolean>).
export default function ConfirmHost() {
  const confirmState = useUIStore((s) => s.confirmState)
  const resolveConfirm = useUIStore((s) => s.resolveConfirm)

  useEffect(() => {
    if (!confirmState) return
    const handler = (e) => {
      if (e.key === 'Escape') resolveConfirm(false)
      if (e.key === 'Enter') resolveConfirm(true)
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [confirmState, resolveConfirm])

  if (!confirmState) return null

  const { title, message, confirmLabel, cancelLabel, danger } = confirmState

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) resolveConfirm(false) }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />

      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-black/20 animate-slide-up p-6">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${danger ? 'bg-red-50' : 'bg-violet-50'}`}>
            <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-violet-500'} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="confirm-title" className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => resolveConfirm(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => resolveConfirm(true)}
            autoFocus
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-violet-500 hover:bg-violet-600'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
