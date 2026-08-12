import { useState } from 'react'
import { Loader2, Search, ChevronDown, ChevronUp, ExternalLink, Plus, BookOpen } from 'lucide-react'
import { assertNotTruncated, extractJsonObject } from '../../utils/aiJson'

const LS_KEY = 'cio-anthropic-key'

// Remove marcadores de citação que o Gemini às vezes deixa dentro do texto
// grounded, tipo "[1.1.1]" ou "[1.2.9" — não têm sentido fora da resposta
// original e sujam o dado antes de inserir no roteiro.
function stripCitationMarkers(text) {
  return (text || '').replace(/\s*\[[\d.]+\]?/g, '').trim()
}

/**
 * Busca dados reais e verificáveis (com fonte nomeada) pra enriquecer um
 * roteiro, usando grounding com Google Search no Gemini — não é o modelo
 * "lembrando" de um número, é uma busca de verdade antes de responder.
 */
export default function FactFinder({ topic, onInsert }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dados, setDados] = useState(null)
  const [fontesConsultadas, setFontesConsultadas] = useState([])

  const handleSearch = async () => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key do Gemini primeiro.'); return }
    if (!topic?.trim()) { setError('Preencha o título ou a descrição antes de buscar dados.'); return }
    setLoading(true)
    setError(null)
    try {
      const prompt = `Você é um pesquisador de dados para um roteiro de conteúdo sobre o seguinte tema:

TEMA: ${topic.trim()}

Busque e traga até 4 dados concretos e verificáveis (estatísticas, percentuais, números reais) diretamente relacionados a esse tema, usando fontes reais e recentes que você encontrar na busca.

REGRAS OBRIGATÓRIAS:
- Cada dado precisa ser um número ou fato específico, nunca uma afirmação vaga
- Cite o nome da fonte (instituição, veículo de imprensa, pesquisa) exatamente como aparece na busca — NUNCA invente uma fonte
- Se não encontrar dado real e verificável sobre o tema, não invente — retorne menos itens ou nenhum
- Ano da publicação/pesquisa, se disponível

Responda EXCLUSIVAMENTE com JSON válido, sem markdown, sem texto antes ou depois:
{"dados": [{"dado": "texto do dado com o número específico", "fonte": "nome da instituição ou veículo", "ano": "20XX ou null"}]}`

      const res = await fetch('/api/ai?action=gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          grounding: true,
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }
      const data = await res.json()
      assertNotTruncated(data)
      const text = data.content?.find((b) => b.type === 'text')?.text || ''
      const parsed = extractJsonObject(text, 'A IA não retornou dados válidos.')
      const lista = Array.isArray(parsed.dados) ? parsed.dados : []
      if (lista.length === 0) throw new Error('Não encontrei dados reais e verificáveis pra esse tema. Tente descrever o tema de forma mais específica.')
      setDados(lista.map((d) => ({ ...d, dado: stripCitationMarkers(d.dado) })))
      setFontesConsultadas(data.grounding_sources || [])
    } catch (err) {
      setError(err.message || 'Erro ao buscar dados.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-[10px] font-semibold text-gray-500 uppercase tracking-wide hover:text-emerald-600 transition-colors py-0.5"
      >
        <span className="flex items-center gap-1"><BookOpen size={11} /> Dados para o roteiro</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="border border-gray-200 rounded-xl p-2.5 space-y-2">
          {!dados && (
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg py-2 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
              {loading ? 'Buscando dados reais...' : 'Buscar dados reais'}
            </button>
          )}

          {error && <p className="text-[10px] text-red-500 px-0.5">{error}</p>}

          {dados && dados.length > 0 && (
            <div className="space-y-1.5">
              {dados.map((d, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-2 bg-gray-50/60 space-y-1">
                  <p className="text-[11px] text-gray-800 leading-relaxed">{d.dado}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Fonte: {d.fonte}{d.ano && d.ano !== 'null' ? ` (${d.ano})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => onInsert(`${d.dado} (Fonte: ${d.fonte}${d.ano && d.ano !== 'null' ? `, ${d.ano}` : ''})`)}
                      className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                    >
                      <Plus size={10} /> Inserir no roteiro
                    </button>
                  </div>
                </div>
              ))}

              {fontesConsultadas.length > 0 && (
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">Fontes consultadas na busca:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {fontesConsultadas.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-emerald-600 bg-white border border-gray-200 rounded-full px-2 py-0.5 transition-colors">
                        {s.title} <ExternalLink size={8} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => { setDados(null); setFontesConsultadas([]); setError(null) }}
                className="text-[10px] text-gray-400 hover:text-gray-600"
              >
                Buscar de novo
              </button>
            </div>
          )}

          <p className="text-[9px] text-gray-400 leading-snug">
            Dados buscados em tempo real na web — confira sempre a fonte antes de publicar.
          </p>
        </div>
      )}
    </div>
  )
}
