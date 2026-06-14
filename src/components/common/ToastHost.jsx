import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import useUIStore from '../../store/useUIStore'

const VARIANTS = {
  success: { Icon: CheckCircle2, ring: 'border-emerald-200', icon: 'text-emerald-500' },
  error: { Icon: AlertCircle, ring: 'border-red-200', icon: 'text-red-500' },
  info: { Icon: Info, ring: 'border-violet-200', icon: 'text-violet-500' },
}

export default function ToastHost() {
  const toasts = useUIStore((s) => s.toasts)
  const dismissToast = useUIStore((s) => s.dismissToast)

  if (!toasts.length) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
      role="region"
      aria-label="Notificações"
    >
      {toasts.map((t) => {
        const { Icon, ring, icon } = VARIANTS[t.type] || VARIANTS.info
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 bg-white border ${ring} rounded-xl shadow-lg shadow-black/10 px-4 py-3 animate-slide-up`}
          >
            <Icon size={18} className={`${icon} shrink-0 mt-0.5`} />
            <p className="flex-1 text-sm text-gray-800 leading-snug">{t.message}</p>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Fechar notificação"
              className="p-0.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
