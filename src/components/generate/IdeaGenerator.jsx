import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Sparkles, RefreshCw, Check, Copy, Plus, ChevronDown, ChevronUp,
  Target, Users, Sliders, BookOpen, Zap, AlertCircle, X,
  Flame, Eye, MessageCircle, Layers, ArrowRight, Save, Star,
  Lightbulb, ExternalLink, Wand2, Mic, ArrowLeft, Heart, ThumbsDown,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { buildVoiceContext, buildRegenerateInstruction } from '../../utils/voiceContext'

const LS_KEY = 'cio-anthropic-key'

// ── Controls config ───────────────────────────────────────────────────────────
const TONES = [
  { id: 'reflexivo', label: 'Reflexivo', desc: 'Introspectivo, pessoal, pausado', emoji: '🪞' },
  { id: 'analitico', label: 'Analítico', desc: 'Racional, perspicaz, baseado em padrões', emoji: '🔬' },
  { id: 'educativo', label: 'Educativo', desc: 'Didático, claro, que ensina sem ser chato', emoji: '📚' },
  { id: 'curioso', label: 'Curioso', desc: 'Exploratório, questionador, mente aberta', emoji: '🔍' },
  { id: 'inspirador', label: 'Inspirador', desc: 'Que acende algo, sem ser motivacional vazio', emoji: '✨' },
  { id: 'provocativo', label: 'Provocativo', desc: 'Desconfortável no bom sentido, que cutuca', emoji: '🔥' },
  { id: 'contrarian', label: 'Contrarian', desc: 'Vai contra o consenso, desafia o óbvio', emoji: '⚡' },
  { id: 'humor', label: 'Humor', desc: 'Leve, espirituoso, que arranca sorrisos', emoji: '😄' },
]

const NARRATIVE_STYLES = [
  { id: 'observacao', label: 'Observação', desc: 'Algo que você notou que ninguém falou ainda' },
  { id: 'insight', label: 'Insight', desc: 'Conexão inesperada entre duas coisas' },
  { id: 'explicacao', label: 'Explicação', desc: 'Traduz algo complexo para qualquer pessoa' },
  { id: 'historia', label: 'História', desc: 'Narrativa pessoal ou observada que carrega lição' },
  { id: 'analise-tendencia', label: 'Análise de tendência', desc: 'Algo que está crescendo e poucas pessoas perceberam' },
  { id: 'previsao', label: 'Previsão', desc: 'O que vai acontecer nos próximos meses/anos' },
]

