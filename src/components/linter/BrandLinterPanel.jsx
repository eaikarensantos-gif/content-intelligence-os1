import { AlertCircle, CheckCircle, AlertTriangle, Zap, Sparkles, RefreshCw, X, Check, Copy } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { lintText } from '../../utils/brandLinter'

const LS_KEY = 'cio-anthropic-key'

const HIGH_PRIORITY = ['not-x-but-y', 'ninguem-te-conta', 'a-verdade-e', 'voce-sente', 'missao-vida', 'jornada-do']
const MEDIUM_PRIORITY = ['segredo-de', 'proximo-nivel', 'guia-definitivo', 'vai-mudar-tudo', 'voce-precisa', 'voce-merece']

async function fetchAlternatives(match, category, suggestion) {
  const apiKey = localStorage.getItem(LS_KEY)
  if (!apiKey) return null
  const prompt = `Você é um consultor de tom de voz para Karen Santos, estrategista de conteúdo com posicionamento Premium/Analítico. Slogan: "Maturidade profissional na era da IA".

TOM: Direto, técnico, observacional, sem floreios. Fala como especialista — não como coach ou creator de massa.

A expressão abaixo foi sinalizada como padrão genérico de IA ("${category}"):
EXPRESSÃO ORIGINAL: "${match}"
Problema: ${suggestion}

Gere 3 alternativas concretas para substituir APENAS essa expressão no texto, mantendo o sentido original mas no tom correto. As alternativas devem soar como uma pessoa real falando — não como IA, não como coach.

Responda APENAS com JSON:
["alternativa 1", "alternativa 2", "alternativa 3"]`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error('API error')
  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) throw new Error('No JSON')
  return JSON.parse(m[0])
}

function ViolationItem({ violation, severity, onFix }) {
  const [alts, setAlts] = useState(null)
  const [loadingAlts, setLoadingAlts] = useState(false)
  const [copied, setCopied] = useState(null)

  const bgColor = { high: 'bg-red-50 border-red-200', medium: 'bg-amber-50 border-amber-200', low: 'bg-blue-50 border-blue-200' }[severity]
  const textColor = { high: 'text-red-900', medium: 'text-amber-900', low: 'text-blue-900' }[severity]
  const iconColor = { high: 'text-red-600', medium: 'text-amber-600', low: 'text-blue-600' }[severity]
  const Icon = severity === 'high' ? AlertCircle : severity === 'medium' ? AlertTriangle : Zap

  const handleSuggest = async () => {
    setLoadingAlts(true)
    try {
      const result = await fetchAlternatives(violation.match, violation.category, violation.suggestion)
      setAlts(result || [])
    } catch {
      setAlts([])
    } finally {
      setLoadingAlts(false)
    }
  }

  const handleReplace = (alt) => {
    onFix?.(violation.match, alt)
    setAlts(null)
  }

  const handleRemove = () => {
    onFix?.(violation.match, '')
  }

  return (
    <div className={clsx('border rounded-lg p-3 space-y-2', bgColor)}>
      <div className="flex gap-2">
        <Icon size={14} className={clsx('flex-shrink-0 mt-0.5', iconColor)} />
        <div className="flex-1 min-w-0 space-y-1">
          <p className={clsx('text-xs font-semibold', textColor)}>{violation.category}</p>
          <p className="text-xs text-gray-700">
            <code className="bg-black/5 px-1.5 py-0.5 rounded font-mono text-xs line-through decoration-red-400">"{violation.match}"</code>
          </p>
          <p className={clsx('text-xs leading-relaxed', textColor)}>{violation.suggestion}</p>
        </div>
      </div>

      {/* Action buttons */}
      {onFix && (
        <div className="flex items-center gap-2 flex-wrap pl-5">
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 transition-colors"
          >
            <X size={10} /> Remover
          </button>

          {!alts && (
            <button
              type="button"
              onClick={handleSuggest}
              disabled={loadingAlts}
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 transition-colors disabled:opacity-50"
            >
              {loadingAlts
                ? <><RefreshCw size={10} className="animate-spin" /> Gerando...</>
                : <><Sparkles size={10} /> Substituir com IA</>
              }
            </button>
          )}

          {alts !== null && alts.length === 0 && (
            <span className="text-[10px] text-red-400">Erro — verifique API key</span>
          )}
        </div>
      )}

      {/* Alternatives */}
      {alts && alts.length > 0 && (
        <div className="pl-5 space-y-1.5">
          <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Escolha uma substituição:</p>
          {alts.map((alt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleReplace(alt)}
                className="flex-1 text-left text-[11px] text-gray-800 bg-white border border-violet-200 hover:border-violet-400 hover:bg-violet-50 rounded px-2 py-1.5 leading-relaxed font-medium transition-colors"
              >
                {alt}
              </button>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(alt); setCopied(i); setTimeout(() => setCopied(null), 1500) }}
                className="shrink-0 text-gray-300 hover:text-violet-500 transition-colors"
              >
                {copied === i ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAlts(null)}
            className="text-[10px] text-gray-400 hover:text-gray-600"
          >
            Gerar novas alternativas
          </button>
        </div>
      )}
    </div>
  )
}

export default function BrandLinterPanel({ text, onClose, onFix }) {
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

  const highSeverity = violations.filter(v => HIGH_PRIORITY.includes(v.id))
  const mediumSeverity = violations.filter(v => MEDIUM_PRIORITY.includes(v.id))
  const lowSeverity = violations.filter(v => !HIGH_PRIORITY.includes(v.id) && !MEDIUM_PRIORITY.includes(v.id))

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <p className="font-semibold text-red-900">
                {violations.length} padrão{violations.length !== 1 ? 's' : ''} genérico{violations.length !== 1 ? 's' : ''} detectado{violations.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                {onFix ? 'Clique em "Remover" ou "Substituir com IA" para corrigir direto no texto.' : 'Reescreva antes de gerar o conteúdo.'}{' '}
                {highSeverity.length > 0 && `${highSeverity.length} crítico${highSeverity.length !== 1 ? 's' : ''}.`}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-red-400 hover:text-red-600 flex-shrink-0">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {highSeverity.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-red-700 uppercase">Crítico — Reformule</p>
          {highSeverity.map((v, i) => <ViolationItem key={i} violation={v} severity="high" onFix={onFix} />)}
        </div>
      )}

      {mediumSeverity.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-amber-700 uppercase">Atenção — Considere reescrever</p>
          {mediumSeverity.map((v, i) => <ViolationItem key={i} violation={v} severity="medium" onFix={onFix} />)}
        </div>
      )}

      {lowSeverity.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-blue-700 uppercase">Info — Melhoria opcional</p>
          {lowSeverity.map((v, i) => <ViolationItem key={i} violation={v} severity="low" onFix={onFix} />)}
        </div>
      )}
    </div>
  )
}
