import { useState, useRef } from 'react'
import {
  Upload, Sparkles, FileText, Film, Loader2, Copy, Check,
  RefreshCw, ChevronDown, ChevronRight, Megaphone, X,
  Video, LayoutGrid, Type, MessageSquare, Zap, Eye,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'
import { buildVoiceContext } from '../../utils/voiceContext'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

/* ── Master Prompt do briefing da Karen (PDF integrado) ── */
const KAREN_SYSTEM_PROMPT = `Você é um publicitário extremamente experiente e estrategista, com adicional de olhar de filmmaker mobile.
Seu trabalho é analisar briefings de marcas e gerar roteiros de conteúdo que sejam estratégicos, criativos e executáveis com celular.

FRAMEWORK DE VOZ DA KAREN SANTOS (@karensantosperfil):
Karen é consultora tech, mentora de carreira e criadora de conteúdo sobre carreira em tecnologia, comportamento profissional, liderança e IA.
Ela cria conteúdo que faz as pessoas se sentirem vistas porque ela passa pelo que elas passam.

TONS DE VOZ:
1. TOM REFLEXIVO (temas sérios): Direto, crítico, empático, estruturado, provocador
   Estrutura: Abertura provocadora → Descrição da dor → Crítica ao senso comum → Reframing → Ação → Validação → CTA
2. TOM ENGRAÇADO (situações relatable): Leve, coloquial, sem julgamento, observador
   Estrutura: Abertura relatable → Situação → Crítica disfarçada → Punchline → CTA
3. TOM MENTORA (carreira, IA, liderança): Realista, orientador, questionador, estruturado, maduro
   Estrutura: Abertura provocadora → Contexto → Insight → Reframing → Ação/Provocação → CTA

ELEMENTOS OBRIGATÓRIOS:
- Autenticidade: passa pelo que as pessoas passam
- Nomeação precisa: nomeia sentimentos/problemas com exatidão
- Crítica ao senso comum: questiona narrativas padrão
- Estrutura: oferece alternativa/ação, não só problema
- Engajamento: finaliza com pergunta ou provocação
- Sem floreios: linguagem direta, sem corporativismo
- Empatia + Realidade: valida a dor mas oferece saída
- Ponto social: sempre uma crítica social/comportamental subjacente

O QUE NUNCA FAZER:
- Motivação baça ("você consegue!", "acredite em si mesmo")
- Corporativismo vazio ("sinergia", "alinhamento")
- Superficialidade (explicações rasas)
- Falta de estrutura (só problema, sem solução)
- Julgamento moral (condenar sem entender)
- Soluções simplistas
- Hype sem fundamento (especialmente IA)

OLHAR DE FILMMAKER MOBILE:
- Pense em enquadramentos executáveis com celular
- Sugira movimentos de câmera simples mas impactantes (POV, close, transição na mão)
- Considere iluminação natural e cenários acessíveis
- Indique ritmo de edição (cortes rápidos, respirações, texto na tela)
- Pense em ganchos visuais nos primeiros 2 segundos`

const FORMAT_OPTIONS = [
  { id: 'reels', label: 'Reels', icon: Video, desc: '30-60s, roteiro com cenas' },
  { id: 'carrossel', label: 'Carrossel', icon: LayoutGrid, desc: '5-10 slides' },
  { id: 'caption', label: 'Caption', icon: Type, desc: 'Instagram/LinkedIn' },
  { id: 'thread', label: 'Thread', icon: MessageSquare, desc: 'Twitter/X' },
]

const FORMAT_INSTRUCTIONS = {
  reels: `FORMATO: REELS (30-60 segundos)
Para cada roteiro, inclua:
- Indicação de cenas com timing (0-3s abertura, 3-45s desenvolvimento, 45-55s insight, 55-60s CTA)
- Direção de câmera (enquadramento, movimento, transições) — tudo executável com celular
- Narração/texto em tela
- Sugestão de áudio/trilha
- Legenda para o post
- 5-8 hashtags relevantes`,
  carrossel: `FORMATO: CARROSSEL (5-10 slides)
Para cada roteiro, inclua:
- Texto exato de cada slide
- Sugestões visuais por slide (cores, ícones, layout)
- Slide 1: Gancho provocador
- Slides 2-8: Desenvolvimento
- Slides 9-10: Conclusão + CTA
- Legenda para o post
- 5-8 hashtags relevantes`,
  caption: `FORMATO: CAPTION (Instagram/LinkedIn)
Para cada roteiro, inclua:
- Abertura: Gancho direto (primeira linha que aparece no feed)
- Corpo: 3-5 parágrafos
- Encerramento: Pergunta/CTA
- 5-8 hashtags relevantes`,
  thread: `FORMATO: THREAD (Twitter/X)
Para cada roteiro, inclua:
- Tweet 1: Abertura provocadora (máx 280 caracteres)
- Tweets 2-N: Desenvolvimento (cada um independente mas conectado)
- Último tweet: CTA
- Sugestão de imagem/vídeo para o tweet 1`,
}

export default function BriefingStudio() {
  const brandVoice = useStore(s => s.brandVoice)
  const dislikedContent = useStore(s => s.dislikedContent)
  const bannedWords = useStore(s => s.bannedWords) || []
  const apiKey = useState(() => localStorage.getItem('cio-anthropic-key') || '')[0]

  const [briefingText, setBriefingText] = useState('')
  const [briefingName, setBriefingName] = useState('')
  const [format, setFormat] = useState('reels')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null) // { tom_de_voz, pilares, publico, regras }
  const [scripts, setScripts] = useState(null) // array de 3 roteiros
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const [expandedScript, setExpandedScript] = useState(0)
  const fileRef = useRef(null)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBriefingName(file.name)

    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let text = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          text += content.items.map(item => item.str).join(' ') + '\n\n'
        }
        setBriefingText(text.trim())
      } catch (err) {
        setError('Erro ao ler PDF. Tente colar o texto diretamente.')
      }
    } else {
      const reader = new FileReader()
      reader.onload = () => setBriefingText(reader.result)
      reader.readAsText(file)
    }
    e.target.value = ''
  }

  const handleGenerate = async () => {
    if (!briefingText.trim()) return
    if (!apiKey) { setError('Configure sua API key nas configurações do Analytics'); return }

    setLoading(true)
    setError(null)
    setAnalysis(null)
    setScripts(null)

    const voiceCtx = buildVoiceContext(brandVoice, dislikedContent, bannedWords)

    const prompt = `${KAREN_SYSTEM_PROMPT}
${voiceCtx}

BRIEFING DA MARCA/CLIENTE:
"""
${briefingText.slice(0, 8000)}
"""

${FORMAT_INSTRUCTIONS[format]}

TAREFA CRÍTICA — LEIA COM ATENÇÃO:
1. ANALISE o briefing da marca/cliente acima e extraia:
   - Tom de voz DA MARCA (como ELA se comunica, NÃO da Karen)
   - Pilares de conteúdo DA MARCA
   - Público-alvo DA MARCA
   - Regras/restrições específicas do briefing
   - Oportunidades de conteúdo para A MARCA

2. GERE 3 ROTEIROS de conteúdo no formato ${format.toUpperCase()} que:
   - Sejam SOBRE A MARCA E SEUS PRODUTOS/SERVIÇOS (não sobre Karen ou carreira)
   - Obedeçam 100% as regras e diretrizes do briefing
   - Karen é a CRIADORA que produz o conteúdo para a marca — ela adapta seu estilo ao universo da marca
   - Os roteiros devem falar sobre o que a marca quer comunicar, usando a linguagem e o olhar estratégico de Karen
   - Sejam executáveis com celular (filmmaker mobile)
   - Tenham ganchos irresistíveis nos primeiros 2 segundos
   - Cada roteiro com abordagem DIFERENTE (um mais provocador, um mais educativo, um mais relatable)
   - SE o briefing menciona produtos, campanhas ou mensagens específicas, USE-OS nos roteiros

Responda EXCLUSIVAMENTE com JSON válido:
{
  "analysis": {
    "tom_de_voz": "descrição do tom identificado",
    "pilares": ["pilar1", "pilar2", "pilar3"],
    "publico": "descrição do público-alvo",
    "regras": ["regra1", "regra2"],
    "oportunidades": ["oportunidade1", "oportunidade2"]
  },
  "scripts": [
    {
      "titulo": "título do roteiro",
      "abordagem": "provocador|educativo|relatable",
      "tom": "reflexivo|engracado|mentora",
      "conteudo": "o roteiro completo com todas as indicações do formato",
      "legenda": "legenda para o post",
      "hashtags": ["#tag1", "#tag2"],
      "dica_filmmaker": "dica prática de filmagem mobile para este roteiro"
    }
  ]
}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 6000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }

      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Resposta sem JSON válido')

      const parsed = JSON.parse(jsonMatch[0])
      setAnalysis(parsed.analysis)
      setScripts(parsed.scripts)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleRegenerate = () => handleGenerate()

  const TOM_COLORS = {
    reflexivo: 'bg-purple-100 text-purple-700 border-purple-200',
    engracado: 'bg-amber-100 text-amber-700 border-amber-200',
    mentora: 'bg-blue-100 text-blue-700 border-blue-200',
  }

  const ABORDAGEM_COLORS = {
    provocador: 'bg-red-100 text-red-700',
    educativo: 'bg-emerald-100 text-emerald-700',
    relatable: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
          <Megaphone size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Briefing Studio</h1>
          <p className="text-xs text-gray-400">Suba o briefing da marca e gere roteiros estratégicos com olhar de filmmaker</p>
        </div>
      </div>

      {/* Upload + Input area */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Briefing da Marca</h3>
          <div className="flex gap-2">
            <input type="file" ref={fileRef} accept=".txt,.md,.pdf,.docx" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
              <Upload size={12} /> {briefingName || 'Importar arquivo'}
            </button>
          </div>
        </div>

        <textarea
          value={briefingText}
          onChange={(e) => setBriefingText(e.target.value)}
          rows={8}
          placeholder="Cole aqui o briefing da marca/cliente...

Inclua: tom de voz, público-alvo, objetivos, restrições, pilares de conteúdo, referências visuais, regras de comunicação, etc."
          className="w-full text-sm border border-gray-200 rounded-xl p-4 outline-none focus:border-orange-300 resize-none placeholder:text-gray-300"
        />

        {/* Format selection */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Formato dos Roteiros</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FORMAT_OPTIONS.map(f => {
              const Icon = f.icon
              return (
                <button key={f.id} onClick={() => setFormat(f.id)}
                  className={clsx('flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                    format === f.id
                      ? 'bg-orange-50 border-orange-300 text-orange-700 ring-1 ring-orange-200'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  )}>
                  <Icon size={18} />
                  <span className="text-xs font-semibold">{f.label}</span>
                  <span className="text-[10px] text-gray-400">{f.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !briefingText.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Analisando briefing e gerando roteiros...</>
          ) : (
            <><Sparkles size={16} /> Analisar Briefing e Gerar 3 Roteiros</>
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>
        )}
      </div>

      {/* Analysis Result */}
      {analysis && (
        <div className="bg-gradient-to-br from-gray-50 to-orange-50/30 rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-orange-500" />
            <h3 className="text-sm font-bold text-gray-900">Diagnóstico do Briefing</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tom de voz */}
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Tom de Voz Identificado</p>
              <p className="text-sm text-gray-700">{analysis.tom_de_voz}</p>
            </div>

            {/* Público */}
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Público-Alvo</p>
              <p className="text-sm text-gray-700">{analysis.publico}</p>
            </div>

            {/* Pilares */}
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Pilares de Conteúdo</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(analysis.pilares || []).map((p, i) => (
                  <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200">{p}</span>
                ))}
              </div>
            </div>

            {/* Oportunidades */}
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Oportunidades</p>
              <div className="space-y-1 mt-1">
                {(analysis.oportunidades || []).map((o, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <Zap size={10} className="text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-xs text-gray-600">{o}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Regras */}
          {analysis.regras?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Regras do Briefing</p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.regras.map((r, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scripts */}
      {scripts && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film size={16} className="text-orange-500" />
              <h3 className="text-sm font-bold text-gray-900">3 Roteiros Gerados</h3>
            </div>
            <button onClick={handleRegenerate} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Regenerar
            </button>
          </div>

          {scripts.map((script, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Script header */}
              <button
                onClick={() => setExpandedScript(expandedScript === idx ? -1 : idx)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{script.titulo}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded border', TOM_COLORS[script.tom] || 'bg-gray-100 text-gray-600')}>
                      {script.tom}
                    </span>
                    <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded', ABORDAGEM_COLORS[script.abordagem] || 'bg-gray-100 text-gray-600')}>
                      {script.abordagem}
                    </span>
                  </div>
                </div>
                {expandedScript === idx ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </button>

              {/* Script content */}
              {expandedScript === idx && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {/* Roteiro */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Roteiro Completo</p>
                      <button onClick={() => handleCopy(script.conteudo, `content-${idx}`)}
                        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-500 transition-colors">
                        {copied === `content-${idx}` ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                      {script.conteudo}
                    </div>
                  </div>

                  {/* Dica filmmaker */}
                  {script.dica_filmmaker && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <Film size={14} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold text-amber-700 uppercase mb-0.5">Dica de Filmmaker Mobile</p>
                        <p className="text-xs text-amber-800">{script.dica_filmmaker}</p>
                      </div>
                    </div>
                  )}

                  {/* Legenda */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Legenda</p>
                      <button onClick={() => handleCopy(script.legenda + '\n\n' + (script.hashtags || []).join(' '), `caption-${idx}`)}
                        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-500 transition-colors">
                        {copied === `caption-${idx}` ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                      </button>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap border border-blue-100">
                      {script.legenda}
                    </div>
                  </div>

                  {/* Hashtags */}
                  {script.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {script.hashtags.map((tag, i) => (
                        <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
