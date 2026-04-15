import { useState } from 'react'
import {
  ShieldAlert, Loader2, AlertTriangle, CheckCircle2, Flame,
  ChevronDown, ChevronUp, Copy, Check, Mic, RefreshCw, Sparkles,
} from 'lucide-react'
import useStore from '../../store/useStore'
import clsx from 'clsx'

const LS_KEY = 'cio-anthropic-key'

// ── Build prompt ──────────────────────────────────────────────────────────────
function buildAnalysisPrompt(draft, benchmarkText, creatorContext) {
  return `Você é um analisador crítico de conteúdo para criadores digitais.

Contexto da criadora: ${creatorContext}

Seu papel: você não é redator. Você é Crítico de Autenticidade. Sua função é impedir que conteúdo genérico seja publicado.

Receberá um rascunho e deverá executar três análises em sequência:

---

## ANÁLISE 1 — ÍNDICE DE GENERICIDADE

Avalie nos critérios abaixo. Nota de 0 a 10 (0 = completamente original, 10 = completamente genérico):

- Vocabulário: usa palavras-padrão de IA? ("transformar", "navegar", "jornada", "potencializar", "impactar positivamente")
- Estrutura: segue fórmulas previsíveis? (problema → solução → CTA; lista de 3 pontos; abertura com pergunta retórica)
- Voz: poderia ter sido escrito por qualquer pessoa do mesmo nicho?
- Posição: tem opinião real ou apenas constata o óbvio?
- Especificidade: tem detalhes concretos ou é genérico o suficiente para servir para qualquer um?

Calcule uma média e classifique:
- 0–3: VOZ PRÓPRIA
- 4–6: ZONA DE RISCO
- 7–10: CONTEÚDO GENÉRICO

---

## ANÁLISE 2 — DIAGNÓSTICO DE AUTENTICIDADE

Identifique o que está faltando. Seja direto e específico.

Responda apenas estas perguntas:
- Qual é a opinião real da Karen aqui? (se não tiver, diga)
- Qual experiência pessoal poderia ancorar esse conteúdo?
- Qual frase ou trecho soa mais "gerado por IA"? Por quê?
- O que esse conteúdo diz que nenhum outro criador do mesmo nicho diria?
- Onde o texto está "limpo demais" ou "educativo demais"?
- Tem frase que soa lição de moral, motivacional ou estrutura clássica de IA? (ex: "No mundo de hoje...", "É sobre X, não sobre Y") — aponte.
- Se a Karen contou um problema real, ela transformou em insight de carreira? Force manter o sentimento original — frustração, raiva, ironia.

---

## ANÁLISE 3 — COMPARAÇÃO COM BENCHMARK

Com base no perfil de referência abaixo, compare:
- O conteúdo analisado tem mais ou menos voz própria que o benchmark?
- Em qual dimensão específica o benchmark se diferencia mais?
- O que a Karen poderia absorver do estilo do benchmark sem copiar?

${benchmarkText}

---

## RASCUNHO A ANALISAR:

${draft}

---

Retorne SOMENTE um JSON válido com esta estrutura exata (sem markdown, sem texto antes ou depois):

{
  "indice_genericidade": número de 0 a 10,
  "classificacao": "VOZ PRÓPRIA" | "ZONA DE RISCO" | "CONTEÚDO GENÉRICO",
  "maior_problema": "uma frase direta",
  "frase_mais_generica": "trecho exato do conteúdo",
  "o_que_falta": ["item 1", "item 2", "item 3"],
  "tom": {
    "problema": "descreva em uma frase o que está errado no tom",
    "esta_soando_como": "coach" | "professor" | "corporativo" | "motivacional" | "neutro",
    "regra_whatsapp": "reescreva o trecho mais genérico como se fosse um áudio de 30 segundos pra um amigo próximo — ritmo oral, sem performance"
  },
  "comparacao_benchmark": {
    "veredicto": "melhor" | "similar" | "pior",
    "dimensao_critica": "texto explicando onde",
    "o_que_absorver": "texto explicando o que adaptar"
  },
  "reescrita_sugerida": "versão alternativa do trecho mais genérico, mantendo a voz real da Karen — imperfeita se necessário"
}

Seja direto. Não elogie. Não suavize. Aponte o problema com precisão cirúrgica.
Se o conteúdo estiver sem alma, diga explicitamente: "Esse texto está pronto mas está sem alma."`
}

