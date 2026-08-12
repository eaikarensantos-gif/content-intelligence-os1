import { useState } from 'react'
import { RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { assertNotTruncated } from '../../utils/aiJson'
import { withAntiAIFilter } from '../../lib/antiAIFilter'
import { withManualOperacional } from '../../lib/manualOperacional'

const LS_KEY = 'cio-anthropic-key'

// Divide o roteiro em blocos por linha em branco — cada marcador de cena
// ([CENA: ...], [CORTE: ...]), título de seção (**ABERTURA**) ou parágrafo
// vira um bloco regenerável isoladamente, sem precisar reescrever o resto.
function splitBlocks(script) {
  return (script || '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
}

export default function ScriptBlockRegenerator({ script, onChange, voiceCtx = '' }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(null)
  const [instruction, setInstruction] = useState('')
  const [loadingIndex, setLoadingIndex] = useState(null)
  const [error, setError] = useState(null)

  const blocks = splitBlocks(script)
  if (blocks.length === 0) return null

  const regenerateBlock = async (index) => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key do Gemini primeiro.'); return }
    setLoadingIndex(index)
    setError(null)
    try {
      const before = blocks.slice(0, index).join('\n\n')
      const after = blocks.slice(index + 1).join('\n\n')
      const alvo = blocks[index]
      const prompt = `Você está reescrevendo APENAS um trecho de um roteiro já pronto — o resto do roteiro permanece exatamente como está, então o trecho novo precisa encaixar no mesmo tom, ritmo e continuidade do que vem antes e depois dele.
${before ? `\nTRECHO ANTERIOR (contexto — NÃO reescreva):\n${before}\n` : ''}
TRECHO A REESCREVER:
${alvo}
${after ? `\nTRECHO SEGUINTE (contexto — NÃO reescreva):\n${after}` : ''}
${instruction.trim() ? `\nINSTRUÇÃO DE COMO MUDAR: ${instruction.trim()}` : '\nMelhore esse trecho especificamente — mais concreto, menos genérico, mantendo a mesma ideia central.'}

Responda APENAS com o texto novo desse trecho — mesmo formato e marcadores do original (ex.: se o trecho começa com [CENA: ...] ou **TÍTULO**, mantenha esse padrão), sem introdução nem explicação.`
      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 1000,
          system: withManualOperacional(withAntiAIFilter(
            `Você escreve conteúdo para Karen Santos, criadora brasileira. Siga as regras de voz abaixo em tudo que gerar.${voiceCtx}`
          )),
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      const novo = data.content?.find((b) => b.type === 'text')?.text?.trim()
      if (!novo) throw new Error('A IA não retornou texto novo.')
      const novosBlocks = [...blocks]
      novosBlocks[index] = novo
      onChange(novosBlocks.join('\n\n'))
      setActiveIndex(null)
      setInstruction('')
    } catch (err) {
      setError(err.message || 'Erro ao regenerar trecho.')
    } finally {
      setLoadingIndex(null)
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wide hover:text-violet-600 transition-colors py-0.5"
      >
        <span className="flex items-center gap-1"><RefreshCw size={11} /> Regenerar por trecho</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {blocks.map((block, i) => (
            <div key={i} className="p-2.5 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap flex-1">{block}</p>
                <button
                  type="button"
                  onClick={() => setActiveIndex((v) => (v === i ? null : i))}
                  className="shrink-0 text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 font-medium transition-all"
                >
                  <RefreshCw size={10} /> Regenerar
                </button>
              </div>
              {activeIndex === i && (
                <div className="flex gap-1.5 pt-1">
                  <input
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Como você quer mudar? (opcional)"
                    className="flex-1 text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 placeholder:text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => regenerateBlock(i)}
                    disabled={loadingIndex === i}
                    className="shrink-0 text-[10px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-medium transition-all disabled:opacity-50"
                  >
                    {loadingIndex === i ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    {loadingIndex === i ? 'Gerando...' : 'Aplicar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-[10px] text-red-500 px-1">{error}</p>}
    </div>
  )
}
