import { AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Sparkles, RefreshCw, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const LS_KEY = 'cio-anthropic-key'

const CATEGORY_COLORS = {
  'Estrutura de Massa':     'text-red-600 bg-red-50 border-red-200',
  'Tom Clickbait':          'text-orange-600 bg-orange-50 border-orange-200',
  'Oposição Estilizada':    'text-amber-600 bg-amber-50 border-amber-200',
  'Invasão de Sentimento':  'text-purple-600 bg-purple-50 border-purple-200',
  'Vocabulário Genérico':   'text-rose-600 bg-rose-50 border-rose-200',
  'Vocabulário de Coach':   'text-pink-600 bg-pink-50 border-pink-200',
}

async function fetchAlternatives(match, category, suggestion) {
  const apiKey = localStorage.getItem(LS_KEY)
  if (!apiKey) return null

  const prompt = `Você é um consultor de tom de voz para Karen Santos, estrategista de conteúdo com posicionamento Premium/Analítico. Slogan: "Maturidade profissional na era da IA".

TOM: Direto, técnico, observacional, sem floreios. Fala como especialista — não como coach ou creator de massa.

A frase abaixo foi sinalizada como violação de tom ("${category}"):
FRASE ORIGINAL: "${match}"

Problema: ${suggestion}

Gere 3 alternativas concretas para reescrever APENAS a parte sinalizada, mantendo o sentido original mas no tom correto da Karen. As alternativas devem soar como uma pessoa real falando — não como IA, não como coach, não genérico.

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
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error('API error')
  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  const match2 = text.match(/\[[\s\S]*\]/)
  if (!match2) throw new Error('No JSON')
  return JSON.parse(match2[0])
}

function ViolationRow({ v }) {
  const [alts, setAlts] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(null)

  const handleSuggest = async () => {
    setLoading(true)
    try {
      const result = await fetchAlternatives(v.match, v.category, v.suggestion)
      setAlts(result)
    } catch {
      setAlts([])
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text, i) => {
    navigator.clipboard.writeText(text)
    setCopied(i)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
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

      {/* Suggest alternatives */}
      {!alts && (
        <button
          type="button"
          onClick={handleSuggest}
          disabled={loading}
          className="flex items-center gap-1.5 text-[10px] font-medium text-violet-600 hover:text-violet-800 transition-colors disabled:opacity-50"
        >
          {loading
            ? <><RefreshCw size={10} className="animate-spin" /> Gerando alternativas...</>
            : <><Sparkles size={10} /> Sugerir alternativas com IA</>
          }
        </button>
      )}

      {alts !== null && alts.length === 0 && (
        <p className="text-[10px] text-red-400">Não foi possível gerar alternativas. Verifique sua API key.</p>
      )}

      {alts && alts.length > 0 && (
        <div className="space-y-1.5 mt-1">
          <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Alternativas no seu tom:</p>
          {alts.map((alt, i) => (
            <div key={i} className="flex items-start gap-2 group">
              <div className="flex-1 text-[11px] text-gray-800 bg-violet-50 border border-violet-100 rounded px-2 py-1.5 leading-relaxed font-medium">
                {alt}
              </div>
              <button
                type="button"
                onClick={() => handleCopy(alt, i)}
                className="shrink-0 mt-1 text-gray-300 hover:text-violet-500 transition-colors"
                title="Copiar"
              >
                {copied === i ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => { setAlts(null) }}
            className="text-[10px] text-gray-400 hover:text-gray-600"
          >
            Gerar novas alternativas
          </button>
        </div>
      )}
    </div>
  )
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
            <ViolationRow key={`${v.id}-${i}`} v={v} />
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
