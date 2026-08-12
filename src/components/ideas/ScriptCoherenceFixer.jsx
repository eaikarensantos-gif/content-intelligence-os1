import { useState } from 'react'
import { Wand2, Loader2, Check, X } from 'lucide-react'
import { assertNotTruncated } from '../../utils/aiJson'
import { withAntiAIFilter } from '../../lib/antiAIFilter'
import { withManualOperacional } from '../../lib/manualOperacional'

const LS_KEY = 'cio-anthropic-key'

/**
 * Reorganiza e melhora o roteiro inteiro — resolve o problema de dados
 * inseridos soltos no fim do texto (em vez de espalhados no lugar certo do
 * fluxo) e artefatos de formatação que sobram de busca de dados (marcador
 * de citação, cabeçalho de markdown, lista com emoji). Mostra uma prévia
 * antes de aplicar, nunca sobrescreve o roteiro direto.
 */
export default function ScriptCoherenceFixer({ script, onApply, voiceCtx = '' }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  if (!script?.trim()) return null

  const handleFix = async () => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key do Gemini primeiro.'); return }
    setLoading(true)
    setError(null)
    setPreview(null)
    try {
      const prompt = `Você recebeu um roteiro que precisa de duas coisas: reorganização e melhoria de texto.

ROTEIRO ATUAL:
${script.trim()}

O QUE FAZER:
1. Reorganize a ordem — se houver dados, estatísticas ou fatos jogados soltos no final do texto (em vez de espalhados no ponto do roteiro onde fazem sentido), mova cada um pro lugar certo dentro do fluxo narrativo, integrado à frase, não como lista solta anexada depois.
2. Limpe artefatos de formatação que não pertencem a um roteiro: marcador de citação tipo "[1, 2]" ou "[1.1.1]", cabeçalho de markdown tipo "## Título", lista com emoji de marcador, link em formato markdown "[texto](url)". Se a informação do link/citação for relevante, mantenha só o texto, sem a marcação.
3. Melhore a fluidez e a coerência geral — corte redundância, ajuste transições fracas, mantenha o tom e a voz que já estão no texto.
4. Preserve marcadores de cena ([CENA: ...], [CORTE: ...], **TÍTULOS DE SEÇÃO**) exatamente como estão, na mesma posição relativa.

REGRAS OBRIGATÓRIAS:
- NÃO invente dado novo, NÃO remova nenhum dado ou fato que já está no texto — só reposicione e limpe a formatação.
- NÃO mude o sentido ou a opinião do que já está escrito.
- Responda APENAS com o roteiro final, sem introdução, sem explicação do que foi mudado.`

      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 4000,
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
      const text = data.content?.find((b) => b.type === 'text')?.text?.trim()
      if (!text) throw new Error('A IA não retornou um roteiro válido.')
      setPreview(text)
    } catch (err) {
      setError(err.message || 'Erro ao reorganizar o roteiro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      {!preview && (
        <button
          type="button"
          onClick={handleFix}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg py-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
          {loading ? 'Reorganizando...' : 'Reorganizar e melhorar texto'}
        </button>
      )}

      {error && <p className="text-[10px] text-red-500 px-0.5">{error}</p>}

      {preview && (
        <div className="border border-blue-200 rounded-xl p-2.5 space-y-2 bg-blue-50/30">
          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Prévia — revise antes de aplicar:</p>
          <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto bg-white border border-gray-100 rounded-lg p-2">
            {preview}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onApply(preview); setPreview(null) }}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg py-1.5 transition-colors"
            >
              <Check size={11} /> Aplicar
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium text-gray-500 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg py-1.5 transition-colors"
            >
              <X size={11} /> Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
