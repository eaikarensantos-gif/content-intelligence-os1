import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain, Sparkles, Copy, Check, Plus, Trash2,
  Clock, Layers, Video, AlignLeft, BookOpen, Zap,
  RefreshCw, LayoutGrid, Mic, Instagram, Music2,
  Play, Repeat2, MessageCircle, Heart, ChevronRight,
  Film, Smartphone, ExternalLink, Quote, Target,
  Wand2, ArrowLeft,
} from 'lucide-react'
import useStore from '../../store/useStore'

// ─── Claude call ─────────────────────────────────────────────────────────────
async function captureThought(apiKey, { thought, niche, tone }) {
  const toneInstruction = {
    reflexivo:   'Tom suave, introspectivo e pessoal.',
    provocador:  'Tom que questiona o status quo, que incomoda no bom sentido.',
    íntimo:      'Tom de confissão, diário, como se fosse escrito às 2 da manhã.',
    analítico:   'Tom racional e perspicaz, mas ainda humano e não acadêmico.',
    humor:       'Tom leve, espirituoso e com sacadas inteligentes — humor que conecta sem forçar.',
  }[tone] || ''

  const prompt = `Você é um ghostwriter especialista em conteúdo autêntico para criadores digitais brasileiros. Você conhece profundamente o que performa bem em cada plataforma. Seu estilo é observacional, reflexivo e humano — como alguém que realmente pensa antes de escrever.

O criador teve este pensamento bruto:
"${thought}"

${niche ? `Contexto / nicho: ${niche}` : ''}
${toneInstruction}

Transforme este pensamento em 7 formatos distintos de conteúdo, cada um adaptado para performar melhor na sua plataforma/contexto.

REGRAS DE ESTILO (CRÍTICO — SIGA EXATAMENTE):
PROIBIDO (nunca use estas frases ou variações delas):
- "isso vai mudar tudo"
- "o erro que 90% das pessoas cometem"
- "ninguém te conta isso"
- "a verdade é que"
- "o segredo de..."
- "X dicas para..."
- "Como fazer em 5 passos"
- Qualquer linguagem de palestra motivacional, clickbait ou marketing genérico

PREFERIDO (use este estilo de linguagem):
- "Tenho notado uma coisa curiosa..."
- "Depois de um tempo você percebe..."
- "Talvez o problema não seja..."
- "Existe um padrão que pouca gente observa..."
- "O que me incomoda nessa conversa é..."

PRINCÍPIOS ABSOLUTOS:
- Conteúdo humano, conversacional e reflexivo
- Cada formato deve girar em torno de UMA ideia central bem desenvolvida
- Idioma: português brasileiro coloquial mas cuidadoso
- Tom observacional — como alguém que está compartilhando uma reflexão genuína

─────────────────────────────────────────────────────
FORMATO 1 — POST REFLEXIVO (LinkedIn / Instagram feed)
- 200-400 palavras em parágrafos corridos (zero bullets)
- Uma ideia que se desenvolve naturalmente
- A última frase ecoa na mente do leitor

FORMATO 2 — ROTEIRO DE VÍDEO LONGO (YouTube / Podcast)
- Hook: 1 frase que prende nos primeiros 3 segundos
- 3 pontos de desenvolvimento em linguagem falada natural
- Encerramento que convida à reflexão, não à compra
- Estimativa: 3-6 min

FORMATO 3 — CARROSSEL (Instagram / LinkedIn)
- Slide 1: Afirmação ou pergunta que causa pausa (NUNCA "X dicas...")
- 4 slides de desenvolvimento: headline provocativo + 1-2 frases cada
- Slide final: O insight que o leitor vai salvar

FORMATO 4 — ARCO NARRATIVO (Storytelling universal)
- Situação → Tensão → Virada → Resolução

─────────────────────────────────────────────────────
FRASES VIRAIS (NOVO — CRÍTICO):
A partir do insight central do pensamento, gere 5-8 frases curtas e impactantes.
Essas frases devem funcionar como ganchos, legendas ou frases-chave em vídeos.

TIPOS DE FRASE (inclua uma mistura):
1. Observacional — "Tem uma coisa estranha acontecendo com..."
2. Contradição — "Nunca foi tão fácil X. E nunca foi tão difícil Y."
3. Insight direto — "O problema não é falta de X. É excesso de Y."
4. Reflexiva — "Talvez a gente esteja fazendo X... quando deveria estar fazendo Y."

Cada frase deve: soar natural e humana, ser concisa e memorável, evitar clichês de IA, evitar tom dramático ou agressivo, parecer algo que um criador real diria.

Depois, selecione as 2-3 frases mais fortes e adapte como hooks para: vídeo, post escrito e conteúdo curto (reels/stories).

─────────────────────────────────────────────────────
FORMATO 5 — ROTEIRO PARA REELS (Instagram Reels, 15-60 seg)
Otimize para: loop, saves e compartilhamentos.
O Reels performa quando tem loop natural, texto na tela complementando a fala, ritmo rápido e a ideia completa em <30 segundos.
- Hook visual: o que o usuário VÊ nos primeiros 2 segundos (texto na tela, ação, expressão)
- Hook falado: a frase exata que abre o vídeo (para o scroll em 2s)
- Batidas de conteúdo: 3 beats rápidos (o que falar/mostrar + duração em seg cada)
- Elemento de loop: como o final puxa de volta ao início para causar replay
- Texto na tela: a frase principal que aparece em sobreposição durante o vídeo
- Estratégia de áudio: voz original, som trending + voz, ou só voz
- CTA final: o que pedir (salvar, compartilhar, comentar "X")
- Duração sugerida: X-Y segundos

FORMATO 6 — SEQUÊNCIA DE STORIES (Instagram Stories, 5-7 slides)
Otimize para: tap-through rate, respostas e conversas.
Stories performam com sequência de curiosidade (cada slide deixa uma pergunta), elemento interativo no meio e CTA claro no último.
- Slide de abertura: o que faz a pessoa NÃO pular (afirmação provocativa ou pergunta)
- Sequência de slides: 5-7 slides, cada um com: conteúdo + elemento interativo (enquete/pergunta/nenhum) + propósito
- Elemento interativo recomendado: qual usar, onde colocar e por que
- Slide de fechamento: CTA direto (responder, salvar, DM)

FORMATO 7 — ROTEIRO TIKTOK (TikTok, 15-60 seg)
Otimize para: replays, comentários e duet/stitch.
TikTok performa quando os primeiros 2 segundos são absurdamente específicos, há um elemento surpresa no meio, e o final provoca comentários ou replay.
- Hook (linha exata): as primeiras palavras — específica e inesperada, não genérica
- Hook visual: o que o usuário VÊ na tela nos primeiros 2 segundos
- Interrupção de padrão: o elemento surpresa/inesperado que faz continuar assistindo (aparece em ~5s)
- Beats de conteúdo: 3-4 beats com a técnica de retenção que cada um usa
- Momento de loop: a cena ou frase que incentiva assistir de novo
- Estratégia de som: som trending + voz, voz original, texto sem fala
- Isca de comentário: pergunta ou afirmação que PROVOCA comentários (não genérica)
- Duração sugerida: X-Y segundos

─────────────────────────────────────────────────────
Responda APENAS com JSON válido, sem texto antes ou depois:
{
  "core_insight": "a essência do pensamento em 1 frase poderosa",
  "emotional_angle": "emoção central ativada (ex: alívio, reconhecimento, curiosidade, tensão saudável)",
  "reflection_post": {
    "text": "post completo com parágrafos naturais, sem bullets",
    "opening_line": "primeira frase exata",
    "closing_line": "última frase/pergunta exata",
    "suggested_platform": "LinkedIn ou Instagram"
  },
  "video_talking_point": {
    "hook": "frase exata de abertura",
    "talking_points": [
      "primeiro ponto em linguagem falada natural",
      "segundo ponto em linguagem falada natural",
      "terceiro ponto em linguagem falada natural"
    ],
    "closing": "encerramento natural",
    "estimated_duration": "4-5 min",
    "suggested_platform": "YouTube ou Podcast"
  },
  "carousel": {
    "slide_1": "afirmação ou pergunta do primeiro slide",
    "slides": [
      { "headline": "headline provocativo", "body": "1-2 frases" },
      { "headline": "headline provocativo", "body": "1-2 frases" },
      { "headline": "headline provocativo", "body": "1-2 frases" },
      { "headline": "headline provocativo", "body": "1-2 frases" }
    ],
    "final_slide": "insight central que o leitor vai salvar"
  },
  "storytelling": {
    "situation": "o cenário que todo mundo reconhece",
    "tension": "o conflito que raramente é nomeado",
    "turning_point": "o momento de insight ou mudança de perspectiva",
    "resolution": "o que fica — a conclusão que ressoa"
  },
  "reel_script": {
    "hook_visual": "o que o usuário vê na tela nos primeiros 2 segundos",
    "hook_spoken": "a frase exata que abre o vídeo",
    "beats": [
      { "content": "o que falar/mostrar", "duration_sec": 8 },
      { "content": "o que falar/mostrar", "duration_sec": 8 },
      { "content": "o que falar/mostrar", "duration_sec": 7 }
    ],
    "loop_element": "como o final volta ao início para causar replay",
    "text_overlay": "a frase principal em sobreposição visual durante o vídeo",
    "audio_strategy": "voz original / som trending + voz / narração com música",
    "cta": "salvar / comentar 'X' / compartilhar — texto exato do CTA",
    "suggested_duration_sec": 30
  },
  "stories_sequence": {
    "opening_slide": "o primeiro slide que faz a pessoa não pular",
    "slides": [
      { "number": 1, "content": "conteúdo do slide", "interactive": "nenhum/enquete/pergunta/quiz", "purpose": "gancho" },
      { "number": 2, "content": "conteúdo do slide", "interactive": "nenhum/enquete/pergunta/quiz", "purpose": "desenvolvimento" },
      { "number": 3, "content": "conteúdo do slide", "interactive": "enquete", "purpose": "engajamento" },
      { "number": 4, "content": "conteúdo do slide", "interactive": "nenhum", "purpose": "desenvolvimento" },
      { "number": 5, "content": "conteúdo do slide", "interactive": "pergunta", "purpose": "revelação" },
      { "number": 6, "content": "conteúdo do slide", "interactive": "nenhum", "purpose": "cta" }
    ],
    "interactive_tip": "qual elemento interativo usar, onde colocar e por que aumenta respostas",
    "closing_cta": "o que pedir no último slide (responder, DM, salvar)"
  },
  "tiktok_script": {
    "hook_line": "as primeiras palavras exatas — específica e inesperada",
    "hook_visual": "o que o usuário vê nos primeiros 2 segundos",
    "pattern_interrupt": "o elemento surpresa em ~5s que faz continuar assistindo",
    "beats": [
      { "content": "o que falar/mostrar", "retention_technique": "técnica de retenção usada" },
      { "content": "o que falar/mostrar", "retention_technique": "técnica de retenção usada" },
      { "content": "o que falar/mostrar", "retention_technique": "técnica de retenção usada" }
    ],
    "loop_moment": "a cena ou frase que incentiva assistir de novo",
    "sound_strategy": "som trending + voz / voz original / narração sem rosto",
    "comment_bait": "pergunta ou afirmação que provoca comentários (específica, não genérica)",
    "suggested_duration_sec": 30
  },
  "viral_phrases": {
    "analysis": {
      "main_observation": "a observação principal do pensamento",
      "underlying_tension": "a tensão implícita que torna interessante",
      "implicit_insight": "o insight que a maioria não percebe"
    },
    "phrases": [
      { "text": "frase viral 1", "type": "observacional|contradição|insight|reflexiva" },
      { "text": "frase viral 2", "type": "observacional|contradição|insight|reflexiva" },
      { "text": "frase viral 3", "type": "observacional|contradição|insight|reflexiva" },
      { "text": "frase viral 4", "type": "observacional|contradição|insight|reflexiva" },
      { "text": "frase viral 5", "type": "observacional|contradição|insight|reflexiva" },
      { "text": "frase viral 6", "type": "observacional|contradição|insight|reflexiva" }
    ],
    "top_hooks": [
      { "phrase": "a frase mais forte adaptada para vídeo", "format": "video", "context": "como usar: abertura de vídeo, primeiros 3 segundos" },
      { "phrase": "a frase mais forte adaptada para post escrito", "format": "post", "context": "como usar: primeira linha do post, antes do ver mais" },
      { "phrase": "a frase mais forte adaptada para conteúdo curto", "format": "short", "context": "como usar: texto na tela do reels/stories/tiktok" }
    ],
    "suggested_formats": ["carrossel de frases", "reels com texto na tela", "post reflexivo"]
  },
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "save_as_idea": {
    "title": "título para salvar no Hub de Ideias",
    "description": "descrição do conceito em 1-2 frases",
    "platform": "plataforma principal",
    "format": "formato principal"
  }
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
      system: 'You are a sharp, curious Brazilian content creator. Your DEFAULT energy is curiosity, wit, and genuine enthusiasm — never melancholic, pessimistic, or defeatist. You can be reflective but always land on something constructive, interesting, or energizing. For brand content: enthusiastic and genuine. For reflective content: curious and intelligent. NEVER default to sad or heavy tone. Respond ONLY with valid JSON — no markdown, no code blocks.',
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
  if (!match) throw new Error('Resposta inválida da API')
  const sanitized = match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
  return JSON.parse(sanitized)
}

// ─── Loading phases ───────────────────────────────────────────────────────────
const PHASES = [
  { label: 'Capturando a essência...', icon: Brain, color: 'text-indigo-500' },
  { label: 'Gerando frases virais...', icon: Quote, color: 'text-orange-500' },
  { label: 'Estruturando os formatos...', icon: Layers, color: 'text-violet-500' },
  { label: 'Adaptando para cada plataforma...', icon: Smartphone, color: 'text-pink-500' },
  { label: 'Refinando o tom...', icon: Sparkles, color: 'text-purple-500' },
]

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  indigo:  { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'text-indigo-500', border: 'border-indigo-100', header: 'bg-indigo-50/60', btn: 'bg-indigo-500 hover:bg-indigo-600 text-white' },
  violet:  { badge: 'bg-violet-50 text-violet-700 border-violet-200', icon: 'text-violet-500', border: 'border-violet-100', header: 'bg-violet-50/60', btn: 'bg-violet-500 hover:bg-violet-600 text-white' },
  purple:  { badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'text-purple-500', border: 'border-purple-100', header: 'bg-purple-50/60', btn: 'bg-purple-500 hover:bg-purple-600 text-white' },
  fuchsia: { badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', icon: 'text-fuchsia-500', border: 'border-fuchsia-100', header: 'bg-fuchsia-50/60', btn: 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white' },
  rose:    { badge: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'text-rose-500', border: 'border-rose-100', header: 'bg-rose-50/60', btn: 'bg-rose-500 hover:bg-rose-600 text-white' },
  pink:    { badge: 'bg-pink-50 text-pink-700 border-pink-200', icon: 'text-pink-500', border: 'border-pink-100', header: 'bg-pink-50/60', btn: 'bg-pink-500 hover:bg-pink-600 text-white' },
  zinc:    { badge: 'bg-zinc-100 text-zinc-700 border-zinc-300', icon: 'text-zinc-600', border: 'border-zinc-200', header: 'bg-zinc-50', btn: 'bg-zinc-800 hover:bg-zinc-900 text-white' },
}

// ─── Clipboard hook ───────────────────────────────────────────────────────────
function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null)
  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }
  return { copiedKey, copy }
}

// ─── Favorite button ─────────────────────────────────────────────────────────
function FavBtn({ isFav, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`p-1.5 rounded-lg transition-colors ${isFav ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
      title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <Heart size={13} className={isFav ? 'fill-current' : ''} />
    </button>
  )
}

