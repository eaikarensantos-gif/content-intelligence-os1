// src/components/ideas/DailyAgentBanner.jsx
import { Loader2, Sparkles, RefreshCw, AlertCircle, Check } from 'lucide-react'
import useDailyAgent from '../../hooks/useDailyAgent'

export default function DailyAgentBanner() {
  const { status, running, error, newCount, runNow } = useDailyAgent()

  const ranAt = status?.ranAt
    ? new Date(status.ranAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  if (running) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-orange-200 bg-orange-50">
        <Loader2 size={14} className="text-orange-500 animate-spin shrink-0" />
        <p className="text-xs text-orange-700">
          Agente diário gerando ideias para hoje...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
        <AlertCircle size={14} className="text-red-500 shrink-0" />
        <p className="text-xs text-red-600 flex-1">{error}</p>
        <button
          onClick={runNow}
          className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 shrink-0"
        >
          <RefreshCw size={11} /> Tentar novamente
        </button>
      </div>
    )
  }

  if (status) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
        <Check size={14} className="text-emerald-500 shrink-0" />
        <p className="text-xs text-emerald-700 flex-1">
          Agente rodou hoje às {ranAt} · {status.count} ideias adicionadas
          {status.pilares && (
            <span className="text-emerald-500 ml-1">({status.pilares})</span>
          )}
        </p>
        <button
          onClick={runNow}
          className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1 shrink-0"
        >
          <RefreshCw size={11} /> Rodar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
      <Sparkles size={14} className="text-gray-400 shrink-0" />
      <p className="text-xs text-gray-500 flex-1">
        Agente diário não rodou ainda hoje.
        {!localStorage.getItem('cio-openai-key') && (
          <span className="text-amber-600 ml-1">Configure a API key em Configurações para ativar.</span>
        )}
      </p>
      {localStorage.getItem('cio-openai-key') && (
        <button
          onClick={runNow}
          className="text-xs text-orange-600 hover:text-orange-800 font-medium flex items-center gap-1 shrink-0 border border-orange-200 bg-white px-2 py-1 rounded-lg"
        >
          <Sparkles size={11} /> Rodar agora
        </button>
      )}
    </div>
  )
}
