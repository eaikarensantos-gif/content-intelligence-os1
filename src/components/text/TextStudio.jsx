import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wand2, Copy, Check, RefreshCw,
  AlignLeft, X, Zap, Save, ExternalLink,
  Sparkles, Mic, ArrowLeft, Heart, ThumbsDown,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { buildVoiceContext, buildRegenerateInstruction } from '../../utils/voiceContext'

const LS_KEY = 'cio-anthropic-key'

const SOURCE_TYPES = [
  { id: 'article', label: 'Artigo / Blog' },
  { id: 'script', label: 'Roteiro' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'interview', label: 'Entrevista' },
  { id: 'notes', label: 'Notas Brutas' },
  { id: 'thread', label: 'Thread / Post' },
]

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-blue-100 text-blue-700 border-blue-300', activeColor: 'bg-blue-600 text-white border-blue-600' },
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-100 text-pink-700 border-pink-300', activeColor: 'bg-pink-600 text-white border-pink-600' },
  { id: 'reels', label: 'Reels', color: 'bg-purple-100 text-purple-700 border-purple-300', activeColor: 'bg-purple-600 text-white border-purple-600' },
  { id: 'stories', label: 'Stories', color: 'bg-orange-100 text-orange-700 border-orange-300', activeColor: 'bg-orange-500 text-white border-orange-500' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-gray-100 text-gray-700 border-gray-300', activeColor: 'bg-gray-800 text-white border-gray-800' },
  { id: 'twitter', label: 'Twitter / X', color: 'bg-sky-100 text-sky-700 border-sky-300', activeColor: 'bg-sky-500 text-white border-sky-500' },
  { id: 'youtube', label: 'YouTube', color: 'bg-red-100 text-red-700 border-red-300', activeColor: 'bg-red-600 text-white border-red-600' },
]

