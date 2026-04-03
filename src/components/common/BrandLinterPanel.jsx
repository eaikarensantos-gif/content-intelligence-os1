import { AlertTriangle, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

const CATEGORY_COLORS = {
  'Estrutura de Massa':     'text-red-600 bg-red-50 border-red-200',
  'Tom Clickbait':          'text-orange-600 bg-orange-50 border-orange-200',
  'Oposição Estilizada':    'text-amber-600 bg-amber-50 border-amber-200',
  'Invasão de Sentimento':  'text-purple-600 bg-purple-50 border-purple-200',
  'Vocabulário Genérico':   'text-rose-600 bg-rose-50 border-rose-200',
  'Vocabulário de Coach':   'text-pink-600 bg-pink-50 border-pink-200',
}

/**
 * Exibe o status do Brand Linter e lista violações encontradas.
 *
 * Props:
 *   violations: { id, category, match, suggestion }[]
 *   compact: bool — modo resumido (sem lista de sugestões expandida por padrão)
 */
export default function BrandLinterPanel({ violations = [], compact = false }) {
  const [expanded, setExpanded] = useState(!compact)
  const clean = violations.length === 0

  if (clean) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
        <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
        <p className="text-[11px] font-medium text-emerald-700">Tom Sênior validado — sem violações de marca detectadas.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/60 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-red-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="text-red-500 shrink-0" />
          <span className="text-[11px] font-semibold text-red-700">
            {violations.length} violaç{violations.length === 1 ? 'ão' : 'ões'} de tom detectada{violations.length === 1 ? '' : 's'}
            <span className="font-normal text-red-500 ml-1">— salvar bloqueado</span>
          </span>
        </div>
        {expanded ? <ChevronUp size={12} className="text-red-400" /> : <ChevronDown size={12} className="text-red-400" />}
      </button>

      {/* Violations list */}
      {expanded && (
        <div className="border-t border-red-200 divide-y divide-red-100">
          {violations.map((v, i) => (
            <div key={`${v.id}-${i}`} className="px-3 py-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[v.category] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                  {v.category}
                </span>
                <code className="text-[11px] text-red-700 font-mono bg-red-100 px-1.5 py-0.5 rounded line-through decoration-red-400">
                  "{v.match}"
                </code>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed pl-0.5">
                <span className="font-medium text-gray-700">Refino: </span>{v.suggestion}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Banner fixo de diretriz de marca — exibir no topo de editores.
 */
export function BrandDirectiveBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-200">
      <ShieldCheck size={12} className="text-violet-500 shrink-0" />
      <p className="text-[11px] text-violet-700">
        <span className="font-semibold">Diretriz de Marca Ativa:</span> Tom Sênior & Observacional — sem estruturas de massa, coaching vazio ou clickbait.
      </p>
    </div>
  )
}
