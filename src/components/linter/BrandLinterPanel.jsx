import { AlertCircle, CheckCircle, AlertTriangle, Zap } from 'lucide-react'
import clsx from 'clsx'
import { lintText } from '../../utils/brandLinter'

export default function BrandLinterPanel({ text, onClose }) {
  const violations = lintText(text)

  if (violations.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
        <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-green-900">Tom aprovado ✓</p>
          <p className="text-xs text-green-700 mt-0.5">Sem padrões genéricos detectados. Conteúdo segue o DNA da Karen.</p>
        </div>
      </div>
    )
  }

  const highSeverity = violations.filter(v => {
    const highPriority = [
      'not-x-but-y',
      'ninguem-te-conta',
      'a-verdade-e',
      'voce-sente',
      'missao-vida',
      'jornada-do',
    ]
    return highPriority.includes(v.id)
  })

  const mediumSeverity = violations.filter(v => {
    const mediumPriority = [
      'segredo-de',
      'proximo-nivel',
      'guia-definitivo',
      'vai-mudar-tudo',
      'voce-precisa',
      'voce-merece',
    ]
    return mediumPriority.includes(v.id)
  })

  const lowSeverity = violations.filter(v => !highSeverity.includes(v) && !mediumSeverity.includes(v))

  return (
    <div className="space-y-3">
      {/* Header with summary */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <p className="font-semibold text-red-900">
                {violations.length} padrão{violations.length !== 1 ? 's' : ''} genérico{violations.length !== 1 ? 's' : ''} detectado{violations.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                Reescreva antes de gerar o conteúdo. {highSeverity.length > 0 && `${highSeverity.length} crítico${highSeverity.length !== 1 ? 's' : ''}.`}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-600 flex-shrink-0"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* High severity violations */}
      {highSeverity.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-red-700 uppercase">Crítico — Reformule</p>
          {highSeverity.map((v, idx) => (
            <ViolationItem key={idx} violation={v} severity="high" />
          ))}
        </div>
      )}

      {/* Medium severity violations */}
      {mediumSeverity.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-amber-700 uppercase">Atenção — Considere reescrever</p>
          {mediumSeverity.map((v, idx) => (
            <ViolationItem key={idx} violation={v} severity="medium" />
          ))}
        </div>
      )}

      {/* Low severity violations */}
      {lowSeverity.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-blue-700 uppercase">Info — Melhoria opcional</p>
          {lowSeverity.map((v, idx) => (
            <ViolationItem key={idx} violation={v} severity="low" />
          ))}
        </div>
      )}
    </div>
  )
}

function ViolationItem({ violation, severity }) {
  const bgColor = {
    high: 'bg-red-50 border-red-200',
    medium: 'bg-amber-50 border-amber-200',
    low: 'bg-blue-50 border-blue-200',
  }[severity]

  const textColor = {
    high: 'text-red-900',
    medium: 'text-amber-900',
    low: 'text-blue-900',
  }[severity]

  const iconColor = {
    high: 'text-red-600',
    medium: 'text-amber-600',
    low: 'text-blue-600',
  }[severity]

  const Icon = severity === 'high' ? AlertCircle : severity === 'medium' ? AlertTriangle : Zap

  return (
    <div className={clsx('border rounded p-2.5', bgColor)}>
      <div className="flex gap-2">
        <Icon size={14} className={clsx('flex-shrink-0 mt-0.5', iconColor)} />
        <div className="flex-1 min-w-0">
          <p className={clsx('text-xs font-semibold', textColor)}>{violation.category}</p>
          <p className="text-xs text-gray-700 mt-1 break-words">
            Detectado: <code className="bg-black/5 px-1.5 py-0.5 rounded font-mono text-xs">"{violation.match}"</code>
          </p>
          <p className={clsx('text-xs mt-1.5 leading-relaxed', textColor)}>{violation.suggestion}</p>
        </div>
      </div>
    </div>
  )
}