// ─── Save button ──────────────────────────────────────────────────────────────
function SaveBtn({ saved, onClick, color, onOpenHub }) {
  const c = COLOR_MAP[color]
  return saved ? (
    <div className="flex items-center gap-2 w-full">
      <span className="flex-1 text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200">
        <Check size={12} /> Salvo no Hub
      </span>
      <button
        onClick={onOpenHub}
        className="text-[10px] font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 shrink-0 px-2 py-2 rounded-lg hover:bg-orange-50 transition-colors"
      >
        Abrir no Hub <ExternalLink size={9} />
      </button>
    </div>
  ) : (
    <button
      onClick={onClick}
      className={`w-full text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${c.btn}`}
    >
      <Plus size={12} /> Salvar no Hub de Ideias
    </button>
  )
}

// ─── Format 1: Reflection Post ────────────────────────────────────────────────
function ReflectionCard({ data, onSave, saved, onOpenHub, isFav, onToggleFav }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.indigo
  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-3.5 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <AlignLeft size={14} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Post Reflexivo</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>{data.suggested_platform}</span>
        </div>
        <div className="flex items-center gap-1">
          <FavBtn isFav={isFav} onToggle={onToggleFav} />
          <button onClick={() => copy(data.text, 'post')} className="btn-secondary text-xs py-1 px-2.5">
            {copiedKey === 'post' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className={`rounded-xl p-3 border ${c.border} bg-indigo-50/30`}>
          <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wide mb-1">Abertura</p>
          <p className="text-xs text-gray-700 italic">"{data.opening_line}"</p>
        </div>
        <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{data.text}</p>
        <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Encerramento</p>
          <p className="text-xs text-gray-600 italic">"{data.closing_line}"</p>
        </div>
        <SaveBtn saved={saved} onClick={onSave} color="indigo" onOpenHub={onOpenHub} />
      </div>
    </div>
  )
}