function buildBenchmarkText(archetype) {
  if (!archetype) return '[PERFIL DE REFERÊNCIA: nenhum benchmark selecionado — pule a análise comparativa]'
  let p = {}
  try { p = JSON.parse(archetype.profile || '{}') } catch {}
  return `[PERFIL DE REFERÊNCIA:
Nome: ${archetype.name}
Criador de referência: ${p.creator_ref || 'N/A'}
Info: ${p.creator_info || 'N/A'}
Tom dominante: ${p.tone || p.dominant_tone || 'N/A'}
Estilo narrativo: ${p.narrative_style || 'N/A'}
Fórmula de gancho: ${p.hook_formula || 'N/A'}
Exemplos de gancho: ${(p.hook_examples || []).slice(0, 3).join(' | ') || 'N/A'}
]`
}

async function runAnalysis(apiKey, draft, benchmarkText, creatorContext) {
  const prompt = buildAnalysisPrompt(draft, benchmarkText, creatorContext)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: 'You are an authenticity analyzer. Respond ONLY with valid JSON. No markdown, no code blocks.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(res)
  }

  const data = await res.json()
  const raw = data.content?.[0]?.text || ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da IA')
  const sanitized = match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
  return JSON.parse(sanitized)
}

// ── Score visual ──────────────────────────────────────────────────────────────
const SCORE_CONFIG = {
  'VOZ PRÓPRIA':       { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500', icon: CheckCircle2 },
  'ZONA DE RISCO':     { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   bar: 'bg-amber-500',   icon: AlertTriangle },
  'CONTEÚDO GENÉRICO': { color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     bar: 'bg-red-500',     icon: Flame },
}

const TOM_LABELS = {
  coach: 'Coach',
  professor: 'Professor',
  corporativo: 'Corporativo',
  motivacional: 'Motivacional',
  neutro: 'Neutro',
}

const VEREDICTO_CONFIG = {
  melhor:  { label: 'Melhor que o benchmark', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  similar: { label: 'Similar ao benchmark',   color: 'text-blue-700 bg-blue-50 border-blue-200' },
  pior:    { label: 'Abaixo do benchmark',    color: 'text-red-700 bg-red-50 border-red-200' },
}

function ScoreBar({ score }) {
  const pct = (score / 10) * 100
  const color = score <= 3 ? 'bg-emerald-500' : score <= 6 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AuthenticityAnalyzer() {
  const archetypes      = useStore((s) => s.archetypes)
  const brandVoice      = useStore((s) => s.brandVoice)
  const creatorProfile  = useStore((s) => s.creatorProfile)

  const [draft, setDraft]               = useState('')
  const [selectedArchId, setArchId]     = useState('')
  const [result, setResult]             = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [showRaw, setShowRaw]           = useState(false)

  const apiKey = localStorage.getItem(LS_KEY) || ''

  // Build creator context from brand voice or profile
  const creatorContext = (() => {
    if (brandVoice?.masterPrompt) return brandVoice.masterPrompt.slice(0, 600)
    const p = creatorProfile
    const parts = [
      'Karen, mentora de carreira, consultora tech, influenciadora, embaixadora da Samsung Galaxy AI, palestrante, designer UX e consultora de estratégia de produto.',
      p?.niche ? `Nicho: ${p.niche}` : 'Nicho: carreira, maturidade profissional e IA aplicada.',
      'Viés analítico, técnico e minimalista.',
      'Problema recorrente: excesso de perfeição que torna o conteúdo genérico e desconectado da audiência. Tendência a transformar qualquer situação real em "insight de carreira".',
    ]
    return parts.filter(Boolean).join(' ')
  })()

  const selectedArch = archetypes.find((a) => a.id === selectedArchId) || null

  const handleAnalyze = async () => {
    if (!draft.trim()) return setError('Cole o rascunho para analisar')
    if (!apiKey) return setError('Configure sua chave Anthropic em Configurações')
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const benchmarkText = buildBenchmarkText(selectedArch)
      const data = await runAnalysis(apiKey, draft.trim(), benchmarkText, creatorContext)
      setResult(data)
    } catch (e) {
      setError(e.message || 'Erro na análise')
    } finally {
      setLoading(false)
    }
  }

  const cfg = result ? SCORE_CONFIG[result.classificacao] || SCORE_CONFIG['ZONA DE RISCO'] : null

  return (
    <div className="p-6 max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert size={18} className="text-red-500" />
          Crítico de Autenticidade
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Analisa seu rascunho e diz exatamente o que está genérico, sem alma ou fora da sua voz.
        </p>
      </div>

      {/* Input area */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Rascunho</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder="Cole aqui o texto, legenda, roteiro ou ideia que quer analisar..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all resize-none leading-relaxed"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400">{draft.length} caracteres</span>
            {draft.length > 0 && (
              <button onClick={() => { setDraft(''); setResult(null) }}
                className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">
                limpar
              </button>
            )}
          </div>
        </div>

        {/* Benchmark selector */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
            Benchmark para comparação
            <span className="text-gray-400 font-normal ml-1">(opcional — usa seus arquétipos salvos)</span>
          </label>
          {archetypes.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              Nenhum arquétipo salvo ainda. Crie em Arquétipos para usar como benchmark.
            </p>
          ) : (
            <select
              value={selectedArchId}
              onChange={(e) => setArchId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all"
            >
              <option value="">Sem benchmark (pula análise comparativa)</option>
              {archetypes.map((a) => {
                let p = {}
                try { p = JSON.parse(a.profile || '{}') } catch {}
                return (
                  <option key={a.id} value={a.id}>
                    {a.name}{p.creator_ref ? ` — ${p.creator_ref}` : ''}
                  </option>
                )
              })}
            </select>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
            <AlertTriangle size={13} />
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !draft.trim()}
          className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Analisando autenticidade...
            </>
          ) : (
            <>
              <ShieldAlert size={15} />
              Analisar rascunho
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">

          {/* Score card */}
          <div className={`card p-5 border-2 ${cfg.border}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <cfg.icon size={20} className={cfg.color} />
                  <span className={`text-base font-bold ${cfg.color}`}>{result.classificacao}</span>
                  <span className={`text-sm font-bold ${cfg.color}`}>{result.indice_genericidade}/10</span>
                </div>
                <ScoreBar score={result.indice_genericidade} />
                <p className={`text-sm font-medium ${cfg.color} ${cfg.bg} px-3 py-2 rounded-lg border ${cfg.border}`}>
                  {result.maior_problema}
                </p>
              </div>
            </div>
          </div>

          {/* Frase mais genérica */}
          <div className="card p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trecho mais genérico</p>
            <div className="flex items-start gap-2">
              <blockquote className="flex-1 text-sm text-gray-700 bg-red-50 border-l-2 border-red-300 px-3 py-2 rounded-r-lg italic leading-relaxed">
                "{result.frase_mais_generica}"
              </blockquote>
              <CopyButton text={result.frase_mais_generica} />
            </div>
          </div>

          {/* O que falta */}
          <div className="card p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">O que está faltando</p>
            <ul className="space-y-1.5">
              {(result.o_que_falta || []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Tom */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tom</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium border border-gray-200">
                Soa como: {TOM_LABELS[result.tom?.esta_soando_como] || result.tom?.esta_soando_como}
              </span>
            </div>
            <p className="text-sm text-gray-700">{result.tom?.problema}</p>

            {result.tom?.regra_whatsapp && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  <Mic size={10} /> Versão áudio (regra whatsapp)
                </div>
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-sm text-gray-700 leading-relaxed italic">{result.tom.regra_whatsapp}</p>
                  <CopyButton text={result.tom.regra_whatsapp} />
                </div>
              </div>
            )}
          </div>

          {/* Benchmark */}
          {result.comparacao_benchmark && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comparação com benchmark</p>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${VEREDICTO_CONFIG[result.comparacao_benchmark.veredicto]?.color || ''}`}>
                  {VEREDICTO_CONFIG[result.comparacao_benchmark.veredicto]?.label || result.comparacao_benchmark.veredicto}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="font-medium text-gray-900">Onde diverge: </span>{result.comparacao_benchmark.dimensao_critica}</p>
                <p><span className="font-medium text-gray-900">O que absorver: </span>{result.comparacao_benchmark.o_que_absorver}</p>
              </div>
            </div>
          )}

          {/* Reescrita sugerida */}
          {result.reescrita_sugerida && (
            <div className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles size={11} className="text-orange-500" /> Reescrita sugerida
                </p>
                <CopyButton text={result.reescrita_sugerida} />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                {result.reescrita_sugerida}
              </p>
            </div>
          )}

          {/* Re-analyze */}
          <div className="flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-orange-700 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-lg px-3 py-2 transition-all"
            >
              <RefreshCw size={12} /> Analisar novamente
            </button>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 transition-all"
            >
              {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              JSON bruto
            </button>
          </div>

          {showRaw && (
            <pre className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
