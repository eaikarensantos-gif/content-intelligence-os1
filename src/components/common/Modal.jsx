import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  const backdropRef = useRef(null)
  // Track where mousedown started — só fecha se começou E terminou fora do painel
  const mouseDownOutside = useRef(false)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const isOutside = (t) => t === backdropRef.current || (t.closest && !t.closest('[data-modal-panel]'))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => { mouseDownOutside.current = isOutside(e.target) }}
      onClick={(e) => { if (mouseDownOutside.current && isOutside(e.target)) onClose() }}
    >
      {/* Backdrop */}
      <div ref={backdropRef} className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />

      {/* Panel */}
      <div data-modal-panel className={`relative w-full ${maxWidth} bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-black/20 animate-slide-up max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