const INTENSITIES = [
  { id: 'suave', label: 'Suave', desc: 'Tom leve, acessível, não polêmico', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { id: 'equilibrado', label: 'Equilibrado', desc: 'Opinião presente mas respeitosa', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'forte', label: 'Forte', desc: 'Posição clara, sem medo de incomodar', color: 'bg-orange-100 text-orange-700 border-orange-300' },
]

const FORMATS = ['Carrossel', 'Reels/TikTok', 'Thread', 'Vídeo longo', 'Post reflexivo', 'Stories', 'Artigo']
const PLATFORMS = ['Instagram', 'LinkedIn', 'TikTok', 'Twitter/X', 'YouTube']

// ── Claude prompt ─────────────────────────────────────────────────────────────
function buildPrompt({ topic, audience, tone, narrativeStyle, intensity, previousTitles, voiceContext, regenInstruction }) {
  const toneMap = {
    reflexivo: 'Reflexivo — introspectivo, pausado, pessoal. Como alguém pensando em voz alta.',
    analitico: 'Analítico — racional, perspicaz, encontra padrões que outros não veem. Sem ser acadêmico.',
    educativo: 'Educativo — ensina com profundidade mas sem ser pedante. Transforma complexidade em clareza.',
    curioso: 'Curioso — faz perguntas genuínas, explora territórios novos, pensa junto com o leitor.',
    inspirador: 'Inspirador — que acende uma chama interna, MAS nunca com frases motivacionais genéricas ou coaching vazio.',
    provocativo: 'Provocativo — desconfortável no bom sentido. Faz o leitor parar e repensar algo que achava óbvio.',
    contrarian: 'Contrarian — vai explicitamente contra o consenso. Defende uma posição impopular com argumentos fortes.',
  }

  const styleMap = {
    observacao: 'Observação — começa com algo que o criador notou no dia a dia, na timeline, no comportamento de pessoas ao redor.',
    insight: 'Insight — faz uma conexão inesperada entre duas coisas que parecem desconectadas.',
    explicacao: 'Explicação — pega algo complexo e traduz com analogias e exemplos que qualquer pessoa entende.',
    historia: 'História — narrativa real (pessoal ou observada) que carrega uma lição, sem moral explícita.',
    'analise-tendencia': 'Análise de tendência — algo que está crescendo silenciosamente e que poucas pessoas perceberam ainda.',
    previsao: 'Previsão — faz uma aposta fundamentada sobre o que vai acontecer nos próximos meses/anos.',
  }

  const intensityMap = {
    suave: 'Suave — acessível, não polêmico, confortável de compartilhar. Tom de conversa entre amigos.',
    equilibrado: 'Equilibrado — tem opinião mas respeita quem pensa diferente. Argumenta sem atacar.',
    forte: 'Forte — posição clara e firme. Não tem medo de incomodar. Vai gerar discordância — e isso é intencional.',
  }

  const avoidPrevious = previousTitles.length > 0
    ? `\n\nIMPORTANTE: NÃO repita ideias, estruturas ou ângulos similares a estas já geradas:\n${previousTitles.map(t => `- "${t}"`).join('\n')}\nCada nova ideia deve trazer um ÂNGULO NARRATIVO COMPLETAMENTE DIFERENTE.`
    : ''

  return `Você é um Analista Sênior de UX, IA e Tecnologia com mais de 10 anos de mercado. Você escreve para profissionais de nível sênior — designers, product managers, engenheiros, líderes técnicos — que já passaram da fase de aprender o básico e agora navegam complexidade real: decisões com trade-offs, times com opiniões divergentes, tecnologia que muda antes de você terminar de implantar a anterior.

Seu tom é REFLEXIVO SÊNIOR: ácido quando necessário, técnico sem ser hermético, propositivo sem ser ingênuo. Você não motiva — você provoca pensamento. Seus textos soam como uma conversa no final de uma reunião de diretoria, não como um post de lifestyle de home office.

TÓPICO: ${topic}
AUDIÊNCIA: ${audience || 'Profissionais sênior de UX, Produto, IA e Tecnologia (10+ anos de carreira)'}
TOM: ${toneMap[tone] || toneMap.analitico}
ESTILO NARRATIVO: ${styleMap[narrativeStyle] || styleMap.insight}
INTENSIDADE: ${intensityMap[intensity] || intensityMap.forte}

BANCO DE TEMAS OBRIGATÓRIOS (use pelo menos 2 das 6 ideias neste território):
- A morte do pixel-pushing pela IA generativa: o que a senioria significa quando a máquina executa o operacional
- Prova de senioria em 2025+: o que distingue um profissional com 10 anos do júnior com IA — spoiler: não é a ferramenta
- Ética e viés em algoritmos de decisão: quando o modelo aprende com dados que já eram ruins
- Maturidade técnica vs. entusiasmo de adoção: a diferença entre quem entende a tecnologia e quem a consome
- Liderança técnica na era da automação: como tomar decisões quando ninguém sabe exatamente o que vai acontecer
- O colapso da hierarquia de habilidades no design: o que realmente importa quando qualquer um gera interfaces com IA

REGRAS DE ENERGIA E PROFUNDIDADE — CRÍTICO:
- Pelo menos 3 das 6 ideias devem ter ângulo técnico ou estratégico real — não genérico
- Pelo menos 1 ideia deve ser explicitamente contrarian (ir contra um consenso do mercado com argumento embasado)
- Pelo menos 1 ideia deve tratar de impacto humano/ético de decisões tecnológicas
- Ganchos devem soar como abertura de uma apresentação executiva ou insight de retrospectiva de um time sênior
- NUNCA soar como dica de produtividade, conselho motivacional ou lifestyle digital

PROIBIDO — ABSOLUTAMENTE:
- Palavras: "vibe", "diquinhas", "transformador", "jornada", "propósito", "missão de vida", "autêntico"
- "isso vai mudar tudo", "o erro que 90% cometem", "ninguém te conta isso"
- "a verdade é que", "o segredo de...", "X dicas para...", "Como fazer..."
- Tom de guru, coaching vazio, copywriting motivacional
- Conteúdos sobre produtividade pessoal, rotina de manhã, gestão de tempo, lifestyle
- Referências a criadores de finanças pessoais, coaching ou autoajuda
- Frases que soariam bem num podcast de empreendedorismo genérico

PREFERIDO — MODELOS DE GANCHO SÊNIOR:
- "Três anos depois de implantar o design system, o que ninguém documenta é o que quebrou..."
- "A IA não vai roubar seu emprego. Vai roubar o emprego de quem faz o que a IA faz barato."
- "Depois de revisar 40 pesquisas com usuários esse ano, o que me preocupa não é o que as pessoas dizem..."
- "O que a discussão sobre IA no design está errando é a pergunta em si..."
- "Senioria não é saber mais. É saber o que ignorar."
- "O problema não é que o modelo aluciou. É que ninguém checou porque o prazo era amanhã."
- Insights que surgem de experiência acumulada, não de curiosidade de iniciante
- Posições técnicas com consequências reais — budget, time, decisão de produto

ESTRUTURA DE CADA IDEIA:
1. OBSERVAÇÃO — algo específico que está acontecendo no mercado de tecnologia/design/produto agora
2. TENSÃO — a contradição que profissionais sênior reconhecem mas raramente nomeiam em público
3. INTERPRETAÇÃO — análise técnica ou estratégica: por que isso acontece e o que significa para quem toma decisões
4. CONCLUSÃO — o que muda na prática: um posicionamento, uma mudança de abordagem, uma pergunta que vale fazer

REGRAS DE TÍTULOS — OBRIGATÓRIO:
- NO MÁXIMO 12 palavras — diretos, com posição clara
- Soam como headline de uma análise técnica ou abertura de talk em conferência
- NUNCA use "você precisa", "isso vai mudar", "o erro que", "ninguém fala sobre", "guia"
- Bons exemplos: "O design system sobreviveu. A cultura de design não.", "Senioria na era da IA é saber o que não delegar", "O problema não é o modelo — é o prompt de quem aprovou"
- Podem ser levemente provocativos, mas com substância técnica por trás

REGRAS ADICIONAIS:
- TUDO em português brasileiro — preciso, sem gírias de lifestyle, sem anglicismos desnecessários
- Gere exatamente 6 ideias, variando formatos e plataformas com preferência para LinkedIn e Twitter/X para temas técnicos${avoidPrevious}

Responda SOMENTE com JSON válido (sem markdown, sem texto antes/depois):
{
  "ideas": [
    {
      "title": "Título CURTO (max 12 palavras), viral e persuasivo sem clickbait — ex: 'A gente confundiu ocupação com propósito'",
      "hook": "Primeira frase reflexiva que faz a pessoa pausar — ex: 'Tenho notado uma coisa curiosa nos últimos meses...'",
      "core_argument": "O argumento central em 2-3 frases. A ideia nova que você está trazendo, com profundidade.",
      "structure": {
        "observation": "O que está acontecendo agora — algo concreto e específico que o criador percebeu",
        "tension": "O conflito ou contradição por trás: o que ninguém está nomeando",
        "interpretation": "A leitura do criador: por que isso está acontecendo e o que significa",
        "conclusion": "A reflexão final: como isso muda a perspectiva ou o que vale repensar"
      },
      "format": "Carrossel | Reels/TikTok | Thread | Vídeo longo | Post reflexivo | Stories | Artigo",
      "platform": "Instagram | LinkedIn | TikTok | Twitter/X | YouTube",
      "why_now": "O gatilho cultural ou de timing — por que essa conversa está acontecendo agora"
    }
  ]
}
${voiceContext || ''}${regenInstruction || ''}`
}

async function generateIdeas(apiKey, params) {
  const prompt = buildPrompt(params)

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
      max_tokens: 6000,
      system: 'You are a sharp, curious Brazilian content strategist. Your DEFAULT energy is curiosity, wit, and genuine enthusiasm — never melancholic, pessimistic, or defeatist. You can be reflective but always land on something constructive, interesting, or energizing. Adapt tone to the goal: brand content = enthusiastic and genuine, reflective = curious and intelligent, educational = clear and practical. NEVER default to sad, heavy, or dramatic tone. Respond ONLY with valid JSON. No markdown, no code blocks, no text before or after the JSON.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(res)
  }

  const data = await res.json()
  const raw = data.content[0].text
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da IA')
  const sanitized = match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
  return JSON.parse(sanitized)
}