// ─── Format 2: Video Talking Point ───────────────────────────────────────────
function VideoCard({ data, onSave, saved, onOpenHub, isFav, onToggleFav }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.violet
  const script = [`HOOK: ${data.hook}`, '', ...(data.talking_points || []).map((p, i) => `${i + 1}. ${p}`), '', `ENCERRAMENTO: ${data.closing}`].join('\n')
  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-3.5 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <Video size={14} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Roteiro de Vídeo</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>{data.suggested_platform}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{data.estimated_duration}</span>
        </div>
        <div className="flex items-center gap-1">
          <FavBtn isFav={isFav} onToggle={onToggleFav} />
          <button onClick={() => copy(script, 'video')} className="btn-secondary text-xs py-1 px-2.5">
            {copiedKey === 'video' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="rounded-xl p-3.5 bg-violet-50 border border-violet-200">
          <p className="text-[10px] text-violet-500 font-bold uppercase tracking-wide mb-1.5">🎙 Hook de abertura</p>
          <p className="text-sm font-semibold text-gray-800">"{data.hook}"</p>
        </div>
        <div className="space-y-2">
          {(data.talking_points || []).map((p, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-600 shrink-0 mt-0.5">{i + 1}</div>
              <p className="text-xs text-gray-700 leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Encerramento</p>
          <p className="text-xs text-gray-600 italic">{data.closing}</p>
        </div>
        <SaveBtn saved={saved} onClick={onSave} color="violet" onOpenHub={onOpenHub} />
      </div>
    </div>
  )
}

// ─── Format 3: Carousel ───────────────────────────────────────────────────────
function CarouselCard({ data, onSave, saved, onOpenHub, isFav, onToggleFav }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.purple
  const allSlides = [`SLIDE 1 (CAPA): ${data.slide_1}`, ...(data.slides || []).map((s, i) => `\nSLIDE ${i + 2}:\n${s.headline}\n${s.body}`), `\nSLIDE FINAL:\n${data.final_slide}`].join('\n')
  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-3.5 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <LayoutGrid size={14} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Carrossel</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>{(data.slides?.length || 0) + 2} slides</span>
        </div>
        <div className="flex items-center gap-1">
          <FavBtn isFav={isFav} onToggle={onToggleFav} />
          <button onClick={() => copy(allSlides, 'carousel')} className="btn-secondary text-xs py-1 px-2.5">
            {copiedKey === 'carousel' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-2">
        <div className="rounded-xl p-3.5 bg-purple-50 border border-purple-200">
          <p className="text-[9px] text-purple-500 font-bold uppercase tracking-wide mb-1">Slide 1 — Capa</p>
          <p className="text-sm font-bold text-gray-800">"{data.slide_1}"</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(data.slides || []).map((s, i) => (
            <div key={i} className="rounded-xl p-3 border border-gray-100 bg-gray-50/80 space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center text-[9px] font-bold text-purple-600 shrink-0">{i + 2}</div>
                <p className="text-[11px] font-semibold text-gray-800 leading-tight">{s.headline}</p>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3.5 bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200">
          <p className="text-[9px] text-purple-500 font-bold uppercase tracking-wide mb-1">Slide Final — Insight Central</p>
          <p className="text-xs font-semibold text-gray-800">"{data.final_slide}"</p>
        </div>
        <SaveBtn saved={saved} onClick={onSave} color="purple" onOpenHub={onOpenHub} />
      </div>
    </div>
  )
}

// ─── Format 4: Storytelling ───────────────────────────────────────────────────
function StorytellingCard({ data, onSave, saved, onOpenHub, isFav, onToggleFav }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.fuchsia
  const STEPS = [
    { key: 'situation',     label: 'Situação',  color: 'bg-blue-50 border-blue-200',     labelColor: 'text-blue-500',    num: '01' },
    { key: 'tension',       label: 'Tensão',    color: 'bg-orange-50 border-orange-200', labelColor: 'text-orange-500',  num: '02' },
    { key: 'turning_point', label: 'Virada',    color: 'bg-fuchsia-50 border-fuchsia-200', labelColor: 'text-fuchsia-500', num: '03' },
    { key: 'resolution',    label: 'Resolução', color: 'bg-emerald-50 border-emerald-200', labelColor: 'text-emerald-600', num: '04' },
  ]
  const fullStory = STEPS.map(s => `${s.label.toUpperCase()}:\n${data[s.key]}`).join('\n\n')
  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-3.5 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <BookOpen size={14} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Arco Narrativo</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>4 partes</span>
        </div>
        <div className="flex items-center gap-1">
          <FavBtn isFav={isFav} onToggle={onToggleFav} />
          <button onClick={() => copy(fullStory, 'story')} className="btn-secondary text-xs py-1 px-2.5">
            {copiedKey === 'story' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-2.5">
        {STEPS.map((step) => (
          <div key={step.key} className={`rounded-xl p-3.5 border ${step.color} space-y-1`}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-gray-300">{step.num}</span>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${step.labelColor}`}>{step.label}</p>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{data[step.key]}</p>
          </div>
        ))}
        <SaveBtn saved={saved} onClick={onSave} color="fuchsia" onOpenHub={onOpenHub} />
      </div>
    </div>
  )
}

// ─── Format 5: Reels Script ───────────────────────────────────────────────────
function ReelCard({ data, onSave, saved, onOpenHub, isFav, onToggleFav }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.rose
  const script = [
    `HOOK VISUAL: ${data.hook_visual}`,
    `HOOK FALADO: "${data.hook_spoken}"`,
    '',
    ...(data.beats || []).map((b, i) => `BEAT ${i + 1} (~${b.duration_sec}s): ${b.content}`),
    '',
    `LOOP: ${data.loop_element}`,
    `TEXTO NA TELA: "${data.text_overlay}"`,
    `ÁUDIO: ${data.audio_strategy}`,
    `CTA: ${data.cta}`,
    `DURAÇÃO: ${data.suggested_duration_sec}s`,
  ].join('\n')
  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-3.5 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <Film size={14} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Reels</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>Instagram</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">~{data.suggested_duration_sec}s</span>
        </div>
        <div className="flex items-center gap-1">
          <FavBtn isFav={isFav} onToggle={onToggleFav} />
          <button onClick={() => copy(script, 'reel')} className="btn-secondary text-xs py-1 px-2.5">
            {copiedKey === 'reel' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {/* Hook */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3 bg-rose-50 border border-rose-200 space-y-1">
            <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wide">👁 Hook Visual</p>
            <p className="text-xs text-gray-700">{data.hook_visual}</p>
          </div>
          <div className="rounded-xl p-3 bg-rose-50 border border-rose-200 space-y-1">
            <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wide">🎙 Hook Falado</p>
            <p className="text-xs font-semibold text-gray-800 italic">"{data.hook_spoken}"</p>
          </div>
        </div>
        {/* Beats */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Beats de conteúdo</p>
          {(data.beats || []).map((b, i) => (
            <div key={i} className="flex gap-2.5 items-start p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-[9px] font-black text-rose-300 shrink-0 mt-0.5">0{i + 1}</span>
              <div className="flex-1">
                <p className="text-xs text-gray-700">{b.content}</p>
              </div>
              <span className="text-[10px] font-semibold text-gray-400 shrink-0 bg-white border border-gray-200 px-1.5 py-0.5 rounded-lg">{b.duration_sec}s</span>
            </div>
          ))}
        </div>
        {/* Loop + overlay */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3 bg-gray-50 border border-gray-100 space-y-1">
            <div className="flex items-center gap-1"><Repeat2 size={10} className="text-rose-400" /><p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Loop</p></div>
            <p className="text-[11px] text-gray-600">{data.loop_element}</p>
          </div>
          <div className="rounded-xl p-3 bg-gray-50 border border-gray-100 space-y-1">
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Texto na Tela</p>
            <p className="text-[11px] text-gray-700 font-medium italic">"{data.text_overlay}"</p>
          </div>
        </div>
        {/* Audio + CTA */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5 bg-gray-50 border border-gray-100 space-y-1">
            <div className="flex items-center gap-1"><Music2 size={10} className="text-rose-400" /><p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Áudio</p></div>
            <p className="text-[11px] text-gray-600">{data.audio_strategy}</p>
          </div>
          <div className="rounded-xl p-2.5 bg-rose-50 border border-rose-200 space-y-1">
            <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wide">CTA</p>
            <p className="text-[11px] text-gray-700 font-semibold">{data.cta}</p>
          </div>
        </div>
        <SaveBtn saved={saved} onClick={onSave} color="rose" onOpenHub={onOpenHub} />
      </div>
    </div>
  )
}

// ─── Format 6: Stories Sequence ──────────────────────────────────────────────
const PURPOSE_COLORS = {
  gancho:        'bg-orange-100 text-orange-600 border-orange-200',
  desenvolvimento: 'bg-blue-100 text-blue-600 border-blue-200',
  engajamento:   'bg-violet-100 text-violet-600 border-violet-200',
  revelação:     'bg-emerald-100 text-emerald-600 border-emerald-200',
  cta:           'bg-pink-100 text-pink-600 border-pink-200',
}
const INTERACTIVE_ICONS = {
  enquete:   '📊',
  pergunta:  '💬',
  quiz:      '🎯',
  nenhum:    '',
}

function StoriesCard({ data, onSave, saved, onOpenHub, isFav, onToggleFav }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.pink
  const script = [`ABERTURA: ${data.opening_slide}`, '', ...(data.slides || []).map(s => `SLIDE ${s.number} [${s.purpose}]${s.interactive !== 'nenhum' ? ` + ${s.interactive}` : ''}:\n${s.content}`), '', `INTERATIVIDADE: ${data.interactive_tip}`, `CTA FINAL: ${data.closing_cta}`].join('\n')
  return (
    <div className={`rounded-2xl border ${c.border} bg-white overflow-hidden shadow-sm`}>
      <div className={`px-5 py-3.5 flex items-center justify-between ${c.header} border-b ${c.border}`}>
        <div className="flex items-center gap-2.5">
          <Smartphone size={14} className={c.icon} />
          <span className="text-sm font-semibold text-gray-800">Stories</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.badge}`}>Instagram</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{data.slides?.length || 0} slides</span>
        </div>
        <div className="flex items-center gap-1">
          <FavBtn isFav={isFav} onToggle={onToggleFav} />
          <button onClick={() => copy(script, 'stories')} className="btn-secondary text-xs py-1 px-2.5">
            {copiedKey === 'stories' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {/* Opening slide */}
        <div className="rounded-xl p-3.5 bg-pink-50 border border-pink-200">
          <p className="text-[9px] text-pink-500 font-bold uppercase tracking-wide mb-1">📲 Slide de Abertura (faz não pular)</p>
          <p className="text-sm font-semibold text-gray-800">"{data.opening_slide}"</p>
        </div>
        {/* Slides */}
        <div className="space-y-1.5">
          {(data.slides || []).map((s) => (
            <div key={s.number} className="flex gap-2.5 items-start p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center text-[9px] font-bold text-pink-600 shrink-0">{s.number}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 leading-snug">{s.content}</p>
                {s.interactive && s.interactive !== 'nenhum' && (
                  <span className="text-[9px] text-pink-500 font-semibold mt-0.5 inline-block">{INTERACTIVE_ICONS[s.interactive] || '🔸'} Adicionar: {s.interactive}</span>
                )}
              </div>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 capitalize ${PURPOSE_COLORS[s.purpose] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {s.purpose}
              </span>
            </div>
          ))}
        </div>
        {/* Tip + CTA */}
        <div className="rounded-xl p-3 bg-violet-50 border border-violet-200 space-y-1">
          <p className="text-[9px] text-violet-500 font-bold uppercase tracking-wide">💡 Dica de interatividade</p>
          <p className="text-[11px] text-gray-600">{data.interactive_tip}</p>
        </div>
        <div className="rounded-xl p-3 bg-pink-50 border border-pink-200">
          <p className="text-[9px] text-pink-500 font-bold uppercase tracking-wide mb-1">CTA Final</p>
          <p className="text-xs text-gray-700 font-medium">{data.closing_cta}</p>
        </div>
        <SaveBtn saved={saved} onClick={onSave} color="pink" onOpenHub={onOpenHub} />
      </div>
    </div>
  )
}

// ─── Format 7: TikTok Script ──────────────────────────────────────────────────
function TikTokCard({ data, onSave, saved, onOpenHub, isFav, onToggleFav }) {
  const { copiedKey, copy } = useCopy()
  const c = COLOR_MAP.zinc
  const script = [
    `HOOK (fala): "${data.hook_line}"`,
    `HOOK (visual): ${data.hook_visual}`,
    `INTERRUPÇÃO DE PADRÃO: ${data.pattern_interrupt}`,
    '',
    ...(data.beats || []).map((b, i) => `BEAT ${i + 1} [${b.retention_technique}]: ${b.content}`),
    '',
    `LOOP: ${data.loop_moment}`,
    `ÁUDIO: ${data.sound_strategy}`,
    `ISCA DE COMENTÁRIO: "${data.comment_bait}"`,
    `DURAÇÃO: ${data.suggested_duration_sec}s`,
  ].join('\n')
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 flex items-center justify-between bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center gap-2.5">
          <Music2 size={14} className="text-zinc-700" />
          <span className="text-sm font-semibold text-gray-800">TikTok</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-zinc-100 text-zinc-700 border-zinc-300">TikTok</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">~{data.suggested_duration_sec}s</span>
        </div>
        <div className="flex items-center gap-1">
          <FavBtn isFav={isFav} onToggle={onToggleFav} />
          <button onClick={() => copy(script, 'tiktok')} className="btn-secondary text-xs py-1 px-2.5">
            {copiedKey === 'tiktok' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {/* Hooks */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3 bg-zinc-900 space-y-1">
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">🔥 Hook (fala)</p>
            <p className="text-xs font-bold text-white">"{data.hook_line}"</p>
          </div>
          <div className="rounded-xl p-3 bg-zinc-100 border border-zinc-200 space-y-1">
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">👁 Hook (visual)</p>
            <p className="text-xs text-gray-700">{data.hook_visual}</p>
          </div>
        </div>
        {/* Pattern interrupt */}
        <div className="rounded-xl p-3 bg-amber-50 border border-amber-200">
          <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wide mb-1">⚡ Interrupção de padrão (~5s)</p>
          <p className="text-xs text-gray-700">{data.pattern_interrupt}</p>
        </div>
        {/* Beats */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Beats + técnica de retenção</p>
          {(data.beats || []).map((b, i) => (
            <div key={i} className="flex gap-2.5 items-start p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-[9px] font-black text-zinc-400 shrink-0 mt-0.5">0{i + 1}</span>
              <div className="flex-1">
                <p className="text-xs text-gray-700">{b.content}</p>
                <span className="text-[9px] text-zinc-500 italic">{b.retention_technique}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Loop + audio + comment bait */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5 bg-gray-50 border border-gray-100 space-y-1">
            <div className="flex items-center gap-1"><Repeat2 size={10} className="text-zinc-400" /><p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Loop</p></div>
            <p className="text-[11px] text-gray-600">{data.loop_moment}</p>
          </div>
          <div className="rounded-xl p-2.5 bg-gray-50 border border-gray-100 space-y-1">
            <div className="flex items-center gap-1"><Music2 size={10} className="text-zinc-400" /><p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Som</p></div>
            <p className="text-[11px] text-gray-600">{data.sound_strategy}</p>
          </div>
        </div>
        <div className="rounded-xl p-3 bg-zinc-900">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MessageCircle size={11} className="text-zinc-400" />
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">Isca de comentário</p>
          </div>
          <p className="text-xs font-semibold text-white">"{data.comment_bait}"</p>
        </div>
        <SaveBtn saved={saved} onClick={onSave} color="zinc" onOpenHub={onOpenHub} />
      </div>
    </div>
  )
}

// ─── Viral Phrases Card ──────────────────────────────────────────────────────
const PHRASE_TYPE_STYLES = {
  observacional: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', label: '👁 Observacional' },
  'contradição':  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', label: '⚡ Contradição' },
  insight:       { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', label: '💡 Insight' },
  reflexiva:     { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', label: '🌿 Reflexiva' },
}
const HOOK_FORMAT_STYLES = {
  video: { icon: Video, label: 'Vídeo', color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-200' },
  post:  { icon: AlignLeft, label: 'Post', color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  short: { icon: Film, label: 'Curto (Reels/Stories)', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
}

function ViralPhrasesCard({ data }) {
  const { copiedKey, copy } = useCopy()
  const allPhrases = (data.phrases || []).map(p => `"${p.text}"`).join('\n\n')

  return (
    <div className="rounded-2xl border border-orange-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
            <Quote size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Frases Virais</p>
            <p className="text-[10px] text-gray-400">{data.phrases?.length || 0} frases geradas a partir do seu pensamento</p>
          </div>
        </div>
        <button onClick={() => copy(allPhrases, 'all-phrases')} className="btn-secondary text-xs py-1.5 px-3">
          {copiedKey === 'all-phrases' ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar todas</>}
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Analysis */}
        {data.analysis && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 bg-gray-50 border border-gray-100 space-y-1">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Observação principal</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">{data.analysis.main_observation}</p>
            </div>
            <div className="rounded-xl p-3 bg-gray-50 border border-gray-100 space-y-1">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Tensão subjacente</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">{data.analysis.underlying_tension}</p>
            </div>
            <div className="rounded-xl p-3 bg-gray-50 border border-gray-100 space-y-1">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Insight implícito</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">{data.analysis.implicit_insight}</p>
            </div>
          </div>
        )}

        {/* Phrases */}
        <div className="space-y-2">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Frases de impacto</p>
          <div className="space-y-2">
            {(data.phrases || []).map((p, i) => {
              const style = PHRASE_TYPE_STYLES[p.type] || PHRASE_TYPE_STYLES.observacional
              return (
                <div key={i} className={`rounded-xl p-3.5 ${style.bg} border ${style.border} flex items-start gap-3 group`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 leading-snug">"{p.text}"</p>
                    <span className={`text-[9px] font-semibold mt-1.5 inline-block ${style.text}`}>{style.label}</span>
                  </div>
                  <button
                    onClick={() => copy(p.text, `phrase-${i}`)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-all shrink-0"
                  >
                    {copiedKey === `phrase-${i}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Hooks */}
        {data.top_hooks?.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target size={12} className="text-orange-500" />
              <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide">Melhores hooks para conteúdo</p>
            </div>
            <div className="space-y-2">
              {data.top_hooks.map((hook, i) => {
                const fmt = HOOK_FORMAT_STYLES[hook.format] || HOOK_FORMAT_STYLES.post
                const HookIcon = fmt.icon
                return (
                  <div key={i} className={`rounded-xl p-4 ${fmt.bg} border ${fmt.border} space-y-2 group`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HookIcon size={13} className={fmt.color} />
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${fmt.color}`}>{fmt.label}</span>
                      </div>
                      <button
                        onClick={() => copy(hook.phrase, `hook-${i}`)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-all"
                      >
                        {copiedKey === `hook-${i}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-snug">"{hook.phrase}"</p>
                    <p className="text-[10px] text-gray-500 italic">{hook.context}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Suggested Formats */}
        {data.suggested_formats?.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] text-gray-400 font-semibold">Formatos sugeridos:</span>
            {data.suggested_formats.map((f, i) => (
              <span key={i} className="text-[10px] px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 border border-orange-200 font-medium">{f}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── History item ─────────────────────────────────────────────────────────────
function HistoryItem({ capture, onLoad, onDelete }) {
  return (
    <div
      className="group flex items-start gap-2.5 p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-indigo-100 transition-all cursor-pointer"
      onClick={() => onLoad(capture)}
    >
      <div className="w-2 h-2 rounded-full bg-indigo-300 shrink-0 mt-1.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 leading-snug line-clamp-2">{capture.thought}</p>
        {capture.result?.core_insight && (
          <p className="text-[10px] text-indigo-500 mt-1 line-clamp-1 italic">→ {capture.result.core_insight}</p>
        )}
        <p className="text-[10px] text-gray-400 mt-1">
          {new Date(capture.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(capture.id) }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all shrink-0"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// ─── Loading ──────────────────────────────────────────────────────────────────
function LoadingView({ phase }) {
  const PhaseIcon = PHASES[phase]?.icon || Brain
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-8 space-y-8">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-200">
          <Brain size={36} className="text-white" />
        </div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <PhaseIcon size={14} className={PHASES[phase]?.color} />
          {PHASES[phase]?.label}
        </p>
        <p className="text-xs text-gray-400">Transformando em 7 formatos + frases virais...</p>
      </div>
      <div className="flex items-center gap-2">
        {PHASES.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${i < phase ? 'bg-indigo-500' : i === phase ? 'bg-indigo-400 scale-125 animate-pulse' : 'bg-gray-200'}`} />
            {i < PHASES.length - 1 && <div className={`h-0.5 w-6 transition-all duration-700 ${i < phase ? 'bg-indigo-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tone options ─────────────────────────────────────────────────────────────
const TONE_OPTIONS = [
  { value: 'reflexivo', label: 'Reflexivo', emoji: '🌿' },
  { value: 'provocador', label: 'Provocador', emoji: '⚡' },
  { value: 'íntimo', label: 'Íntimo', emoji: '🌙' },
  { value: 'analítico', label: 'Analítico', emoji: '🔍' },
  { value: 'humor', label: 'Humor', emoji: '😄' },
]

const ALL_FORMAT_KEYS = ['reflection_post', 'video_talking_point', 'carousel', 'storytelling', 'reel_script', 'stories_sequence', 'tiktok_script']

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ThoughtCapture() {
  const { thoughtCaptures, addThoughtCapture, deleteThoughtCapture, addIdea, addFavorite, removeFavorite, favorites } = useStore()
  const navigate = useNavigate()

  const [thought, setThought] = useState('')
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('reflexivo')
  const [loading, setLoading] = useState(false)
  const [loadPhase, setLoadPhase] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [currentThought, setCurrentThought] = useState('')
  const [savedFormats, setSavedFormats] = useState(new Set())

  const phaseRef = useRef(null)
  const resultsRef = useRef(null)
  const apiKey = localStorage.getItem('cio-anthropic-key')

  const startPhases = () => {
    setLoadPhase(0)
    let p = 0
    phaseRef.current = setInterval(() => {
      p += 1
      if (p >= PHASES.length) clearInterval(phaseRef.current)
      else setLoadPhase(p)
    }, 1600)
  }
  useEffect(() => () => clearInterval(phaseRef.current), [])

  const handleCapture = async () => {
    if (!thought.trim() || thought.trim().length < 10) { setError('Escreva ao menos 10 caracteres para capturar.'); return }
    if (!apiKey) { setError('Chave da API Anthropic não configurada. Vá em Configurações.'); return }
    setError(''); setLoading(true); setResult(null); setSavedFormats(new Set()); setCurrentThought(thought)
    startPhases()
    try {
      const data = await captureThought(apiKey, { thought: thought.trim(), niche, tone })
      setResult(data)
      addThoughtCapture({ thought: thought.trim(), niche, tone, result: data })
      // Auto-save draft to Hub
      if (data.save_as_idea) {
        addIdea({
          title: data.save_as_idea.title || thought.trim().slice(0, 60),
          description: data.save_as_idea.description || data.core_insight || '',
          status: 'draft',
          tags: ['thought-capture', 'auto-save'],
          source: 'Thought Capture',
        })
      }
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(phaseRef.current)
      setLoading(false)
    }
  }

  const handleLoadCapture = (capture) => {
    setThought(capture.thought); setNiche(capture.niche || ''); setTone(capture.tone || 'reflexivo')
    setResult(capture.result); setCurrentThought(capture.thought); setSavedFormats(new Set())
  }

  const FORMAT_LABELS = {
    reflection_post: 'post reflexivo', video_talking_point: 'roteiro de vídeo',
    carousel: 'carrossel', storytelling: 'arco narrativo',
    reel_script: 'reels', stories_sequence: 'stories', tiktok_script: 'tiktok',
  }
  const FORMAT_PLATFORMS = {
    reflection_post: 'Instagram', video_talking_point: 'YouTube',
    carousel: 'Instagram', storytelling: 'Instagram',
    reel_script: 'Instagram', stories_sequence: 'Instagram', tiktok_script: 'TikTok',
  }
  const FORMAT_FORMATS = {
    reflection_post: 'post', video_talking_point: 'video',
    carousel: 'carrossel', storytelling: 'post',
    reel_script: 'reel', stories_sequence: 'stories', tiktok_script: 'video',
  }

  const handleSaveFormat = (key) => {
    if (!result?.save_as_idea) return
    addIdea({
      title: result.save_as_idea.title,
      description: `${result.save_as_idea.description} [${FORMAT_LABELS[key]}]`,
      platform: FORMAT_PLATFORMS[key] || result.save_as_idea.platform || 'Instagram',
      format: FORMAT_FORMATS[key] || 'post',
      status: 'draft',
      tags: ['thought-capture', FORMAT_LABELS[key], ...(result.hashtags || []).slice(0, 2)],
      hook_type: 'reflexivo',
      source: 'Thought Capture',
    })
    setSavedFormats(prev => new Set([...prev, key]))
  }

  const goToHub = () => navigate('/ideas')

  const isFavorited = (title) => favorites.some(f => f.type === 'thought' && f.title === title)
  const toggleFav = (title, content) => {
    const existing = favorites.find(f => f.type === 'thought' && f.title === title)
    if (existing) {
      removeFavorite(existing.id)
    } else {
      addFavorite({ type: 'thought', title, content, source: 'Thought Capture' })
    }
  }

  const charCount = thought.length
  const isReady = charCount >= 10

  return (
    <div className="flex h-full">
      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-gray-100 bg-white flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Brain size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Thought Capture</h1>
              <p className="text-[10px] text-gray-400">Pensamentos → 7 formatos + frases virais</p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-b border-gray-100 space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Seu pensamento</label>
            <div className="relative">
              <textarea
                value={thought}
                onChange={e => setThought(e.target.value)}
                placeholder={"Tenho visto muita gente cansada de produzir conteúdo perfeito..."}
                className="w-full h-36 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-gray-300 leading-relaxed"
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleCapture() }}
              />
              <span className={`absolute bottom-2 right-2.5 text-[10px] font-medium ${charCount === 0 ? 'text-gray-300' : isReady ? 'text-indigo-400' : 'text-amber-400'}`}>{charCount}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Nicho / contexto <span className="text-gray-300">(opcional)</span></label>
            <input
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="ex: marketing digital, saúde mental..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-gray-300"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Tom</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TONE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${tone === t.value ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-3 bg-red-50 border border-red-100">
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleCapture}
            disabled={loading || !isReady}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${loading ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed shadow-none' : isReady ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 shadow-indigo-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
          >
            {loading ? <><RefreshCw size={14} className="animate-spin" /> Capturando...</> : <><Sparkles size={14} /> Capturar Pensamento</>}
          </button>
          <p className="text-[10px] text-gray-400 text-center">Ctrl+Enter para enviar · Gera 7 formatos + frases virais</p>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {thoughtCaptures.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 pb-1">
                Capturados ({thoughtCaptures.length})
              </p>
              {thoughtCaptures.map(c => (
                <HistoryItem key={c.id} capture={c} onLoad={handleLoadCapture} onDelete={deleteThoughtCapture} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 opacity-60">
              <Clock size={24} className="text-gray-300 mx-auto" />
              <p className="text-xs text-gray-400">Seus pensamentos capturados<br />aparecem aqui</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: Results ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingView phase={loadPhase} />
        ) : result ? (
          <div className="p-6 space-y-6" ref={resultsRef}>

            {/* Core insight banner */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-5 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Zap size={14} className="text-indigo-500 shrink-0" />
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Essência capturada</p>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200 font-medium">{result.emotional_angle}</span>
              </div>
              <p className="text-base font-semibold text-gray-900 leading-snug">"{result.core_insight}"</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
                <Brain size={11} className="text-indigo-400" />
                <span className="text-gray-400 italic truncate max-w-xs">{currentThought}</span>
              </div>
              {result.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.hashtags.map((h, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-indigo-500 font-medium">#{h}</span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Viral Phrases ── */}
            {result.viral_phrases && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-orange-100" />
                  <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide px-3 flex items-center gap-1.5">
                    <Quote size={10} /> Frases Virais & Hooks
                  </span>
                  <div className="h-px flex-1 bg-orange-100" />
                </div>
                <ViralPhrasesCard data={result.viral_phrases} />
              </div>
            )}

            {/* ── Section 1: Long-form formats ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3">Conteúdo de Texto & Vídeo Longo</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {result.reflection_post && (
                  <ReflectionCard data={result.reflection_post} onSave={() => handleSaveFormat('reflection_post')} saved={savedFormats.has('reflection_post')} onOpenHub={goToHub} isFav={isFavorited('Post Reflexivo')} onToggleFav={() => toggleFav('Post Reflexivo', result.reflection_post.text)} />
                )}
                {result.video_talking_point && (
                  <VideoCard data={result.video_talking_point} onSave={() => handleSaveFormat('video_talking_point')} saved={savedFormats.has('video_talking_point')} onOpenHub={goToHub} isFav={isFavorited('Roteiro de Video')} onToggleFav={() => toggleFav('Roteiro de Video', [`HOOK: ${result.video_talking_point.hook}`, ...(result.video_talking_point.talking_points || []).map((p, i) => `${i + 1}. ${p}`), `ENCERRAMENTO: ${result.video_talking_point.closing}`].join('\n'))} />
                )}
                {result.carousel && (
                  <CarouselCard data={result.carousel} onSave={() => handleSaveFormat('carousel')} saved={savedFormats.has('carousel')} onOpenHub={goToHub} isFav={isFavorited('Carrossel')} onToggleFav={() => toggleFav('Carrossel', [`SLIDE 1: ${result.carousel.slide_1}`, ...(result.carousel.slides || []).map((s, i) => `SLIDE ${i + 2}: ${s.headline} - ${s.body}`), `FINAL: ${result.carousel.final_slide}`].join('\n'))} />
                )}
                {result.storytelling && (
                  <StorytellingCard data={result.storytelling} onSave={() => handleSaveFormat('storytelling')} saved={savedFormats.has('storytelling')} onOpenHub={goToHub} isFav={isFavorited('Arco Narrativo')} onToggleFav={() => toggleFav('Arco Narrativo', [result.storytelling.situation, result.storytelling.tension, result.storytelling.turning_point, result.storytelling.resolution].filter(Boolean).join('\n\n'))} />
                )}
              </div>
            </div>

            {/* ── Section 2: Short-form platforms ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3">Roteiros para Redes Sociais</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {result.reel_script && (
                  <ReelCard data={result.reel_script} onSave={() => handleSaveFormat('reel_script')} saved={savedFormats.has('reel_script')} onOpenHub={goToHub} isFav={isFavorited('Reels Script')} onToggleFav={() => toggleFav('Reels Script', [`HOOK: ${result.reel_script.hook_spoken}`, ...(result.reel_script.beats || []).map(b => b.content), `CTA: ${result.reel_script.cta}`].filter(Boolean).join('\n'))} />
                )}
                {result.stories_sequence && (
                  <StoriesCard data={result.stories_sequence} onSave={() => handleSaveFormat('stories_sequence')} saved={savedFormats.has('stories_sequence')} onOpenHub={goToHub} isFav={isFavorited('Stories Sequence')} onToggleFav={() => toggleFav('Stories Sequence', [`ABERTURA: ${result.stories_sequence.opening_slide}`, ...(result.stories_sequence.slides || []).map(s => `Slide ${s.number}: ${s.content}`), `CTA: ${result.stories_sequence.closing_cta}`].filter(Boolean).join('\n'))} />
                )}
                {result.tiktok_script && (
                  <TikTokCard data={result.tiktok_script} onSave={() => handleSaveFormat('tiktok_script')} saved={savedFormats.has('tiktok_script')} onOpenHub={goToHub} isFav={isFavorited('TikTok Script')} onToggleFav={() => toggleFav('TikTok Script', [`HOOK: ${result.tiktok_script.hook_line}`, ...(result.tiktok_script.beats || []).map(b => b.content), `LOOP: ${result.tiktok_script.loop_moment}`, `CTA: ${result.tiktok_script.comment_bait}`].filter(Boolean).join('\n'))} />
                )}
              </div>
            </div>

            {/* Save all */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Plus size={15} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">Salvar todos os 7 formatos no Hub</p>
                  <p className="text-[10px] text-gray-400">Cada formato vira uma ideia separada pronta para produzir</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => ALL_FORMAT_KEYS.forEach(k => { if (!savedFormats.has(k)) handleSaveFormat(k) })}
                  disabled={savedFormats.size === ALL_FORMAT_KEYS.length}
                  className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${savedFormats.size === ALL_FORMAT_KEYS.length ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-100'}`}
                >
                  {savedFormats.size === ALL_FORMAT_KEYS.length ? <><Check size={12} /> Todos salvos</> : <><Sparkles size={12} /> Salvar todos</>}
                </button>
                {savedFormats.size > 0 && (
                  <button onClick={goToHub} className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-orange-50 border border-orange-200 transition-all">
                    Abrir no Hub <ExternalLink size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Next step navigation */}
            <div className="flex items-center gap-2 flex-wrap mt-6 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400 mr-1">{`Pr\u00f3ximo passo:`}</span>
              <button onClick={() => navigate('/generate')} className="text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition-all flex items-center gap-1">
                <Sparkles size={11} /> Explorar ideias
              </button>
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
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center h-full py-20 px-10 space-y-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <Brain size={36} className="text-indigo-400" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <h2 className="text-lg font-bold text-gray-800">Capture seu próximo pensamento</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Escreva qualquer reflexão bruta — uma observação, frustração, algo que você notou hoje.
                O sistema transforma em <strong>7 formatos + frases virais</strong> adaptados para cada plataforma.
              </p>
            </div>
            {/* Examples */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
              {[
                '"Tenho visto muita gente cansada de produzir conteúdo perfeito."',
                '"Parece que todo mundo sabe o que quer fazer da vida, menos eu."',
                '"A maioria dos cursos ensina ferramenta. Ninguém ensina a pensar."',
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setThought(ex.replace(/^"|"$/g, ''))}
                  className="text-left p-3.5 rounded-xl border border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-xs text-gray-600 italic leading-relaxed shadow-sm"
                >
                  {ex}
                </button>
              ))}
            </div>
            {/* Format preview */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { icon: AlignLeft, label: 'Post', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { icon: Video, label: 'Vídeo', color: 'text-violet-500', bg: 'bg-violet-50' },
                { icon: LayoutGrid, label: 'Carrossel', color: 'text-purple-500', bg: 'bg-purple-50' },
                { icon: BookOpen, label: 'Narrativa', color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
                { icon: Film, label: 'Reels', color: 'text-rose-500', bg: 'bg-rose-50' },
                { icon: Smartphone, label: 'Stories', color: 'text-pink-500', bg: 'bg-pink-50' },
                { icon: Music2, label: 'TikTok', color: 'text-zinc-600', bg: 'bg-zinc-100' },
              ].map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 opacity-80">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon size={18} className={color} />
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