async function generateTextVersions(apiKey, { text, sourceType, platforms, niche, voiceContext, regenInstruction }) {
  const platformInstructions = {
    linkedin: `LINKEDIN POST:
- Gancho poderoso nas primeiras 2 linhas (antes do "ver mais") — ESSENCIAL
- Parágrafos curtos (1-3 linhas), bastante espaço branco
- Tom profissional mas humano, sem corporativês
- 300-600 palavras
- Encerra com UMA pergunta que provoca comentários
- 3-5 hashtags no final
- Formato: { "hook": "...", "body": "...", "cta": "...", "hashtags": [] }`,

    instagram: `INSTAGRAM CAPTION:
- Primeira linha: a frase mais forte do texto inteiro (aparece antes de "mais")
- Corpo: 2-4 parágrafos curtos, emocionais, coloquiais
- Emojis usados com critério (não mais de 5)
- CTA que convida à ação (comentar, salvar, compartilhar)
- 8-12 hashtags estratégicas no final
- Formato: { "first_line": "...", "body": "...", "cta": "...", "hashtags": [] }`,

    reels: `ROTEIRO PARA REELS (15-45 segundos):
- Hook visual (0-2s): O QUE A CÂMERA MOSTRA + o que é falado/mostrado na tela
- Falas em bullet points curtos como se você estivesse FALANDO, não escrevendo
- Ritmo rápido, cada frase completa a anterior
- CTA no final (salva, comenta, segue)
- Legenda curta para o post
- Hashtags
- Formato: { "hook": "...", "falas": ["...", "..."], "cta": "...", "legenda": "...", "hashtags": [] }`,

    stories: `SEQUÊNCIA DE STORIES (5-7 slides):
- Cada slide = 1 ideia simples, máx 15 palavras de texto
- Slide 1: Pergunta ou afirmação provocativa
- Slides 2-5: Desenvolvimento, 1 insight por slide
- Slide final: CTA (responda, arraste pra cima, comente)
- Inclui sugestão de figurinha/enquete quando fizer sentido
- Formato: { "slides": [{ "texto": "...", "visual_hint": "...", "sticker": "..." }] }`,

    tiktok: `ROTEIRO TIKTOK (30-60 segundos):
- Hook nos primeiros 3 segundos: frase que interrompe o scroll (pode ser uma pergunta absurda ou afirmação polêmica)
- Desenvolvimento: 3-4 pontos em linguagem falada, rápida, com gírias naturais
- Virada surpreendente ou informação que ninguém esperava
- CTA final nativo do TikTok ("segue pra mais", "comenta X se você concorda")
- Tom: como se você estivesse conversando com um amigo próximo
- Formato: { "hook": "...", "desenvolvimento": ["...", "..."], "virada": "...", "cta": "...", "legenda": "..." }`,

    twitter: `THREAD TWITTER/X:
- Tweet 1: O gancho mais forte — afirmação, dado ou insight provocativo (máx 280 chars)
- Tweets 2-6: Desenvolvimento natural, cada um se sustentando sozinho
- Tweet final: Síntese ou convite à conversa
- Também forneça versão como tweet único (máx 280 chars) para quem não quer fazer thread
- Formato: { "single_tweet": "...", "thread": ["tweet1", "tweet2", ...] }`,

    youtube: `YOUTUBE:
- 3 sugestões de título (SEO + curiosidade)
- Descrição otimizada: 150-300 palavras, inclui a ideia central e palavras-chave naturais
- Primeiros 2 parágrafos da descrição são cruciais (aparecem sem expandir)
- Sugestão de capítulos com timestamps estimados
- Tags relevantes
- Formato: { "titles": ["...", "...", "..."], "description": "...", "chapters": [{ "time": "0:00", "label": "..." }], "tags": [] }`,
  }

  const selectedInstructions = platforms.map(p => platformInstructions[p]).filter(Boolean).join('\n\n')

  const prompt = `Você é um especialista em repurposing de conteúdo para criadores digitais brasileiros. Você sabe exatamente como cada rede social funciona e o que performa em cada uma. Seu estilo é observacional, reflexivo e autenticamente humano.

TEXTO ORIGINAL (tipo: ${SOURCE_TYPES.find(s => s.id === sourceType)?.label || sourceType}):
---
${text.slice(0, 8000)}
---
${niche ? `\nNicho / Contexto do criador: ${niche}` : ''}

MISSÃO: Transforme o texto acima em versões otimizadas para cada plataforma abaixo. NÃO resuma — ADAPTE. Preserve a essência e os insights principais. Cada versão deve soar natural para aquela plataforma específica.

REGRAS DE ESTILO (CRÍTICO — SIGA EXATAMENTE):
PROIBIDO (nunca use estas frases ou variações delas):
- "isso vai mudar tudo"
- "o erro que 90% das pessoas cometem"
- "ninguém te conta isso"
- "a verdade é que"
- "o segredo de..."
- "X dicas para..."
- Listas genéricas sem substância, linguagem corporativa, emojis em excesso
- Conteúdo genérico que qualquer pessoa poderia escrever
- Palestra motivacional, clickbait ou marketing genérico

PREFERIDO (use este estilo de linguagem):
- "Tenho notado uma coisa curiosa..."
- "Depois de um tempo você percebe..."
- "Talvez o problema não seja..."
- "Existe um padrão que pouca gente observa..."
- "O que me incomoda nessa conversa é..."

OBRIGATÓRIO: Conteúdo que soa como um ser humano de verdade escreveu, com opinião, personalidade, tom reflexivo e insights reais do texto original. Linguagem observacional e conversacional em português brasileiro natural.

${selectedInstructions}

${voiceContext || ''}${regenInstruction || ''}
Responda SOMENTE com um JSON válido neste formato:
{
  "core_message": "a mensagem central mais poderosa em 1 frase",
  "versions": {
    ${platforms.map(p => `"${p}": { /* formato específico de cada plataforma acima */ }`).join(',\n    ')}
  }
}`

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
      max_tokens: 8000,
      system: 'You are a sharp Brazilian content repurposing expert. Write in natural, conversational Brazilian Portuguese. Your DEFAULT energy is curiosity, wit, and genuine enthusiasm — never melancholic, pessimistic, or defeatist. Adapt tone to the goal: brand content = enthusiastic and genuine, reflective = curious and intelligent, educational = clear and practical. NEVER use clickbait like "isso vai mudar tudo". PREFER energizing language: "A parte boa é que...", "Isso me surpreendeu...", "O mais interessante aqui é...". Always respond with valid JSON only — no markdown, no explanations. Start with { and end with }.',
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

// ─── Platform output renderers ────────────────────────────────────────────────
function LinkedInOutput({ data }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide mb-2">Gancho (antes do "ver mais")</p>
        <p className="text-sm font-semibold text-gray-900 leading-snug">{data.hook}</p>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Corpo</p>
        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.body}</p>
      </div>
      {data.cta && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">CTA</p>
          <p className="text-xs text-gray-600 italic">{data.cta}</p>
        </div>
      )}
      {data.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.hashtags.map((h, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">{h.startsWith('#') ? h : `#${h}`}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function InstagramOutput({ data }) {
  return (
    <div className="space-y-4">
      <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
        <p className="text-[10px] text-pink-500 font-semibold uppercase tracking-wide mb-2">Primeira linha (gancho visual)</p>
        <p className="text-sm font-semibold text-gray-900">{data.first_line}</p>
      </div>
      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.body}</p>
      {data.cta && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">CTA</p>
          <p className="text-xs text-gray-600">{data.cta}</p>
        </div>
      )}
      {data.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.hashtags.map((h, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200">{h.startsWith('#') ? h : `#${h}`}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function ReelsOutput({ data }) {
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
        <p className="text-[10px] text-purple-600 font-semibold uppercase tracking-wide mb-2">🎬 Hook (0-2s) — O que câmera mostra + fala</p>
        <p className="text-sm font-semibold text-gray-900">{data.hook}</p>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Falas</p>
        {(data.falas || []).map((fala, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i+1}</span>
            <p className="text-xs text-gray-700">{fala}</p>
          </div>
        ))}
      </div>
      {data.cta && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
          <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wide mb-1">CTA Final</p>
          <p className="text-xs text-gray-700">{data.cta}</p>
        </div>
      )}
      {data.legenda && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Legenda do Post</p>
          <p className="text-xs text-gray-600">{data.legenda}</p>
        </div>
      )}
      {data.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.hashtags.map((h, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">{h.startsWith('#') ? h : `#${h}`}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function StoriesOutput({ data }) {
  return (
    <div className="space-y-3">
      {(data.slides || []).map((slide, i) => (
        <div key={i} className={`rounded-xl p-4 border ${i === 0 ? 'bg-orange-50 border-orange-100' : i === (data.slides.length - 1) ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-orange-500 text-white' : i === (data.slides.length - 1) ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{i+1}</span>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
              {i === 0 ? 'Slide de Abertura' : i === (data.slides.length - 1) ? 'Slide de CTA' : `Slide ${i+1}`}
            </p>
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-2">{slide.texto}</p>
          {slide.visual_hint && <p className="text-[11px] text-gray-400 italic">💡 Visual: {slide.visual_hint}</p>}
          {slide.sticker && <p className="text-[11px] text-orange-500">🎯 Sticker: {slide.sticker}</p>}
        </div>
      ))}
    </div>
  )
}

function TikTokOutput({ data }) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">⚡ Hook (0-3s) — Interrompe o scroll</p>
        <p className="text-sm font-semibold text-white">{data.hook}</p>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Desenvolvimento</p>
        {(data.desenvolvimento || []).map((item, i) => (
          <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
            <p className="text-xs text-gray-700">{item}</p>
          </div>
        ))}
      </div>
      {data.virada && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
          <p className="text-[10px] text-yellow-600 font-semibold uppercase tracking-wide mb-2">🔄 Virada surpreendente</p>
          <p className="text-xs text-gray-800 font-medium">{data.virada}</p>
        </div>
      )}
      {data.cta && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">CTA</p>
          <p className="text-xs text-gray-600">{data.cta}</p>
        </div>
      )}
    </div>
  )
}

function TwitterOutput({ data }) {
  return (
    <div className="space-y-4">
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
        <p className="text-[10px] text-sky-600 font-semibold uppercase tracking-wide mb-2">Tweet único</p>
        <p className="text-sm text-gray-900 font-medium leading-snug">{data.single_tweet}</p>
        <p className="text-[10px] text-gray-400 mt-2">{data.single_tweet?.length || 0}/280 chars</p>
      </div>
      {data.thread?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Thread</p>
          {data.thread.map((tweet, i) => (
            <div key={i} className="flex gap-3 items-start p-3 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="text-[11px] font-bold text-sky-500 shrink-0">{i+1}/</span>
              <p className="text-xs text-gray-700 leading-relaxed">{tweet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function YouTubeOutput({ data }) {
  return (
    <div className="space-y-4">
      {data.titles?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Sugestões de Título</p>
          {data.titles.map((title, i) => (
            <div key={i} className="flex gap-2 items-center p-3 bg-red-50 border border-red-100 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
              <p className="text-xs text-gray-800 font-medium">{title}</p>
            </div>
          ))}
        </div>
      )}
      {data.description && (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Descrição</p>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{data.description}</p>
          </div>
        </div>
      )}
      {data.chapters?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Capítulos (Timestamps)</p>
          {data.chapters.map((ch, i) => (
            <div key={i} className="flex gap-3 items-center">
              <span className="text-[11px] font-bold text-red-500 font-mono">{ch.time}</span>
              <span className="text-xs text-gray-600">{ch.label}</span>
            </div>
          ))}
        </div>
      )}
      {data.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((tag, i) => (
            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}

const OUTPUT_COMPONENTS = {
  linkedin: LinkedInOutput,
  instagram: InstagramOutput,
  reels: ReelsOutput,
  stories: StoriesOutput,
  tiktok: TikTokOutput,
  twitter: TwitterOutput,
  youtube: YouTubeOutput,
}

function buildCopyText(platform, data) {
  if (!data) return ''
  if (platform === 'linkedin') return [data.hook, '', data.body, '', data.cta, '', (data.hashtags || []).join(' ')].filter(x => x !== undefined).join('\n')
  if (platform === 'instagram') return [data.first_line, '', data.body, '', data.cta, '', (data.hashtags || []).join(' ')].join('\n')
  if (platform === 'reels') return [data.hook, '', ...(data.falas || []), '', data.cta, '', data.legenda].filter(Boolean).join('\n')
  if (platform === 'stories') return (data.slides || []).map((s, i) => `Slide ${i+1}: ${s.texto}`).join('\n')
  if (platform === 'tiktok') return [data.hook, '', ...(data.desenvolvimento || []), '', data.virada, '', data.cta].filter(Boolean).join('\n')
  if (platform === 'twitter') return data.thread ? data.thread.join('\n---\n') : data.single_tweet
  if (platform === 'youtube') return [data.titles?.[0], '', data.description, '', (data.chapters || []).map(c => `${c.time} ${c.label}`).join('\n')].filter(Boolean).join('\n')
  return JSON.stringify(data, null, 2)
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TextStudio() {
  const { addIdea, addFavorite, removeFavorite, favorites, brandVoice, dislikedContent, addDislike } = useStore()
  const bannedWords = useStore(s => s.bannedWords) || []
  const navigate = useNavigate()
  const [apiKey] = useState(() => localStorage.getItem(LS_KEY) || '')

  const [text, setText] = useState('')
  const [niche, setNiche] = useState('')
  const [sourceType, setSourceType] = useState('article')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['linkedin', 'instagram', 'reels'])
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState(null)
  const [copied, setCopied] = useState(null)
  const [error, setError] = useState('')
  const [savedVersions, setSavedVersions] = useState(new Set())
  const [regenAttempt, setRegenAttempt] = useState(0)

  const textRef = useRef(null)

  const autoResize = useCallback((el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 400) + 'px'
  }, [])

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleGenerate = async () => {
    if (!text.trim() || text.trim().length < 50) {
      setError('Cole um texto com pelo menos 50 caracteres.')
      return
    }
    if (!apiKey) {
      setError('Adicione sua chave da API Anthropic nas configurações.')
      return
    }
    if (selectedPlatforms.length === 0) {
      setError('Selecione ao menos uma plataforma.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    const msgs = [
      'Lendo e compreendendo o texto...',
      'Extraindo a mensagem central...',
      'Adaptando para cada plataforma...',
      'Ajustando tom e linguagem...',
      'Finalizando versões...',
    ]
    let i = 0
    setLoadingMsg(msgs[0])
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length
      setLoadingMsg(msgs[i])
    }, 2000)

    const voiceCtx = buildVoiceContext(brandVoice, dislikedContent, bannedWords)
    const regenInstruction = regenAttempt > 0 ? buildRegenerateInstruction(regenAttempt) : ''

    try {
      const data = await generateTextVersions(apiKey, {
        text, sourceType, platforms: selectedPlatforms, niche,
        voiceContext: voiceCtx, regenInstruction,
      })
      setResult(data)
      setActiveTab(selectedPlatforms[0])
      setRegenAttempt(c => c + 1)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  const handleCopy = (platform) => {
    const data = result?.versions?.[platform]
    if (!data) return
    navigator.clipboard.writeText(buildCopyText(platform, data))
    setCopied(platform)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSaveToHub = (platform) => {
    const data = result?.versions?.[platform]
    if (!data) return
    const platformMeta = PLATFORMS.find(p => p.id === platform)
    addIdea({
      title: data.titles?.[0] || data.hook || data.first_line || `Versão ${platformMeta?.label} — ${niche || sourceType}`,
      description: buildCopyText(platform, data),
      platform: platform === 'reels' || platform === 'stories' ? 'instagram' : platform === 'tiktok' ? 'tiktok' : platform,
      platforms: [platform === 'reels' || platform === 'stories' ? 'instagram' : platform === 'tiktok' ? 'tiktok' : platform],
      format: platform === 'reels' ? 'reel' : platform === 'stories' ? 'story' : platform === 'twitter' ? 'thread' : platform === 'youtube' ? 'video' : platform === 'linkedin' ? 'artigo' : 'carrossel',
      tags: ['text-studio', sourceType, platform],
      priority: 'medium',
      status: 'draft',
      source: 'Text Studio',
    })
    setSavedVersions(prev => new Set([...prev, platform]))
  }

  const isTextFavorited = (platform) => {
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform
    return favorites.some(f => f.type === 'text' && f.title === `${platformLabel} - ${niche || sourceType}`)
  }
  const toggleTextFav = (platform) => {
    const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform
    const title = `${platformLabel} - ${niche || sourceType}`
    const existing = favorites.find(f => f.type === 'text' && f.title === title)
    if (existing) {
      removeFavorite(existing.id)
    } else {
      const data = result?.versions?.[platform]
      addFavorite({ type: 'text', title, content: buildCopyText(platform, data), source: 'Text Studio' })
    }
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Wand2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Text Studio</h1>
              <p className="text-xs text-gray-400 mt-0.5">Cole qualquer texto e gere versões otimizadas para cada plataforma</p>
            </div>
          </div>
          {result && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-600 font-medium px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                ✦ {selectedPlatforms.length} versões geradas
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Input Section */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlignLeft size={14} className="text-violet-500" />
            <p className="text-sm font-semibold text-gray-800">Texto Original</p>
            {wordCount > 0 && (
              <span className="text-[11px] text-gray-400 ml-auto">{wordCount} palavras</span>
            )}
          </div>

          <textarea
            ref={textRef}
            className="input resize-none"
            style={{ minHeight: '160px', maxHeight: '400px' }}
            placeholder="Cole aqui seu artigo, roteiro, newsletter, entrevista ou qualquer texto que você queira adaptar para múltiplas plataformas..."
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              autoResize(e.target)
            }}
          />

          {/* Source type + niche */}
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 sm:max-w-[200px]">
              <p className="text-[11px] text-gray-400 font-medium mb-1.5 uppercase tracking-wide">Tipo de conteúdo</p>
              <select
                className="select text-xs w-full"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              >
                {SOURCE_TYPES.map(({ id, label }) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 sm:max-w-[200px]">
              <p className="text-[11px] text-gray-400 font-medium mb-1.5 uppercase tracking-wide">Nicho (opcional)</p>
              <input
                className="input text-xs"
                placeholder="ex: Marketing, IA, Finanças..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
          </div>

          {/* Platform selection */}
          <div>
            <p className="text-[11px] text-gray-400 font-medium mb-1.5 uppercase tracking-wide">Gerar versões para</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {PLATFORMS.map(({ id, label, color, activeColor }) => {
                const active = selectedPlatforms.includes(id)
                return (
                  <button
                    key={id}
                    onClick={() => togglePlatform(id)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all flex items-center gap-1 whitespace-nowrap shrink-0 ${active ? activeColor : color}`}
                  >
                    {label}
                    {active && <Check size={10} />}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 text-xs">
              <X size={13} className="shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !text.trim() || selectedPlatforms.length === 0 || !apiKey}
            className="w-full btn-primary justify-center py-3 text-sm"
            style={{ background: loading ? undefined : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
          >
            {loading ? (
              <><RefreshCw size={15} className="animate-spin" /> {loadingMsg}</>
            ) : (
              <><Wand2 size={15} /> Transformar Texto</>
            )}
          </button>

          {!apiKey && (
            <p className="text-center text-[11px] text-amber-600">
              Configure sua chave Anthropic API nas configurações do Analisador de Vídeo para usar este recurso.
            </p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4 animate-slide-up">
            {/* Core message */}
            {result.core_message && (
              <div className="card p-4 border border-violet-200 bg-violet-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={13} className="text-violet-500" />
                  <p className="text-[11px] font-semibold text-violet-700 uppercase tracking-wide">Mensagem Central</p>
                </div>
                <p className="text-sm font-medium text-gray-900">{result.core_message}</p>
              </div>
            )}

            {/* Platform tabs */}
            <div className="card overflow-hidden">
              <div className="border-b border-gray-100 overflow-x-auto">
                <div className="flex min-w-max">
                  {selectedPlatforms.map(pid => {
                    const meta = PLATFORMS.find(p => p.id === pid)
                    const isActive = activeTab === pid
                    return (
                      <button
                        key={pid}
                        onClick={() => setActiveTab(pid)}
                        className={`px-4 py-3 text-xs font-medium transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                          isActive
                            ? 'border-violet-500 text-violet-700 bg-violet-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {meta?.label}
                        {savedVersions.has(pid) && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Active platform content */}
              {activeTab && result.versions?.[activeTab] && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      {PLATFORMS.find(p => p.id === activeTab)?.label}
                    </p>
                    <div className="flex items-center gap-2">
                      {savedVersions.has(activeTab) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                            <Check size={11} /> Salvo no Hub
                          </span>
                          <button
                            onClick={() => navigate('/ideas')}
                            className="text-[11px] text-orange-600 font-medium flex items-center gap-1 px-2 py-1 hover:bg-orange-50 rounded-lg transition-colors"
                          >
                            Abrir no Hub <ExternalLink size={9} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSaveToHub(activeTab)}
                          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 transition-all"
                        >
                          <Save size={12} /> Salvar no Hub
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(activeTab)}
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 transition-all"
                      >
                        {copied === activeTab ? <><Check size={12} className="text-emerald-500" /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                      </button>
                      <button
                        onClick={() => toggleTextFav(activeTab)}
                        className={`p-1.5 rounded-lg transition-colors ${isTextFavorited(activeTab) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        title={isTextFavorited(activeTab) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        <Heart size={14} className={isTextFavorited(activeTab) ? 'fill-current' : ''} />
                      </button>
                      <button
                        onClick={() => {
                          const data = result?.versions?.[activeTab]
                          addDislike({ title: result.core_message || 'Texto', hook: data?.hook || data?.first_line || '', reason: 'desalinhado com meu tom' })
                          const newVersions = { ...result.versions }
                          delete newVersions[activeTab]
                          const remaining = Object.keys(newVersions)
                          if (remaining.length > 0) {
                            setResult({ ...result, versions: newVersions })
                            setActiveTab(remaining[0])
                          } else {
                            setResult(null)
                          }
                        }}
                        className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-orange-500"
                        title="Não gostei desta versão"
                      >
                        <ThumbsDown size={14} />
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const Component = OUTPUT_COMPONENTS[activeTab]
                    return Component ? <Component data={result.versions[activeTab]} /> : (
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(result.versions[activeTab], null, 2)}</pre>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Quick copy all */}
            <div className="flex flex-wrap gap-2">
              {selectedPlatforms.map(pid => {
                const meta = PLATFORMS.find(p => p.id === pid)
                return (
                  <button
                    key={pid}
                    onClick={() => { setActiveTab(pid); handleCopy(pid) }}
                    className={`text-[11px] px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      copied === pid ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {copied === pid ? <Check size={10} /> : <Copy size={10} />}
                    {meta?.label}
                  </button>
                )
              })}
            </div>

            {/* Next step navigation */}
            <div className="flex items-center gap-2 flex-wrap mt-6 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400 mr-1">{`Pr\u00f3ximo passo:`}</span>
              <button onClick={() => navigate('/presentation')} className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-all flex items-center gap-1">
                <Mic size={11} /> {`Preparar apresenta\u00e7\u00e3o`}
              </button>
              <button onClick={() => navigate('/generate')} className="text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition-all flex items-center gap-1">
                <Sparkles size={11} /> Explorar ideias
              </button>
              <button onClick={() => navigate('/create')} className="text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-all flex items-center gap-1">
                <ArrowLeft size={11} /> Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