// ── Idea Card ─────────────────────────────────────────────────────────────────
function IdeaCard({ idea, index, onSave, saved, onCopy, copied, onOpenHub, isFav, onToggleFav, onDislike }) {
  const [expanded, setExpanded] = useState(false)
  const [showSavedFlash, setShowSavedFlash] = useState(false)

  // Flash green overlay briefly when saved changes to true
  useEffect(() => {
    if (saved) {
      setShowSavedFlash(true)
      const t = setTimeout(() => setShowSavedFlash(false), 1500)
      return () => clearTimeout(t)
    }
  }, [saved])

  const formatColor = {
    'Carrossel': 'bg-pink-100 text-pink-700 border-pink-200',
    'Reels/TikTok': 'bg-purple-100 text-purple-700 border-purple-200',
    'Thread': 'bg-sky-100 text-sky-700 border-sky-200',
    'Vídeo longo': 'bg-red-100 text-red-700 border-red-200',
    'Post reflexivo': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Stories': 'bg-orange-100 text-orange-700 border-orange-200',
    'Artigo': 'bg-blue-100 text-blue-700 border-blue-200',
  }

  const platformColor = {
    'Instagram': 'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 border-pink-200',
    'LinkedIn': 'bg-blue-100 text-blue-700 border-blue-200',
    'TikTok': 'bg-gray-100 text-gray-700 border-gray-300',
    'Twitter/X': 'bg-sky-100 text-sky-700 border-sky-200',
    'YouTube': 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <div className="card overflow-hidden hover:border-orange-200 transition-all">
      {/* Saved flash — brief confirmation then disappears */}
      {showSavedFlash && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-600/90 rounded-xl backdrop-blur-sm animate-pulse">
          <span className="text-white font-semibold text-sm flex items-center gap-2"><Check size={16} /> Salvo no Hub</span>
        </div>
      )}
      {/* Saved badge — small persistent indicator */}
      {saved && !showSavedFlash && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 bg-emerald-100 border border-emerald-200 rounded-full">
          <Check size={10} className="text-emerald-600" />
          <span className="text-[10px] font-semibold text-emerald-700">Salvo</span>
        </div>
      )}

      <div className="p-4 sm:p-5 space-y-4 relative">
        {/* Header: number + badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">
              {index + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-snug">{idea.title}</p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${formatColor[idea.format] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {idea.format}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${platformColor[idea.platform] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {idea.platform}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hook */}
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
          <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wide mb-1">Gancho</p>
          <p className="text-xs text-gray-800 font-medium italic leading-relaxed">"{idea.hook}"</p>
        </div>

        {/* Core argument */}
        <div>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Argumento Central</p>
          <p className="text-xs text-gray-700 leading-relaxed">{idea.core_argument}</p>
        </div>

        {/* Why now */}
        {idea.why_now && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <Zap size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-0.5">Por que agora</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">{idea.why_now}</p>
            </div>
          </div>
        )}

        {/* Expandable structure */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 hover:text-gray-700 transition-colors w-full"
        >
          <Layers size={12} />
          Estrutura Narrativa (Observação → Tensão → Interpretação → Conclusão)
          {expanded ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
        </button>

        {expanded && idea.structure && (
          <div className="space-y-2 animate-slide-up">
            {[
              { key: 'observation', label: 'Observação', color: 'border-l-blue-400 bg-blue-50/30', icon: Eye },
              { key: 'tension', label: 'Tensão', color: 'border-l-red-400 bg-red-50/30', icon: Flame },
              { key: 'interpretation', label: 'Interpretação', color: 'border-l-violet-400 bg-violet-50/30', icon: Lightbulb },
              { key: 'conclusion', label: 'Conclusão', color: 'border-l-emerald-400 bg-emerald-50/30', icon: ArrowRight },
            ].map(({ key, label, color, icon: Icon }) => (
              idea.structure[key] && (
                <div key={key} className={`border-l-4 ${color} rounded-r-xl p-3`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={10} className="text-gray-400" />
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{idea.structure[key]}</p>
                </div>
              )
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {saved ? (
            <button
              onClick={onOpenHub}
              className="flex-1 text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <Check size={12} /> Salvo no Hub
              <ExternalLink size={10} className="ml-1 text-orange-500" />
            </button>
          ) : (
            <button
              onClick={() => onSave(idea)}
              className="flex-1 btn-primary text-xs py-2 justify-center"
            >
              <Plus size={12} /> Salvar no Hub
            </button>
          )}
          <button
            onClick={() => onCopy(idea)}
            className="btn-secondary text-xs py-2 px-3"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
          <button
            onClick={() => onDislike(idea)}
            className="p-2 rounded-xl text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
            title="Não gostei — melhorar sugestões futuras"
          >
            <ThumbsDown size={13} />
          </button>
          <button
            onClick={onToggleFav}
            className={`p-2 rounded-xl transition-colors ${isFav ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart size={13} className={isFav ? 'fill-current' : ''} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function IdeaGenerator() {
  const { addIdea, addFavorite, removeFavorite, favorites, brandVoice, dislikedContent, addDislike } = useStore()
  const bannedWords = useStore(s => s.bannedWords) || []
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [apiKey] = useState(() => localStorage.getItem(LS_KEY) || '')

  // Controls
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')

  // Pre-fill from Analytics "Gerar Similar"
  useEffect(() => {
    const ctx = searchParams.get('context')
    if (ctx) {
      try {
        setTopic(decodeURIComponent(ctx))
      } catch {
        setTopic(ctx) // searchParams.get already decodes, fallback to raw
      }
    }
  }, [])
  const [tone, setTone] = useState('reflexivo')
  const [narrativeStyle, setNarrativeStyle] = useState('observacao')
  const [intensity, setIntensity] = useState('equilibrado')
  const [creativeOpen, setCreativeOpen] = useState(false)

  // State
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())
  const [copiedId, setCopiedId] = useState(null)
  const [allPreviousTitles, setAllPreviousTitles] = useState([])
  const [genCount, setGenCount] = useState(0)
  const [regenAttempt, setRegenAttempt] = useState(0)

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Defina o tópico.'); return }
    if (!apiKey) { setError('Configure sua chave Anthropic nas configurações do Analisador de Vídeo.'); return }

    setLoading(true)
    setError('')

    const msgs = [
      'Analisando o espaço cultural...',
      'Buscando tensões e padrões...',
      'Construindo narrativas...',
      'Refinando ganchos e argumentos...',
      'Rankeando por relevância...',
    ]
    let i = 0
    setLoadingMsg(msgs[0])
    const interval = setInterval(() => { i = (i + 1) % msgs.length; setLoadingMsg(msgs[i]) }, 2200)

    try {
      const voiceCtx = buildVoiceContext(brandVoice, dislikedContent, bannedWords)
      const regenInstruction = regenAttempt > 0 ? buildRegenerateInstruction(regenAttempt) : ''

      const data = await generateIdeas(apiKey, {
        topic, audience, tone, narrativeStyle, intensity,
        previousTitles: allPreviousTitles,
        voiceContext: voiceCtx,
        regenInstruction,
      })

      const ideas = (data.ideas || []).map((idea, idx) => ({
        ...idea,
        _id: `gen-${Date.now()}-${idx}`,
      }))

      setResults(ideas)
      setAllPreviousTitles(prev => [...prev, ...ideas.map(i => i.title)])
      setGenCount(c => c + 1)
      setRegenAttempt(c => c + 1)
      setSavedIds(new Set())
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  const handleSave = (idea) => {
    // Prevent duplicate saves
    if (savedIds.has(idea._id)) return

    // Build full description with all sections
    const parts = [
      idea.core_argument,
      '',
      `Gancho: "${idea.hook}"`,
    ]
    if (idea.structure) {
      parts.push('', '--- Estrutura Narrativa ---')
      if (idea.structure.observation) parts.push(`Observação: ${idea.structure.observation}`)
      if (idea.structure.tension) parts.push(`Tensão: ${idea.structure.tension}`)
      if (idea.structure.interpretation) parts.push(`Interpretação: ${idea.structure.interpretation}`)
      if (idea.structure.conclusion) parts.push(`Conclusão: ${idea.structure.conclusion}`)
    }
    if (idea.why_now) parts.push('', `Por que agora: ${idea.why_now}`)

    addIdea({
      title: idea.title,
      description: parts.join('\n'),
      topic: topic,
      format: idea.format?.toLowerCase().includes('carrossel') ? 'carrossel'
        : idea.format?.toLowerCase().includes('reel') || idea.format?.toLowerCase().includes('tiktok') ? 'reel'
        : idea.format?.toLowerCase().includes('thread') ? 'thread'
        : idea.format?.toLowerCase().includes('vídeo') ? 'video'
        : idea.format?.toLowerCase().includes('stor') ? 'story'
        : 'artigo',
      platform: idea.platform?.toLowerCase().includes('instagram') ? 'instagram'
        : idea.platform?.toLowerCase().includes('linkedin') ? 'linkedin'
        : idea.platform?.toLowerCase().includes('tiktok') ? 'tiktok'
        : idea.platform?.toLowerCase().includes('twitter') ? 'twitter'
        : 'youtube',
      priority: 'medium',
      status: 'idea',
      tags: ['gerador-moderno', topic.toLowerCase().slice(0, 20)].filter(Boolean),
      source: 'Gerador de Ideias',
    })
    setSavedIds(prev => new Set([...prev, idea._id]))
  }

  const handleCopy = (idea) => {
    const text = [
      idea.title,
      '',
      `Gancho: "${idea.hook}"`,
      '',
      idea.core_argument,
      '',
      idea.structure ? `Observação: ${idea.structure.observation}` : '',
      idea.structure ? `Tensão: ${idea.structure.tension}` : '',
      idea.structure ? `Interpretação: ${idea.structure.interpretation}` : '',
      idea.structure ? `Conclusão: ${idea.structure.conclusion}` : '',
      '',
      `Formato: ${idea.format}`,
      `Plataforma: ${idea.platform}`,
      idea.why_now ? `\nPor que agora: ${idea.why_now}` : '',
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text)
    setCopiedId(idea._id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isIdeaFavorited = (idea) => favorites.some(f => f.type === 'idea' && f.title === idea.title)
  const toggleIdeaFav = (idea) => {
    const existing = favorites.find(f => f.type === 'idea' && f.title === idea.title)
    if (existing) {
      removeFavorite(existing.id)
    } else {
      const content = [idea.title, `Gancho: "${idea.hook}"`, idea.core_argument, idea.why_now ? `Por que agora: ${idea.why_now}` : ''].filter(Boolean).join('\n\n')
      addFavorite({ type: 'idea', title: idea.title, content, source: 'Gerador de Ideias' })
    }
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Gerador de Ideias</h1>
              <p className="text-xs text-gray-400 mt-0.5">Ideias que soam como observações reais, não como marketing genérico</p>
            </div>
          </div>
          {genCount > 0 && (
            <span className="text-[11px] text-gray-400">
              {genCount} geração{genCount !== 1 ? 'ões' : ''} · {allPreviousTitles.length} ideias criadas
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Controls Panel ──────────────────────────────────────────────── */}
          <div className="lg:w-[340px] shrink-0 space-y-4">
            <div className="card p-4 sm:p-5 space-y-5 lg:sticky lg:top-24">

              {/* Topic */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                  <Target size={11} /> Tópico *
                </label>
                <input
                  className="input text-sm"
                  placeholder="Ex: inteligência artificial, criação de conteúdo, carreira..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              {/* Audience */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                  <Users size={11} /> Audiência
                </label>
                <input
                  className="input text-sm"
                  placeholder="Ex: profissionais de 25-40, empreendedores..."
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />
              </div>

              {/* Ajustes Criativos — collapsible */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setCreativeOpen(!creativeOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Sliders size={11} /> Ajustes Criativos
                  </span>
                  {creativeOpen
                    ? <ChevronUp size={12} className="text-gray-400" />
                    : <ChevronDown size={12} className="text-gray-400" />
                  }
                </button>

                {/* Collapsed summary chips */}
                {!creativeOpen && (
                  <div className="px-3 py-2 flex items-center gap-1.5 flex-wrap text-[10px] text-gray-500 border-t border-gray-100">
                    <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200 font-medium">
                      {TONES.find(t => t.id === tone)?.emoji} {TONES.find(t => t.id === tone)?.label}
                    </span>
                    <span className="text-gray-300">&middot;</span>
                    <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200 font-medium">
                      {NARRATIVE_STYLES.find(s => s.id === narrativeStyle)?.label}
                    </span>
                    <span className="text-gray-300">&middot;</span>
                    <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200 font-medium">
                      {INTENSITIES.find(i => i.id === intensity)?.label}
                    </span>
                  </div>
                )}

                {/* Expanded controls */}
                {creativeOpen && (
                  <div className="px-3 py-3 space-y-4 border-t border-gray-100">
                    {/* Tone — horizontal scrollable chips */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                        <MessageCircle size={11} /> Tom
                      </label>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                        {TONES.map(({ id, label, emoji }) => (
                          <button
                            key={id}
                            onClick={() => setTone(id)}
                            className={`shrink-0 px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-all whitespace-nowrap ${
                              tone === id
                                ? 'border-orange-400 bg-orange-50 text-orange-800'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {emoji} {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Narrative style — compact select dropdown */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                        <BookOpen size={11} /> Estilo Narrativo
                      </label>
                      <select
                        value={narrativeStyle}
                        onChange={(e) => setNarrativeStyle(e.target.value)}
                        className="w-full input text-xs py-2"
                      >
                        {NARRATIVE_STYLES.map(({ id, label, desc }) => (
                          <option key={id} value={id}>{label} — {desc}</option>
                        ))}
                      </select>
                    </div>

                    {/* Intensity — keep as-is */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                        <Sliders size={11} /> Intensidade
                      </label>
                      <div className="flex gap-2">
                        {INTENSITIES.map(({ id, label, color }) => (
                          <button
                            key={id}
                            onClick={() => setIntensity(id)}
                            className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                              intensity === id ? color : 'border-gray-200 text-gray-400 hover:border-gray-300'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate button */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11px]">
                  <AlertCircle size={12} className="shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim() || !apiKey}
                className="w-full btn-primary justify-center py-3 text-sm"
                style={{ background: loading ? undefined : 'linear-gradient(135deg, #ea580c, #dc2626)' }}
              >
                {loading ? (
                  <><RefreshCw size={15} className="animate-spin" /> {loadingMsg}</>
                ) : genCount > 0 ? (
                  <><RefreshCw size={15} /> Gerar Novas Ideias</>
                ) : (
                  <><Sparkles size={15} /> Gerar 6 Ideias</>
                )}
              </button>

              {genCount > 0 && (
                <p className="text-[10px] text-gray-400 text-center">
                  Cada geração traz ângulos narrativos diferentes. Ideias anteriores não se repetem.
                </p>
              )}

              {!apiKey && (
                <p className="text-center text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Configure sua chave Anthropic nas configurações do Analisador de Vídeo.
                </p>
              )}
            </div>
          </div>

          {/* ── Results Panel ───────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Loading */}
            {loading && (
              <div className="card p-16 flex flex-col items-center gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                  <Sparkles size={20} className="absolute inset-0 m-auto text-orange-500" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-semibold text-gray-800">{loadingMsg}</p>
                  <p className="text-xs text-gray-400">
                    Tom: {TONES.find(t => t.id === tone)?.label} · Estilo: {NARRATIVE_STYLES.find(s => s.id === narrativeStyle)?.label} · Intensidade: {intensity}
                  </p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && results.length === 0 && !error && (
              <div className="card p-12 sm:p-16 text-center">
                <Sparkles size={32} className="text-gray-200 mx-auto mb-4" />
                <h3 className="text-base font-semibold text-gray-700 mb-2">Configure e gere</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Defina o tópico, escolha o tom e estilo narrativo, e gere ideias que soam como observações reais sobre o que está acontecendo agora — nunca como marketing genérico.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {['Observação → Tensão → Interpretação → Conclusão'].map((s) => (
                    <span key={s} className="text-[10px] px-3 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{results.length} ideias</span> · Tom {TONES.find(t => t.id === tone)?.label?.toLowerCase()} · {NARRATIVE_STYLES.find(s => s.id === narrativeStyle)?.label}
                  </p>
                  <div className="flex items-center gap-2">
                    {savedIds.size > 0 && (
                      <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <Check size={11} /> {savedIds.size} salva{savedIds.size !== 1 ? 's' : ''}
                      </span>
                    )}
                    <button onClick={handleGenerate} disabled={loading} className="text-xs text-orange-600 font-medium flex items-center gap-1 hover:text-orange-700">
                      <RefreshCw size={11} /> Gerar mais
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {results.map((idea, idx) => (
                    <IdeaCard
                      key={idea._id}
                      idea={idea}
                      index={idx}
                      onSave={handleSave}
                      saved={savedIds.has(idea._id)}
                      onCopy={handleCopy}
                      copied={copiedId === idea._id}
                      onOpenHub={() => navigate('/ideas')}
                      isFav={isIdeaFavorited(idea)}
                      onToggleFav={() => toggleIdeaFav(idea)}
                      onDislike={(idea) => {
                        addDislike({ title: idea.title, hook: idea.hook, reason: 'desalinhado com meu tom' })
                        setResults(prev => prev.filter(r => r._id !== idea._id))
                      }}
                    />
                  ))}
                </div>

                {/* Next step navigation */}
                <div className="flex items-center gap-2 flex-wrap mt-6 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400 mr-1">{`Pr\u00f3ximo passo:`}</span>
                  <button onClick={() => navigate('/text')} className="text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all flex items-center gap-1">
                    <Wand2 size={11} /> {`Escrever conte\u00fado`}
                  </button>
                  <button onClick={() => navigate('/presentation')} className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-all flex items-center gap-1">
                    <Mic size={11} /> {`Preparar apresenta\u00e7\u00e3o`}
                  </button>
                  <button onClick={() => navigate('/create')} className="text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-all flex items-center gap-1">
                    <ArrowLeft size={11} /> Voltar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
