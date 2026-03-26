import { useState, useRef } from 'react'
import {
  Video, Link2, ChevronRight, BookOpen,
  Lightbulb, Layers, Clock, Eye, Copy, Check,
  Sparkles, Trash2, RotateCcw, ExternalLink,
  Mic, Film, Zap, Target, TrendingUp, Star,
  Plus, FileVideo, AlertCircle, Key, X, ShieldCheck,
  FileText, Globe, ArrowRight, RefreshCw,
  Upload, AlignLeft, Info, Bookmark, BookMarked, Pencil, MessageSquare, Send, Loader2,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { extractYouTubeId, getYouTubeThumbnail } from '../../utils/videoAnalyzer'

const LS_KEY = 'cio-anthropic-key'
const LS_KEY_GROQ = 'cio-groq-key'

const INPUT_MODES = [
  { id: 'url', label: 'URL do Vídeo', icon: Link2 },
  { id: 'file', label: 'Upload de Arquivo', icon: FileVideo },
  { id: 'transcript', label: 'Colar Transcrição', icon: FileText },
]

const TABS = [
  { id: 'resumo', label: 'Resumo', icon: AlignLeft },
  { id: 'estrutura', label: 'Estrutura', icon: Layers },
  { id: 'tom', label: 'Tom & Padrões', icon: Mic },
  { id: 'retencao', label: 'Retenção', icon: Eye },
  { id: 'porque', label: 'Por Que Funciona', icon: Star },
  { id: 'template', label: 'Template', icon: BookOpen },
  { id: 'ideias', label: 'Ideias', icon: Lightbulb },
  { id: 'transcricao', label: 'Transcrição', icon: FileText },
  { id: 'comentarios', label: 'Comentários', icon: MessageSquare },
]

const TYPE_OPTIONS = [
  { value: 'auto', label: 'Detectar automaticamente' },
  { value: 'educational', label: 'Educacional / Tutorial' },
  { value: 'storytelling', label: 'Storytelling / Pessoal' },
  { value: 'contrarian', label: 'Contrário / Opinião' },
  { value: 'listicle', label: 'Lista / Breakdown' },
  { value: 'motivational', label: 'Motivacional' },
  { value: 'humorous', label: 'Humor / Entretenimento' },
]

const ARCHETYPE_COLORS = {
  educational: 'bg-blue-100 text-blue-700 border-blue-200',
  storytelling: 'bg-purple-100 text-purple-700 border-purple-200',
  contrarian: 'bg-red-100 text-red-700 border-red-200',
  listicle: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  tutorial: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  motivational: 'bg-orange-100 text-orange-700 border-orange-200',
  humorous: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}
const ARCHETYPE_LABELS = {
  educational: 'Educacional', storytelling: 'Storytelling', contrarian: 'Contrário',
  listicle: 'Lista', tutorial: 'Tutorial', motivational: 'Motivacional', humorous: 'Humor',
}

// ── YouTube oEmbed ────────────────────────────────────────────────────────────
async function fetchYouTubeMeta(url) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
    if (!res.ok) return null
    const data = await res.json()
    return { title: data.title, channel: data.author_name }
  } catch { return null }
}

// ── Keyframe extraction from uploaded video file ──────────────────────────────
async function extractKeyframes(videoFile, count = 6) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    const objectUrl = URL.createObjectURL(videoFile)
    video.src = objectUrl
    const cleanup = () => URL.revokeObjectURL(objectUrl)
    video.addEventListener('error', () => { cleanup(); resolve([]) })
    video.addEventListener('loadedmetadata', async () => {
      try {
        const { duration } = video
        if (!duration || !isFinite(duration)) { cleanup(); resolve([]); return }
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = 180
        const ctx = canvas.getContext('2d')
        const frames = []
        for (let i = 0; i < count; i++) {
          const time = (duration / (count + 1)) * (i + 1)
          await new Promise((res) => {
            video.currentTime = time
            video.addEventListener('seeked', () => {
              ctx.drawImage(video, 0, 0, 320, 180)
              frames.push({ time: Math.round(time), dataUrl: canvas.toDataURL('image/jpeg', 0.6) })
              res()
            }, { once: true })
          })
        }
        cleanup()
        resolve(frames)
      } catch { cleanup(); resolve([]) }
    })
    video.load()
  })
}

// ── Groq Whisper transcription ────────────────────────────────────────────────
async function transcribeWithGroq(groqKey, audioFile, lang = 'pt') {
  const MAX_SIZE = 25 * 1024 * 1024
  if (audioFile.size > MAX_SIZE) {
    throw new Error(`Arquivo muito grande (${(audioFile.size / 1024 / 1024).toFixed(1)} MB). O limite do Whisper é 25 MB. Compacte o arquivo ou use um trecho menor.`)
  }
  const formData = new FormData()
  formData.append('file', audioFile, audioFile.name)
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('response_format', 'text')
  if (lang !== 'auto') formData.append('language', lang)

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro na transcrição (${res.status}): ${err}`)
  }
  return (await res.text()).trim()
}

// ── Claude API — supports image frames via Vision ─────────────────────────────
async function callClaudeAPI(apiKey, prompt, frames = []) {
  const content = frames.length > 0
    ? [
        { type: 'text', text: prompt },
        ...frames.slice(0, 4).map((f) => ({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: f.dataUrl.split(',')[1] },
        })),
      ]
    : prompt

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 6000,
      system: 'You are a video content analysis API for content creators. You ALWAYS respond with a valid JSON object only — no text before, no text after, no markdown. STRICT RULE: When given a real transcript, every quote in hook.text, promise.text, cta.text, patterns[].example, retention[].example must be an EXACT verbatim quote from that transcript — never paraphrase, never invent. When given video frames, describe only what you actually see in the images. NEVER fabricate quotes, invented sentences, or fictional examples. If a field requires a quote and you cannot find one in the data, use null. Your response must start with { and end with } and be parseable by JSON.parse().',
      messages: [{ role: 'user', content }],
    }),
  })
  if (!res.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(res)
  }
  const data = await res.json()
  return data.content[0].text
}

// ── Analysis prompt builder ───────────────────────────────────────────────────
function buildPrompt({ url, title, channel, topic, videoType, transcript, hasFrames, frameCount, inferenceOnly = false }) {
  const hasTranscript = transcript && transcript.trim().length > 30

  const dataSection = hasTranscript
    ? `REAL TRANSCRIPT — ANALYZE THIS DIRECTLY:
CRITICAL: Every field that asks for a quote (hook.text, promise.text, cta.text, patterns[].example, retention[].example, context.example, proof.example, conclusion.example) MUST be a verbatim quote copied character-for-character from the transcript below. If you cannot find a matching sentence, set that field to null. NEVER write a sentence that is not in the transcript.
---
${transcript.trim().slice(0, 6000)}
---
`
    : hasFrames
    ? `${frameCount} keyframes from the video are attached as images. Describe only what you visually observe in each frame. Do not invent quotes or narration. For all quote fields (hook.text, promise.text, cta.text, etc.) return null since no transcript is available.
`
    : `No transcript or frames available. Analyze based on title, channel, and your knowledge of this content space. For all quote fields (hook.text, promise.text, cta.text, etc.) return null — do not invent quotes. Fill structural descriptions based on the title, topic, and typical patterns for this content type.
`

  return `You are a professional video content analyst helping creators reverse-engineer successful videos.

VIDEO:
- Title: ${title || '(not provided)'}
- Channel/Creator: ${channel || '(not provided)'}
- URL: ${url || '(not provided)'}
- Topic: ${topic || '(not provided)'}
- Type: ${videoType !== 'auto' ? videoType : 'auto-detect'}
${hasFrames ? `- Frames: ${frameCount} keyframes attached as images` : ''}

${dataSection}
RULES:
- ${hasTranscript ? 'EVERY quoted field must be an exact verbatim copy from the transcript above. Never paraphrase. If not found, use null.' : hasFrames ? 'Visual-only analysis. All quote fields must be null. Only describe what is visible in the frames.' : 'Inference-only analysis (no transcript, no frames). All quote fields MUST be null. Base descriptions on title, topic, and content type patterns only.'}
- Classify tone as one of: educational, storytelling, provocative, contrarian, tutorial, motivational, humorous
- All analysis text in Brazilian Portuguese
- Generate 5 content_ideas based on the topic
- For transcript_reconstruction: ${hasTranscript ? 'reproduce the FULL transcript verbatim, exactly as provided, without any changes' : 'return null'}
- Respond with ONLY the JSON below (no markdown fences, no extra text):

{
  "archetype": "educational|storytelling|contrarian|listicle|tutorial|motivational|humorous",
  "data_source": "${hasTranscript ? 'transcript' : hasFrames ? 'frames' : 'inference'}",
  "overview": {
    "platform_fit": "Melhor(es) plataforma(s) para este estilo de conteúdo",
    "estimated_duration": "X:XX",
    "primary_audience": "Para quem este vídeo foi criado",
    "key_strength": "Elemento mais eficaz deste vídeo"
  },
  "structure": {
    "hook": {
      "type": "Nome específico do tipo de gancho",
      "text": ${hasTranscript ? '"Citação exata da transcrição — primeiras palavras do gancho"' : 'null'},
      "description": "Como este gancho funciona neste vídeo específico",
      "duration": "0:00-0:XX",
      "effectiveness": "Por que este gancho funciona para esta audiência"
    },
    "promise": {
      "text": ${hasTranscript ? '"Citação exata da promessa de valor da transcrição"' : 'null'},
      "description": "Que valor o criador promete entregar"
    },
    "context": {
      "description": "Como o vídeo estabelece credibilidade ou contexto",
      "example": ${hasTranscript ? '"Citação exata da transcrição"' : 'null'}
    },
    "main_sections": [
      { "name": "Nome da seção", "content": "O que é coberto nesta seção", "duration": "X:XX-X:XX" },
      { "name": "Nome da seção", "content": "O que é coberto", "duration": "X:XX-X:XX" },
      { "name": "Nome da seção", "content": "O que é coberto", "duration": "X:XX-X:XX" },
      { "name": "Nome da seção", "content": "O que é coberto", "duration": "X:XX-X:XX" }
    ],
    "proof": {
      "description": "Exemplo, caso ou elemento de prova usado",
      "example": ${hasTranscript ? '"Citação exata da transcrição"' : 'null'}
    },
    "conclusion": {
      "description": "Como o vídeo encerra",
      "example": ${hasTranscript ? '"Citação exata da transcrição"' : 'null'}
    },
    "cta": {
      "text": ${hasTranscript ? '"Citação exata do CTA da transcrição"' : 'null'},
      "type": "subscribe|next_video|product|comment|save|follow",
      "description": "Por que este CTA é eficaz"
    }
  },
  "tone": {
    "primary": "Tom primário",
    "secondary": "Tom secundário",
    "formality": "formal|informal",
    "sentence_style": "short|long|mixed",
    "approach": "direct|narrative|both",
    "description": "Descrição específica do estilo de comunicação neste vídeo",
    "markers": ["Marcador de tom específico", "Marcador de tom específico", "Marcador de tom específico"],
    "voice_characteristics": "Como a persona do criador aparece neste vídeo"
  },
  "patterns": [
    { "name": "Nome do padrão", "description": "Como aparece neste vídeo", "example": ${hasTranscript ? '"Citação exata da transcrição"' : 'null'}, "why_effective": "Por que este padrão funciona aqui" },
    { "name": "Nome do padrão", "description": "Como aparece neste vídeo", "example": ${hasTranscript ? '"Citação exata da transcrição"' : 'null'}, "why_effective": "Por que este padrão funciona aqui" },
    { "name": "Nome do padrão", "description": "Como aparece neste vídeo", "example": ${hasTranscript ? '"Citação exata da transcrição"' : 'null'}, "why_effective": "Por que este padrão funciona aqui" }
  ],
  "retention": [
    { "technique": "Nome da técnica", "description": "Como é usada neste vídeo", "example": ${hasTranscript ? '"Citação ou momento da transcrição"' : 'null'} },
    { "technique": "Nome da técnica", "description": "Como é usada neste vídeo", "example": ${hasTranscript ? '"Citação ou momento da transcrição"' : 'null'} },
    { "technique": "Nome da técnica", "description": "Como é usada neste vídeo", "example": ${hasTranscript ? '"Citação ou momento da transcrição"' : 'null'} },
    { "technique": "Nome da técnica", "description": "Como é usada neste vídeo", "example": ${hasTranscript ? '"Citação ou momento da transcrição"' : 'null'} }
  ],
  "visual": {
    "editing_pace": ${hasFrames ? '"Descrição do ritmo de edição observado nos frames"' : 'null'},
    "scene_changes": ${hasFrames ? '"Frequência e tipo de cortes observados"' : 'null'},
    "text_overlays": ${hasFrames ? '"Como texto na tela é usado"' : 'null'},
    "framing": ${hasFrames ? '"Como o criador é enquadrado / setup de câmera"' : 'null'},
    "key_techniques": ${hasFrames ? '["técnica visual 1", "técnica visual 2", "técnica visual 3"]' : '[]'}
  },
  "summary": {
    "overview": "Resumo de 2-3 frases baseado ${hasTranscript ? 'na transcrição real' : 'nos frames visuais'}",
    "key_topics": ["Tópico principal 1", "Tópico principal 2", "Tópico principal 3"],
    "content_type": "Rótulo breve: ex. Tutorial educacional, Reel motivacional…",
    "main_message": "A mensagem central do vídeo",
    "creator_positioning": "Como o criador se posiciona neste vídeo"
  },
  "transcript_reconstruction": ${hasTranscript ? '"[reproduza a transcrição completa verbatim aqui]"' : 'null'},
  "why_it_works": [
    { "reason": "Motivo específico", "impact": "Impacto na performance" },
    { "reason": "Motivo específico", "impact": "Impacto na performance" },
    { "reason": "Motivo específico", "impact": "Impacto na performance" },
    { "reason": "Motivo específico", "impact": "Impacto na performance" },
    { "reason": "Motivo específico", "impact": "Impacto na performance" }
  ],
  "template": {
    "name": "Nome do template extraído deste vídeo",
    "hook_formula": "Fórmula do gancho baseada no gancho real deste vídeo",
    "hook_example": "Exemplo aplicando este template a outro tópico",
    "promise_formula": "Fórmula da promessa de valor",
    "sections": [
      { "name": "Nome da seção", "duration": "X-X min", "goal": "O que esta seção alcança", "formula": "Fórmula reutilizável" },
      { "name": "Nome da seção", "duration": "X-X min", "goal": "O que esta seção alcança", "formula": "Fórmula reutilizável" },
      { "name": "Nome da seção", "duration": "X-X min", "goal": "O que esta seção alcança", "formula": "Fórmula reutilizável" },
      { "name": "Nome da seção", "duration": "X-X min", "goal": "O que esta seção alcança", "formula": "Fórmula reutilizável" }
    ],
    "closing_formula": "Fórmula de fechamento",
    "cta_formula": "Fórmula de CTA",
    "tips": ["Dica acionável", "Dica acionável", "Dica acionável", "Dica acionável"]
  },
  "content_ideas": [
    { "title": "Título específico da ideia", "hook": "Sugestão de gancho para esta ideia", "format": "video|reel|carrossel|thread|image", "platform": "youtube|instagram|tiktok|linkedin|twitter", "hook_type": "curiosity|pain|contrarian|list|personal", "angle": "Ângulo ou diferencial específico", "why_now": "Por que esta ideia é relevante agora" },
    { "title": "Título específico da ideia", "hook": "Sugestão de gancho", "format": "video|reel|carrossel|thread|image", "platform": "youtube|instagram|tiktok|linkedin|twitter", "hook_type": "curiosity|pain|contrarian|list|personal", "angle": "Ângulo específico", "why_now": "Por que relevante" },
    { "title": "Título específico da ideia", "hook": "Sugestão de gancho", "format": "video|reel|carrossel|thread|image", "platform": "youtube|instagram|tiktok|linkedin|twitter", "hook_type": "curiosity|pain|contrarian|list|personal", "angle": "Ângulo específico", "why_now": "Por que relevante" },
    { "title": "Título específico da ideia", "hook": "Sugestão de gancho", "format": "video|reel|carrossel|thread|image", "platform": "youtube|instagram|tiktok|linkedin|twitter", "hook_type": "curiosity|pain|contrarian|list|personal", "angle": "Ângulo específico", "why_now": "Por que relevante" },
    { "title": "Título específico da ideia", "hook": "Sugestão de gancho", "format": "video|reel|carrossel|thread|image", "platform": "youtube|instagram|tiktok|linkedin|twitter", "hook_type": "curiosity|pain|contrarian|list|personal", "angle": "Ângulo específico", "why_now": "Por que relevante" }
  ]
}`
}

// ── Script generator ──────────────────────────────────────────────────────────
async function generateScriptAPI(apiKey, template, topic, tone) {
  const prompt = `Generate a complete content script based on this template.

TOPIC: ${topic || 'content creation'}
TONE: ${tone || 'conversational, direct'}
TEMPLATE: ${template.name}
Hook formula: ${template.hook_formula}
Promise formula: ${template.promise_formula || ''}
Sections: ${(template.sections || []).map((s) => `${s.name} — ${s.formula || s.goal}`).join(' | ')}
Closing: ${template.closing_formula}
CTA: ${template.cta_formula || ''}

Return ONLY this JSON:
{
  "title": "Suggested title for this script",
  "platform": "Best platform",
  "estimated_duration": "X:XX",
  "script": [
    { "section": "Hook", "text": "Full script text", "notes": "Delivery notes" },
    { "section": "Promessa", "text": "Full script text", "notes": "Delivery notes" },
    { "section": "Section name", "text": "Full script text", "notes": "Delivery notes" },
    { "section": "Fechamento", "text": "Full script text", "notes": "Delivery notes" },
    { "section": "CTA", "text": "Full script text", "notes": "Delivery notes" }
  ],
  "b_roll_suggestions": ["B-roll idea 1", "B-roll idea 2", "B-roll idea 3"],
  "thumbnail_ideas": ["Thumbnail concept 1", "Thumbnail concept 2"]
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
      model: 'claude-opus-4-5',
      max_tokens: 3000,
      system: 'You are a scriptwriting API. Respond with valid JSON only. Start with { end with }.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const { handleApiError } = await import('../../utils/apiError.js')
    await handleApiError(res)
  }
  const data = await res.json()
  const match = data.content[0].text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da IA')
  const sanitized = match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
  return JSON.parse(sanitized)
}

// ── Groq Key Modal ────────────────────────────────────────────────────────────
function GroqKeyModal({ onClose, onSave }) {
  const [val, setVal] = useState('')
  const [show, setShow] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic size={16} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-900">Chave Groq — Transcrição Gratuita</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2">
          <p className="text-xs font-semibold text-emerald-800">Como obter sua chave gratuita:</p>
          {[
            { n: '1', text: 'Acesse console.groq.com e crie uma conta gratuita' },
            { n: '2', text: 'Vá em "API Keys" → clique em "Create API Key"' },
            { n: '3', text: 'Copie a chave e cole abaixo' },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
              <p className="text-xs text-gray-600">{text}</p>
            </div>
          ))}
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold hover:underline mt-1">
            <ExternalLink size={11} /> Abrir console.groq.com
          </a>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-2">
          <ShieldCheck size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500">
            Plano gratuito: 7.200 minutos/dia de transcrição. Chave salva <strong>apenas no seu navegador</strong>.
          </p>
        </div>

        <div>
          <label className="label">Cole sua Groq API Key</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              className="input pr-16"
              placeholder="gsk_..."
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
            <button onClick={() => setShow((x) => !x)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              {show ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={() => { if (val.trim()) { onSave(val.trim()); onClose() } }}
            disabled={!val.trim()}
            className="btn-primary flex-1"
            style={{ background: val.trim() ? 'linear-gradient(135deg, #059669, #047857)' : undefined }}
          >
            <Mic size={13} /> Salvar e Ativar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── API Key Modal ─────────────────────────────────────────────────────────────
function ApiKeyModal({ onClose, onSave }) {
  const [val, setVal] = useState('')
  const [show, setShow] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-violet-500" />
            <h2 className="text-sm font-bold text-gray-900">API Key da Anthropic</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 flex items-start gap-2">
          <ShieldCheck size={14} className="text-violet-500 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600">
            Sua chave fica salva <strong>apenas no seu navegador</strong> (localStorage). Nunca é enviada para outros servidores além da API da Anthropic.
          </p>
        </div>
        <div>
          <label className="label">Cole sua API Key</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              className="input pr-16"
              placeholder="sk-ant-api03-..."
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
            <button onClick={() => setShow((x) => !x)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              {show ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Obtenha em{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
              console.anthropic.com
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={() => { if (val.trim()) { onSave(val.trim()); onClose() } }}
            disabled={!val.trim()}
            className="btn-primary flex-1"
            style={{ background: val.trim() ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : undefined }}
          >
            <Key size={13} /> Salvar Chave
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Script Modal ──────────────────────────────────────────────────────────────
function ScriptModal({ script, onClose }) {
  const [copied, setCopied] = useState(false)
  const fullText = (script.script || []).map((s) =>
    `[${s.section.toUpperCase()}]\n${s.text}${s.notes ? `\n(${s.notes})` : ''}`
  ).join('\n\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const sectionColor = (sec) => {
    if (sec === 'Hook') return 'border-orange-200 bg-orange-50/50'
    if (sec === 'CTA') return 'border-violet-200 bg-violet-50/50'
    if (sec === 'Promessa') return 'border-blue-200 bg-blue-50/50'
    if (sec === 'Fechamento') return 'border-emerald-200 bg-emerald-50/50'
    return 'border-gray-200 bg-gray-50/40'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{script.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">{script.platform}</span>
              <span className="text-[10px] text-gray-400">{script.estimated_duration}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="btn-secondary text-xs">
              {copied ? <><Check size={12} className="text-emerald-500" /> Copiado!</> : <><Copy size={12} /> Copiar Roteiro</>}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {(script.script || []).map((section, i) => (
            <div key={i} className={`p-4 rounded-xl border space-y-2 ${sectionColor(section.section)}`}>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide inline-block ${
                section.section === 'Hook' ? 'bg-orange-100 text-orange-700' :
                section.section === 'CTA' ? 'bg-violet-100 text-violet-700' :
                'bg-gray-100 text-gray-600'
              }`}>{section.section}</span>
              <p className="text-sm text-gray-800 leading-relaxed">{section.text}</p>
              {section.notes && (
                <p className="text-[11px] text-gray-400 italic border-t border-gray-100 pt-2">💡 {section.notes}</p>
              )}
            </div>
          ))}
          {(script.b_roll_suggestions?.length > 0 || script.thumbnail_ideas?.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {script.b_roll_suggestions?.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">B-roll sugerido</p>
                  {script.b_roll_suggestions.map((s, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-gray-300">•</span>{s}</p>
                  ))}
                </div>
              )}
              {script.thumbnail_ideas?.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Thumbnails</p>
                  {script.thumbnail_ideas.map((t, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-gray-300">•</span>{t}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VideoAnalyzer() {
  const addVideoAnalysis = useStore((s) => s.addVideoAnalysis)
  const deleteVideoAnalysis = useStore((s) => s.deleteVideoAnalysis)
  const videoAnalyses = useStore((s) => s.videoAnalyses)
  const addIdea = useStore((s) => s.addIdea)

  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY) || '')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem(LS_KEY_GROQ) || '')
  const [showGroqModal, setShowGroqModal] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcriptLang, setTranscriptLang] = useState('pt')

  // Input
  const [inputMode, setInputMode] = useState('url')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [videoType, setVideoType] = useState('auto')
  const [transcript, setTranscript] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [frames, setFrames] = useState([])
  const [extractingFrames, setExtractingFrames] = useState(false)
  const fileInputRef = useRef(null)

  // Analysis
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [analysis, setAnalysis] = useState(null)
  const [analysisSource, setAnalysisSource] = useState('')
  const [activeTab, setActiveTab] = useState('estrutura')
  const [copied, setCopied] = useState(false)
  const [savedIdeas, setSavedIdeas] = useState(new Set())
  const [editingIdeaIdx, setEditingIdeaIdx] = useState(null)
  const [editedIdeas, setEditedIdeas] = useState({})
  const [showHistory, setShowHistory] = useState(false)
  const [savedAnalysis, setSavedAnalysis] = useState(false)
  const [error, setError] = useState('')

  // Script
  const [generatingScript, setGeneratingScript] = useState(false)
  const [generatedScript, setGeneratedScript] = useState(null)

  const ytId = extractYouTubeId(url)
  const thumbnail = ytId ? getYouTubeThumbnail(ytId) : null

  const STEPS = [
    'Buscando metadados do vídeo...',
    'Transcrevendo o áudio com Whisper AI...',
    'Enviando para análise com IA...',
    'Identificando estrutura, tom e padrões...',
    'Gerando template e ideias de conteúdo...',
  ]

  const SOURCE_BADGE = {
    transcript: { label: '✦ Análise por transcrição real', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    frames: { label: '✦ Análise visual por frames reais', color: 'bg-violet-100 text-violet-700 border-violet-200' },
    inference: { label: '◌ Análise por inferência — sem transcrição', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  }

  const handleFileSelect = async (file) => {
    if (!file) return
    setVideoFile(file)
    setTitle((t) => t || file.name.replace(/\.[^/.]+$/, ''))
    if (file.type.startsWith('video/')) {
      setExtractingFrames(true)
      const extracted = await extractKeyframes(file, 6)
      setFrames(extracted)
      setExtractingFrames(false)
    }
  }

  const handleAnalyze = async () => {
    const hasTranscriptText = transcript.trim().length > 30
    const hasFramesData = frames.length > 0
    const hasUrl = url.trim().length > 0
    const hasTitle = title.trim().length > 0
    const canAutoTranscribe = videoFile && groqKey && !hasTranscriptText

    if (!hasTranscriptText && !hasFramesData && !hasUrl && !hasTitle && !videoFile) {
      setError('Informe pelo menos a URL, título do vídeo, ou envie um arquivo de vídeo para analisar.')
      return
    }

    if (!apiKey) {
      setError('Uma API Key da Anthropic é necessária. Clique em "Adicionar API Key" acima.')
      return
    }

    setLoading(true)
    setAnalysis(null)
    setError('')
    setSavedIdeas(new Set())
    setSavedAnalysis(false)
    setLoadingStep(0)

    try {
      let metaTitle = title
      let channel = ''
      let finalTranscript = transcript

      // Step 0 — YouTube metadata
      setLoadingStep(0)
      if (hasUrl) {
        const meta = await fetchYouTubeMeta(url)
        if (meta) {
          if (!title.trim()) metaTitle = meta.title
          channel = meta.channel
        }
      }

      // Step 1 — Auto-transcribe with Groq Whisper if file present and no transcript yet
      if (canAutoTranscribe) {
        setLoadingStep(1)
        try {
          const text = await transcribeWithGroq(groqKey, videoFile, transcriptLang)
          if (text && text.trim().length > 20) {
            finalTranscript = text.trim()
            setTranscript(finalTranscript)
          }
        } catch (transcribeErr) {
          // Transcription failed — fall back to frames/inference, show soft warning
          console.warn('Auto-transcription failed:', transcribeErr.message)
        }
      }

      // Step 2 — Build prompt and call Claude
      setLoadingStep(2)
      const hasFinalTranscript = finalTranscript.trim().length > 30
      const source = hasFinalTranscript ? 'transcript' : hasFramesData ? 'frames' : 'inference'
      const prompt = buildPrompt({
        url, title: metaTitle, channel, topic, videoType,
        transcript: hasFinalTranscript ? finalTranscript : '',
        hasFrames: hasFramesData,
        frameCount: frames.length,
        inferenceOnly: source === 'inference',
      })
      setLoadingStep(3)
      const raw = await callClaudeAPI(apiKey, prompt, hasFramesData ? frames : [])
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('A IA não retornou uma análise estruturada. Tente novamente.')
      const result = JSON.parse(jsonMatch[0])
      setLoadingStep(4)
      await new Promise((r) => setTimeout(r, 300))
      setAnalysis(result)
      setAnalysisSource(source)
      if (metaTitle && !title) setTitle(metaTitle)
    } catch (e) {
      setError(e.message || 'Erro inesperado. Verifique sua API key e tente novamente.')
    } finally {
      setActiveTab('resumo')
      setLoading(false)
    }
  }

  const handleReset = () => {
    setUrl(''); setTitle(''); setTopic(''); setVideoType('auto')
    setTranscript(''); setVideoFile(null); setFrames([])
    setAnalysis(null); setSavedIdeas(new Set()); setSavedAnalysis(false)
    setError(''); setGeneratedScript(null)
  }

  const handleSaveAnalysis = () => {
    if (!analysis) return
    addVideoAnalysis({
      url, title, topic, videoType,
      result: analysis,
      transcript: transcript || '',
      thumbnail: thumbnail || (frames.length > 0 ? frames[0].dataUrl : null),
      source: analysisSource,
      analyzed_at: new Date().toISOString(),
    })
    setSavedAnalysis(true)
  }

  const handleSaveIdea = (idea) => {
    addIdea({
      title: idea.title,
      description: idea.hook || `Inspirado em análise de vídeo${topic ? ` sobre "${topic}"` : ''}.`,
      format: idea.format, platform: idea.platform,
      hook_type: idea.hook_type, topic: topic || '',
      priority: 'medium', status: 'idea',
      tags: ['video-referencia', idea.hook_type].filter(Boolean),
    })
    setSavedIdeas((s) => new Set([...s, idea.title]))
  }

  const handleGenerateScript = async () => {
    if (!analysis?.template || !apiKey) return
    setGeneratingScript(true)
    try {
      const script = await generateScriptAPI(apiKey, analysis.template, topic, analysis.tone?.primary)
      setGeneratedScript(script)
    } catch (e) {
      setError(e.message)
    } finally {
      setGeneratingScript(false)
    }
  }

  const handleTranscribe = async () => {
    if (!videoFile || !groqKey) return
    setTranscribing(true)
    setError('')
    try {
      const text = await transcribeWithGroq(groqKey, videoFile, transcriptLang)
      setTranscript(text)
    } catch (e) {
      setError(e.message)
    } finally {
      setTranscribing(false)
    }
  }

  const handleSaveGroqKey = (key) => { localStorage.setItem(LS_KEY_GROQ, key); setGroqKey(key) }
  const handleRemoveGroqKey = () => { localStorage.removeItem(LS_KEY_GROQ); setGroqKey('') }

  const handleCopyTemplate = () => {
    if (!analysis?.template) return
    const t = analysis.template
    const lines = [
      `# ${t.name}`, '',
      `## Fórmula do Gancho`, t.hook_formula,
      `Exemplo: ${t.hook_example}`, '',
      t.promise_formula ? `## Promessa\n${t.promise_formula}\n` : '',
      `## Seções`,
      ...(t.sections || []).map((s) => `- **${s.name}** (${s.duration}): ${s.goal}\n  Fórmula: ${s.formula || s.goal}`),
      '', `## Fechamento`, t.closing_formula,
      '', `## CTA`, t.cta_formula || '',
      '', `## Dicas`, ...(t.tips || []).map((tip) => `• ${tip}`),
    ].filter((l) => l !== undefined).join('\n')
    navigator.clipboard.writeText(lines).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const loadSavedAnalysis = (saved) => {
    setUrl(saved.url || '')
    setTitle(saved.title || '')
    setTopic(saved.topic || '')
    setVideoType(saved.videoType || 'auto')
    setAnalysis(saved.result)
    setTranscript(saved.transcript || '')
    setAnalysisSource(saved.source || 'inference')
    setFrames([])
    setActiveTab('resumo')
    setSavedIdeas(new Set())
    setSavedAnalysis(true)
    setShowHistory(false)
  }

  const handleSaveKey = (key) => { localStorage.setItem(LS_KEY, key); setApiKey(key) }
  const handleRemoveKey = () => { localStorage.removeItem(LS_KEY); setApiKey('') }

  const hasRealData = transcript.trim().length > 30 || frames.length > 0
  const hasAnyData = hasRealData || url.trim().length > 0 || title.trim().length > 0
  const canAnalyze = !extractingFrames && hasAnyData && !!apiKey

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {showKeyModal && <ApiKeyModal onClose={() => setShowKeyModal(false)} onSave={handleSaveKey} />}
      {showGroqModal && <GroqKeyModal onClose={() => setShowGroqModal(false)} onSave={handleSaveGroqKey} />}
      {generatedScript && <ScriptModal script={generatedScript} onClose={() => setGeneratedScript(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-200">
            <Video size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Analisador de Vídeos de Referência</h1>
            <p className="text-xs text-gray-400">Análise 100% baseada em dados reais — transcrição real ou frames extraídos. Nunca gera conteúdo fictício.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {apiKey ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              <ShieldCheck size={12} /><span>IA ativa</span>
              <button onClick={handleRemoveKey} className="ml-1 text-emerald-400 hover:text-red-400 transition-colors" title="Remover chave"><X size={11} /></button>
            </div>
          ) : (
            <button onClick={() => setShowKeyModal(true)} className="btn-secondary text-xs border-violet-200 text-violet-600 hover:bg-violet-50">
              <Key size={12} /> Adicionar API Key
            </button>
          )}
          <button onClick={() => setShowHistory((x) => !x)} className={`btn-secondary text-xs ${showHistory ? 'bg-violet-50 border-violet-200 text-violet-700' : ''}`}>
            <BookMarked size={13} /> Biblioteca {videoAnalyses.length > 0 && `(${videoAnalyses.length})`}
          </button>
          {analysis && (
            <button onClick={handleReset} className="btn-secondary text-xs">
              <RotateCcw size={13} /> Nova Análise
            </button>
          )}
        </div>
      </div>

      {/* No API key banner */}
      {!apiKey && !analysis && (
        <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 flex items-start gap-3">
          <Key size={15} className="text-violet-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-800 mb-0.5">API Key necessária para análise real</p>
            <p className="text-xs text-gray-500">
              Este analisador nunca gera conteúdo fictício. Ele lê sua transcrição real ou frames do vídeo e extrai insights diretos do conteúdo.{' '}
              <button onClick={() => setShowKeyModal(true)} className="text-violet-600 hover:underline font-medium">
                Adicione sua API Key da Anthropic
              </button>{' '}
              para começar.
            </p>
          </div>
        </div>
      )}

      {/* Biblioteca de Vídeos */}
      {showHistory && videoAnalyses.length > 0 && (
        <div className="card p-4 space-y-3 animate-slide-up border border-violet-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
              <BookMarked size={13} className="text-violet-500" /> Biblioteca de Vídeos Salvos
            </h3>
            <span className="text-[10px] text-gray-400">{videoAnalyses.length} vídeo{videoAnalyses.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {videoAnalyses.map((saved) => (
              <div key={saved.id} className="rounded-xl border border-gray-200 bg-white hover:border-violet-200 hover:shadow-sm transition-all group overflow-hidden">
                {/* Thumbnail */}
                <div className="relative h-24 bg-gray-100 overflow-hidden">
                  {saved.thumbnail ? (
                    <img src={saved.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video size={24} className="text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {/* Source badge on thumbnail */}
                  <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                    saved.source === 'transcript' ? 'bg-emerald-100/90 text-emerald-700 border-emerald-200' :
                    saved.source === 'frames' ? 'bg-violet-100/90 text-violet-700 border-violet-200' :
                    'bg-amber-100/90 text-amber-700 border-amber-200'
                  }`}>
                    {saved.source === 'transcript' ? '✦ Transcrição' : saved.source === 'frames' ? '✦ Frames' : '◌ Inferência'}
                  </span>
                  {/* Archetype on thumbnail */}
                  {saved.result?.archetype && (
                    <span className="absolute bottom-1.5 right-1.5 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded-full capitalize">
                      {saved.result.archetype}
                    </span>
                  )}
                  {/* Delete button */}
                  <button
                    onClick={() => deleteVideoAnalysis(saved.id)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/40 text-white/70 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">
                    {saved.title || saved.url || 'Vídeo sem título'}
                  </p>
                  {saved.topic && <p className="text-[10px] text-gray-400">Tópico: {saved.topic}</p>}

                  {/* What's saved */}
                  <div className="flex flex-wrap gap-1">
                    {['resumo','estrutura','tom','template','ideias'].map((tab) => (
                      <span key={tab} className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 border border-violet-100 capitalize">{tab}</span>
                    ))}
                    {saved.transcript && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">transcrição</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-gray-400">{new Date(saved.analyzed_at).toLocaleDateString('pt-BR')}</p>
                    <button
                      onClick={() => loadSavedAnalysis(saved)}
                      className="text-[11px] font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1 transition-colors"
                    >
                      Abrir <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LANDING / INPUT VIEW ─────────────────────────────────────────── */}
      {!analysis && !loading && (
        <div className="space-y-4">

          {/* What this tool analyzes — visual overview */}
          <div className="card overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">O que será analisado</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-gray-100">
              {[
                { icon: Zap,        color: 'text-orange-500 bg-orange-50', label: 'Gancho & Estrutura',    desc: 'Hook, promessa, seções, CTA' },
                { icon: Mic,        color: 'text-purple-500 bg-purple-50', label: 'Tom de Voz',            desc: 'Formalidade, estilo, persona' },
                { icon: TrendingUp, color: 'text-amber-500  bg-amber-50',  label: 'Padrões de Conteúdo',  desc: 'Lista, storytelling, contrário…' },
                { icon: Eye,        color: 'text-sky-500    bg-sky-50',    label: 'Retenção',              desc: 'Técnicas de engajamento' },
                { icon: Film,       color: 'text-gray-500   bg-gray-100',  label: 'Estilo Visual',         desc: 'Edição, pacing, texto na tela' },
                { icon: Star,       color: 'text-orange-500 bg-orange-50', label: 'Por Que Funciona',      desc: 'Fatores de sucesso do vídeo' },
                { icon: BookOpen,   color: 'text-violet-500 bg-violet-50', label: 'Template Reutilizável', desc: 'Fórmulas prontas para copiar' },
                { icon: Lightbulb,  color: 'text-emerald-500 bg-emerald-50', label: 'Ideias de Conteúdo', desc: '5 ideias com gancho e ângulo' },
              ].map(({ icon: Icon, color, label, desc }) => (
                <div key={label} className="flex items-start gap-2.5 p-3.5 hover:bg-gray-50/70 transition-colors">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${color}`}>
                    <Icon size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main input area: Video source + Transcript side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* LEFT — Video source */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-50 text-violet-500"><Video size={13} /></div>
                <p className="text-sm font-semibold text-gray-900">Fonte do Vídeo</p>
              </div>

              {/* URL input */}
              <div>
                <label className="label flex items-center gap-1.5">
                  <Link2 size={11} className="text-gray-400" /> URL do vídeo
                </label>
                <input
                  className="input"
                  placeholder="YouTube, TikTok, Instagram, LinkedIn..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                />
              </div>

              {/* YouTube thumbnail preview */}
              {thumbnail && (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                  <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                      <div className="w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[12px] border-l-white ml-0.5" />
                    </div>
                  </div>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70">
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}

              {/* OR divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-400 font-medium">ou envie um arquivo</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* File upload */}
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                  videoFile ? 'border-violet-300 bg-violet-50/30' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/20'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />
                {videoFile ? (
                  <div className="space-y-1">
                    <FileVideo size={20} className="mx-auto text-violet-500" />
                    <p className="text-xs font-medium text-gray-800">{videoFile.name}</p>
                    <p className="text-[10px] text-gray-400">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    {extractingFrames && <p className="text-[10px] text-violet-500 animate-pulse">⟳ Extraindo frames...</p>}
                    {frames.length > 0 && <p className="text-[10px] text-emerald-600">✓ {frames.length} frames extraídos</p>}
                    {groqKey && transcript.trim().length < 30 && (
                      <p className="text-[10px] text-emerald-600 font-semibold">🎙 Transcrição automática ativada</p>
                    )}
                    {transcript.trim().length > 30 && (
                      <p className="text-[10px] text-emerald-600 font-semibold">✦ Transcrição pronta ({transcript.trim().split(/\s+/).length} palavras)</p>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload size={18} className="mx-auto text-gray-300 mb-1.5" />
                    <p className="text-xs text-gray-500 font-medium">Arraste ou clique para selecionar</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">MP4, MOV, AVI, MP3, M4A — áudio e vídeo</p>
                    {groqKey && (
                      <p className="text-[10px] text-emerald-500 mt-1">🎙 Whisper transcreve automaticamente ao analisar</p>
                    )}
                  </>
                )}
              </div>

              {/* Frame preview strip */}
              {frames.length > 0 && (
                <div className="grid grid-cols-3 gap-1">
                  {frames.map((f, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden aspect-video bg-gray-100 border border-gray-200">
                      <img src={f.dataUrl} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/60 text-white px-0.5 rounded">{f.time}s</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Context fields */}
              <div className="space-y-3 pt-1 border-t border-gray-100">
                <div>
                  <label className="label">Título <span className="text-gray-400 font-normal">(autopreenchido para YouTube)</span></label>
                  <input className="input" placeholder="Título do vídeo" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Tópico</label>
                    <input className="input" placeholder="Ex: produtividade..." value={topic} onChange={(e) => setTopic(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Tipo</label>
                    <select className="select" value={videoType} onChange={(e) => setVideoType(e.target.value)}>
                      {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — Transcript */}
            <div className="card p-5 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><AlignLeft size={13} /></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Transcrição do Vídeo</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Análise mais precisa — IA lê o conteúdo real</p>
                  </div>
                </div>
                {transcript.trim().length > 30 && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">✓ Pronta</span>
                )}
              </div>

              {/* Auto-transcribe section */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Mic size={10} /> Transcrição automática com Whisper AI
                </p>

                {groqKey ? (
                  /* Groq key configured — show transcribe button */
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                      <ShieldCheck size={11} /> <span>Groq Whisper ativo</span>
                      <button onClick={handleRemoveGroqKey} className="ml-auto text-emerald-400 hover:text-red-400" title="Remover chave"><X size={10} /></button>
                    </div>
                    {videoFile ? (
                      <div className="flex gap-2">
                        <select
                          className="select text-xs py-1.5"
                          value={transcriptLang}
                          onChange={(e) => setTranscriptLang(e.target.value)}
                        >
                          <option value="pt">Português</option>
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="auto">Auto-detectar</option>
                        </select>
                        <button
                          onClick={handleTranscribe}
                          disabled={transcribing}
                          className="btn-primary flex-1 text-xs py-1.5"
                          style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                        >
                          {transcribing
                            ? <><RefreshCw size={12} className="animate-spin" /> Transcrevendo...</>
                            : <><Mic size={12} /> Transcrever Arquivo</>
                          }
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 text-center">
                        <p className="text-[11px] text-emerald-600 w-full">
                          Envie um arquivo de vídeo ou áudio no painel ao lado para transcrever automaticamente
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* No Groq key — invite to configure */
                  <button
                    onClick={() => setShowGroqModal(true)}
                    className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-emerald-300 hover:border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 text-left transition-all group"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-100 shrink-0">
                      <Mic size={13} className="text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-gray-800">Ativar transcrição automática</p>
                      <p className="text-[10px] text-gray-400">Configure uma chave Groq gratuita — 7.200 min/dia com Whisper AI</p>
                    </div>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                  </button>
                )}

                {/* YouTube tip */}
                {url.includes('youtube') || url.includes('youtu.be') ? (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100">
                    <span className="text-[13px] shrink-0">▶</span>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-700">Para YouTube</p>
                      <p className="text-[10px] text-gray-400">No YouTube: clique em "…" abaixo do vídeo → <strong>Transcrição</strong> → selecione tudo → cole aqui</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Transcript textarea */}
              <div className="flex-1 flex flex-col">
                <textarea
                  className="input flex-1 min-h-[240px] resize-none text-xs leading-relaxed"
                  placeholder={`Cole aqui a transcrição real do vídeo...

A IA irá citar trechos EXATOS da transcrição no gancho, promessa, CTA e padrões detectados. Nenhuma frase será inventada.

Quanto mais completa a transcrição, mais precisa será a análise.`}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-gray-400">{transcript.length} caracteres</p>
                  {transcript.trim().length > 0 && (
                    <button
                      onClick={() => setTranscript('')}
                      className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Data availability indicator */}
              <div className="pt-3 border-t border-gray-100 space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Dados disponíveis para análise</p>
                {[
                  {
                    label: 'Transcrição real',
                    active: transcript.trim().length > 30,
                    color: 'bg-emerald-500',
                    desc: 'Citações exatas do conteúdo',
                    required: true,
                  },
                  {
                    label: 'Frames do vídeo',
                    active: frames.length > 0,
                    color: 'bg-violet-500',
                    desc: 'Análise visual real',
                    required: true,
                  },
                  {
                    label: 'URL / Título',
                    active: !!(url.trim() || title.trim()),
                    color: 'bg-blue-300',
                    desc: 'Contexto adicional (não suficiente sozinho)',
                    required: false,
                  },
                ].map(({ label, active, color, desc, required }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${active ? color : 'bg-gray-200'}`} />
                    <p className={`text-[10px] ${active ? 'text-gray-700 font-medium' : required ? 'text-red-400' : 'text-gray-400'}`}>{label}</p>
                    <p className="text-[10px] text-gray-300 hidden sm:block">— {desc}</p>
                  </div>
                ))}
                {!transcript.trim() && frames.length === 0 && (url.trim() || title.trim()) && (
                  <p className="text-[10px] text-amber-500 font-medium mt-1">
                    ◌ Análise por inferência — adicione transcrição para resultados mais precisos
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Error + Analyze button */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Upgrade-path hint — shown only when no real data (inference mode) */}
          {!hasRealData && !extractingFrames && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <Info size={12} /> Análise por inferência — para análise mais precisa:
              </p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold text-xs shrink-0">①</span>
                  <p className="text-xs text-gray-600">
                    <strong>Transcrição automática:</strong> envie o arquivo de áudio/vídeo no painel esquerdo e clique em "Transcrever Arquivo"
                    {!groqKey && <> — <button onClick={() => setShowGroqModal(true)} className="text-emerald-600 hover:underline font-medium">ativar Groq gratuito</button></>}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold text-xs shrink-0">②</span>
                  <p className="text-xs text-gray-600">
                    <strong>YouTube:</strong> abra o vídeo → clique em "…" → <strong>Transcrição</strong> → selecione tudo → cole na caixa à direita
                  </p>
                </div>
              </div>
            </div>
          )}

          {!apiKey && (
            <button
              onClick={() => setShowKeyModal(true)}
              className="btn-primary w-full py-2 text-xs mb-2"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              <Key size={13} /> Adicionar API Key para Analisar
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={extractingFrames || !hasAnyData}
            className="btn-primary w-full py-3 text-sm"
            style={{ background: canAnalyze ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : undefined }}
          >
            {extractingFrames
              ? <><RefreshCw size={15} className="animate-spin" /> Extraindo frames do vídeo...</>
              : transcribing
              ? <><RefreshCw size={15} className="animate-spin" /> Transcrevendo com Whisper...</>
              : videoFile && groqKey && transcript.trim().length < 30
              ? <><Mic size={15} /> Transcrever e Analisar com IA</>
              : <><Sparkles size={15} /> Analisar Vídeo com IA</>
            }
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-16 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
            <Sparkles size={18} className="absolute inset-0 m-auto text-violet-500" />
          </div>
          <div className="text-center space-y-1.5">
            {STEPS.map((step, i) => (
              <p key={i} className={`text-sm transition-all duration-300 ${
                i === loadingStep ? 'font-semibold text-gray-800' :
                i < loadingStep ? 'text-gray-300 line-through' : 'text-gray-300'
              }`}>
                {i < loadingStep ? '✓ ' : i === loadingStep ? '⟳ ' : ''}{step}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Analysis result */}
      {analysis && !loading && (
        <div className="space-y-4 animate-slide-up">
          {/* Result header */}
          <div className="card p-4 flex items-center gap-4 flex-wrap border border-violet-100">
            {thumbnail && <img src={thumbnail} alt="thumb" className="w-20 h-12 object-cover rounded-lg shrink-0" />}
            {!thumbnail && frames.length > 0 && (
              <img src={frames[0].dataUrl} alt="frame" className="w-20 h-12 object-cover rounded-lg shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`chip border text-[10px] ${ARCHETYPE_COLORS[analysis.archetype] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {ARCHETYPE_LABELS[analysis.archetype] || analysis.archetype}
                </span>
                {SOURCE_BADGE[analysisSource] && (
                  <span className={`chip border text-[10px] flex items-center gap-1 ${SOURCE_BADGE[analysisSource].color}`}>
                    {SOURCE_BADGE[analysisSource].label}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">{title || url || 'Vídeo analisado'}</p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {topic && <p className="text-xs text-gray-400">Tópico: {topic}</p>}
                {analysis.overview?.primary_audience && <p className="text-xs text-gray-400">Para: {analysis.overview.primary_audience}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!savedAnalysis ? (
                <button
                  onClick={handleSaveAnalysis}
                  className="btn-primary text-xs"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  <Bookmark size={12} /> Salvar na Biblioteca
                </button>
              ) : (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                  <BookMarked size={12} /> Salvo na Biblioteca
                </span>
              )}
              <button onClick={handleReset} className="btn-secondary text-xs"><RotateCcw size={12} /> Nova</button>
            </div>
          </div>

          {/* Overview row */}
          {analysis.overview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Tipo', val: ARCHETYPE_LABELS[analysis.archetype] || analysis.archetype, icon: Film },
                { label: 'Duração est.', val: analysis.overview.estimated_duration || '—', icon: Clock },
                { label: 'Plataforma', val: analysis.overview.platform_fit || '—', icon: Globe },
                { label: 'Ponto forte', val: analysis.overview.key_strength || '—', icon: Star },
              ].map(({ label, val, icon: Icon }) => (
                <div key={label} className="card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                    <Icon size={10} /> {label}
                  </div>
                  <p className="text-xs font-semibold text-gray-800 leading-snug">{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === t.id ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-700'
                }`}>
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          {/* ── RESUMO ──────────────────────────────────────────────────────── */}
          {activeTab === 'resumo' && (
            <div className="space-y-4">
              {/* Overview card */}
              {analysis.summary && (
                <div className="card p-5 space-y-4 border border-violet-100 bg-violet-50/20">
                  <div className="flex items-center gap-2">
                    <AlignLeft size={15} className="text-violet-500" />
                    <h3 className="text-sm font-semibold text-gray-900">Resumo do Vídeo</h3>
                    {analysis.summary.content_type && (
                      <span className="ml-auto text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">
                        {analysis.summary.content_type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary.overview}</p>

                  {analysis.summary.main_message && (
                    <div className="p-3 rounded-xl bg-white border border-violet-100 flex items-start gap-2">
                      <Zap size={13} className="text-violet-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-wide mb-1">Mensagem central</p>
                        <p className="text-xs text-gray-700 font-medium italic">"{analysis.summary.main_message}"</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysis.summary.key_topics?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-2">Tópicos abordados</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.summary.key_topics.map((t, i) => (
                            <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.summary.creator_positioning && (
                      <div>
                        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-2">Posicionamento do criador</p>
                        <p className="text-xs text-gray-600">{analysis.summary.creator_positioning}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick stats from overview */}
              {analysis.overview && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Arquétipo', val: ARCHETYPE_LABELS[analysis.archetype] || analysis.archetype, icon: Film },
                    { label: 'Duração est.', val: analysis.overview.estimated_duration || '—', icon: Clock },
                    { label: 'Plataforma ideal', val: analysis.overview.platform_fit || '—', icon: Globe },
                    { label: 'Ponto forte', val: analysis.overview.key_strength || '—', icon: Star },
                  ].map(({ label, val, icon: Icon }) => (
                    <div key={label} className="card p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                        <Icon size={10} /> {label}
                      </div>
                      <p className="text-xs font-semibold text-gray-800 leading-snug">{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Why it works — teaser */}
              {analysis.why_it_works?.length > 0 && (
                <div className="card p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                    <Star size={13} className="text-orange-500" /> Por que funciona
                  </p>
                  <div className="space-y-2">
                    {analysis.why_it_works.slice(0, 3).map((w, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <div>
                          <p className="text-xs font-medium text-gray-800">{w.reason}</p>
                          <p className="text-[11px] text-gray-400">{w.impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('porque')}
                    className="text-[11px] text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 mt-1"
                  >
                    Ver análise completa <ChevronRight size={11} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── ESTRUTURA ───────────────────────────────────────────────────── */}
          {activeTab === 'estrutura' && (
            <div className="space-y-4">
              {/* Hook */}
              <div className="card p-5 border border-orange-200 bg-orange-50/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-orange-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Gancho — {analysis.structure?.hook?.type}</h3>
                  <span className="chip bg-orange-100 text-orange-700 border border-orange-200 text-[10px] ml-auto">{analysis.structure?.hook?.duration}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{analysis.structure?.hook?.description}</p>
                {analysis.structure?.hook?.text && (
                  <div className="bg-white rounded-lg p-3 border border-orange-100">
                    <p className="text-[10px] text-orange-500 font-medium mb-1">GANCHO / ABERTURA:</p>
                    <p className="text-xs text-gray-700 italic">"{analysis.structure.hook.text}"</p>
                  </div>
                )}
                <p className="text-[11px] text-emerald-600 font-medium">✓ {analysis.structure?.hook?.effectiveness}</p>
              </div>

              {/* Promise */}
              {analysis.structure?.promise?.text && (
                <div className="card p-4 space-y-2 border border-blue-100 bg-blue-50/30">
                  <div className="flex items-center gap-2">
                    <ArrowRight size={13} className="text-blue-500" />
                    <h3 className="text-xs font-semibold text-gray-800">Promessa de Valor</h3>
                  </div>
                  <p className="text-xs text-gray-700 italic bg-white/60 rounded p-2">"{analysis.structure.promise.text}"</p>
                  <p className="text-xs text-gray-500">{analysis.structure.promise.description}</p>
                </div>
              )}

              {/* Context */}
              {analysis.structure?.context && (
                <div className="card p-4 space-y-2 border border-gray-200 bg-gray-50/40">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">C</div>
                    <h3 className="text-xs font-semibold text-gray-800">Contexto / Credencial</h3>
                  </div>
                  <p className="text-xs text-gray-500">{analysis.structure.context.description}</p>
                  {analysis.structure.context.example && (
                    <p className="text-xs text-gray-600 italic bg-white/60 rounded p-2">"{analysis.structure.context.example}"</p>
                  )}
                </div>
              )}

              {/* Main sections */}
              {(analysis.structure?.main_sections || analysis.structure?.main_points)?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seções Principais</h3>
                  {(analysis.structure.main_sections || analysis.structure.main_points).map((pt, i) => (
                    <div key={i} className="card p-4 flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">{i + 1}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{pt.name || pt.point}</p>
                          <span className="text-[10px] text-gray-400 shrink-0">{pt.duration}</span>
                        </div>
                        <p className="text-xs text-gray-500">{pt.content || pt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Proof + Conclusion + CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {analysis.structure?.proof && (
                  <div className="card p-4 space-y-2 border border-amber-100 bg-amber-50/30">
                    <div className="flex items-center gap-2">
                      <Star size={12} className="text-amber-500" />
                      <h3 className="text-xs font-semibold text-gray-800">Prova / Exemplo</h3>
                    </div>
                    <p className="text-xs text-gray-500">{analysis.structure.proof.description}</p>
                    {analysis.structure.proof.example && <p className="text-xs text-gray-600 italic">"{analysis.structure.proof.example}"</p>}
                  </div>
                )}
                {(analysis.structure?.conclusion || analysis.structure?.closing) && (
                  <div className="card p-4 space-y-2 border border-emerald-100 bg-emerald-50/30">
                    <div className="flex items-center gap-2">
                      <Target size={12} className="text-emerald-500" />
                      <h3 className="text-xs font-semibold text-gray-800">Fechamento</h3>
                    </div>
                    <p className="text-xs text-gray-500">{(analysis.structure.conclusion || analysis.structure.closing)?.description}</p>
                    {(analysis.structure.conclusion || analysis.structure.closing)?.example && (
                      <p className="text-xs text-gray-600 italic">"{(analysis.structure.conclusion || analysis.structure.closing).example}"</p>
                    )}
                  </div>
                )}
                {analysis.structure?.cta && (
                  <div className="card p-4 space-y-2 border border-violet-100 bg-violet-50/30">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={12} className="text-violet-500" />
                      <h3 className="text-xs font-semibold text-gray-800">CTA</h3>
                      <span className="chip bg-violet-100 text-violet-700 border border-violet-200 text-[10px] ml-auto">{analysis.structure.cta.type}</span>
                    </div>
                    {analysis.structure.cta.text && <p className="text-xs text-gray-700 italic">"{analysis.structure.cta.text}"</p>}
                    <p className="text-xs text-gray-500">{analysis.structure.cta.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TOM & PADRÕES ────────────────────────────────────────────────── */}
          {activeTab === 'tom' && (
            <div className="space-y-5">
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Mic size={15} className="text-purple-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Análise de Tom de Voz</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Tom Primário', val: analysis.tone?.primary, c: 'bg-purple-50 border-purple-100' },
                    { label: 'Tom Secundário', val: analysis.tone?.secondary, c: 'bg-indigo-50 border-indigo-100' },
                    { label: 'Formalidade', val: analysis.tone?.formality, c: 'bg-gray-50 border-gray-200' },
                    { label: 'Abordagem', val: analysis.tone?.approach, c: 'bg-gray-50 border-gray-200' },
                  ].filter((x) => x.val).map(({ label, val, c }) => (
                    <div key={label} className={`rounded-xl p-3 border ${c}`}>
                      <p className="text-[10px] text-gray-400 font-medium mb-1 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-bold text-gray-800 capitalize">{val}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{analysis.tone?.description}</p>
                {analysis.tone?.voice_characteristics && (
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100 italic">{analysis.tone.voice_characteristics}</p>
                )}
                {analysis.tone?.markers?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-700">Marcadores de Tom</p>
                    {analysis.tone.markers.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-purple-400 shrink-0">•</span>{m}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp size={15} className="text-amber-500" /> Padrões de Conteúdo Identificados
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {(analysis.patterns || []).map((p, i) => (
                    <div key={i} className="card p-4 space-y-2 border border-amber-100 bg-amber-50/30">
                      <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.description}</p>
                      {p.example && (
                        <p className="text-xs text-gray-600 italic bg-white/60 rounded p-2 border border-amber-100/50">"{p.example}"</p>
                      )}
                      <div className="flex items-start gap-1.5 bg-white/70 rounded-lg p-2.5 border border-amber-100/50">
                        <Sparkles size={11} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-gray-600">{p.why_effective}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── RETENÇÃO ──────────────────────────────────────────────────────── */}
          {activeTab === 'retencao' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Eye size={15} className="text-sky-500" /> Técnicas de Retenção de Audiência
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {(analysis.retention || []).map((r, i) => (
                    <div key={i} className="card p-4 space-y-2 border border-sky-100 bg-sky-50/30">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[10px] font-bold text-sky-600 shrink-0">{i + 1}</div>
                        <p className="text-xs font-semibold text-gray-800">{r.technique}</p>
                      </div>
                      <p className="text-xs text-gray-500">{r.description}</p>
                      <div className="bg-white/70 rounded-lg p-2.5 border border-sky-100/50">
                        <p className="text-[11px] text-gray-600 italic">{r.example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5 space-y-4 border border-gray-200">
                <div className="flex items-center gap-2">
                  <Film size={15} className="text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Estilo Visual e Edição</h3>
                  {frames.length > 0 && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Baseado em frames reais</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Ritmo de Edição', val: analysis.visual?.editing_pace },
                    { label: 'Mudanças de Cena', val: analysis.visual?.scene_changes },
                    { label: 'Texto na Tela', val: analysis.visual?.text_overlays || analysis.visual?.text_style },
                    { label: 'Enquadramento', val: analysis.visual?.framing },
                  ].filter((x) => x.val).map(({ label, val }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-medium mb-1 uppercase tracking-wide">{label}</p>
                      <p className="text-xs text-gray-600">{val}</p>
                    </div>
                  ))}
                </div>
                {analysis.visual?.key_techniques?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {analysis.visual.key_techniques.map((t, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{t}</span>
                    ))}
                  </div>
                )}
                {frames.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Frames Analisados</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {frames.map((f, i) => (
                        <div key={i} className="relative rounded-lg overflow-hidden aspect-video bg-gray-100 border border-gray-200">
                          <img src={f.dataUrl} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/60 text-white px-0.5 rounded">{f.time}s</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── POR QUE FUNCIONA ──────────────────────────────────────────────── */}
          {activeTab === 'porque' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Star size={15} className="text-orange-500" /> Por Que Esse Vídeo Funciona
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {(analysis.why_it_works || []).map((w, i) => (
                  <div key={i} className="card p-4 space-y-1.5 border border-orange-100 bg-orange-50/20">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[11px] font-bold text-orange-600 shrink-0">{i + 1}</div>
                      <p className="text-xs font-semibold text-gray-800">{w.reason}</p>
                    </div>
                    <p className="text-xs text-gray-500 pl-8">{w.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TEMPLATE ──────────────────────────────────────────────────────── */}
          {activeTab === 'template' && analysis.template && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900">{analysis.template.name}</h3>
                <div className="flex items-center gap-2">
                  {apiKey && (
                    <button
                      onClick={handleGenerateScript}
                      disabled={generatingScript}
                      className="btn-primary text-xs"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                    >
                      {generatingScript
                        ? <><RefreshCw size={12} className="animate-spin" /> Gerando roteiro...</>
                        : <><Sparkles size={12} /> Gerar Roteiro Completo</>
                      }
                    </button>
                  )}
                  <button onClick={handleCopyTemplate} className="btn-secondary text-xs">
                    {copied ? <><Check size={12} className="text-emerald-500" /> Copiado!</> : <><Copy size={12} /> Copiar Template</>}
                  </button>
                </div>
              </div>
              <div className="card p-4 space-y-3 border border-orange-200 bg-orange-50/30">
                <p className="text-[11px] text-orange-500 font-semibold uppercase tracking-wide">Fórmula do Gancho</p>
                <p className="text-sm font-medium text-gray-800">{analysis.template.hook_formula}</p>
                <div className="bg-white/70 rounded-lg p-3 border border-orange-100">
                  <p className="text-[10px] text-gray-400 mb-1">EXEMPLO:</p>
                  <p className="text-xs text-gray-700 italic">{analysis.template.hook_example}</p>
                </div>
              </div>
              {analysis.template.promise_formula && (
                <div className="card p-4 space-y-2 border border-blue-100 bg-blue-50/30">
                  <p className="text-[11px] text-blue-500 font-semibold uppercase tracking-wide">Fórmula da Promessa</p>
                  <p className="text-xs text-gray-700">{analysis.template.promise_formula}</p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seções do Vídeo</p>
                {(analysis.template.sections || []).map((s, i) => (
                  <div key={i} className="card p-4 flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-600 shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">{s.duration}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{s.goal}</p>
                      {s.formula && <p className="text-[11px] text-violet-600 mt-1 italic">Fórmula: {s.formula}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="card p-4 space-y-2 border border-emerald-100 bg-emerald-50/30">
                  <p className="text-[11px] text-emerald-500 font-semibold uppercase tracking-wide">Fórmula de Fechamento</p>
                  <p className="text-xs text-gray-700">{analysis.template.closing_formula}</p>
                </div>
                {analysis.template.cta_formula && (
                  <div className="card p-4 space-y-2 border border-violet-100 bg-violet-50/30">
                    <p className="text-[11px] text-violet-500 font-semibold uppercase tracking-wide">Fórmula de CTA</p>
                    <p className="text-xs text-gray-700">{analysis.template.cta_formula}</p>
                  </div>
                )}
              </div>
              <div className="card p-4 space-y-3">
                <p className="text-[11px] text-amber-500 font-semibold uppercase tracking-wide">Dicas para Replicar</p>
                {(analysis.template.tips || []).map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight size={13} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-600">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── IDEIAS ────────────────────────────────────────────────────────── */}
          {activeTab === 'ideias' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{(analysis.content_ideas || []).length} ideias inspiradas neste vídeo</p>
                <p className="text-xs text-gray-400">Salve direto no Hub de Ideias</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {(analysis.content_ideas || []).map((idea, i) => {
                  const isEditing = editingIdeaIdx === i
                  const current = editedIdeas[i] || idea
                  return (
                    <div key={i} className="card p-4 space-y-3 hover:border-orange-300 transition-colors relative overflow-hidden">
                      {savedIdeas.has(idea.title) && (
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 bg-emerald-100 border border-emerald-200 rounded-full">
                          <Check size={10} className="text-emerald-600" />
                          <span className="text-[10px] font-semibold text-emerald-700">Salvo</span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        {isEditing ? (
                          <input className="input text-xs font-semibold flex-1" value={current.title} onChange={(e) => setEditedIdeas(p => ({ ...p, [i]: { ...current, title: e.target.value } }))} />
                        ) : (
                          <p className="text-xs font-semibold text-gray-800 leading-snug">{current.title}</p>
                        )}
                        <span className="text-[10px] text-gray-300 shrink-0">#{i + 1}</span>
                      </div>
                      {current.hook && (
                        <div className="bg-orange-50 rounded-lg p-2.5 border border-orange-100">
                          <p className="text-[10px] text-orange-500 font-medium mb-0.5">GANCHO SUGERIDO:</p>
                          {isEditing ? (
                            <textarea className="input text-[11px] resize-none min-h-[40px]" value={current.hook} onChange={(e) => setEditedIdeas(p => ({ ...p, [i]: { ...current, hook: e.target.value } }))} />
                          ) : (
                            <p className="text-[11px] text-gray-700 italic">"{current.hook}"</p>
                          )}
                        </div>
                      )}
                      {isEditing && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium mb-0.5">ÂNGULO:</p>
                          <input className="input text-[11px]" value={current.angle || ''} onChange={(e) => setEditedIdeas(p => ({ ...p, [i]: { ...current, angle: e.target.value } }))} />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="chip bg-gray-100 text-gray-600 border border-gray-200 text-[10px]">{current.platform}</span>
                        <span className="chip bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px]">{current.format}</span>
                        <span className="chip bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">{current.hook_type}</span>
                      </div>
                      {!isEditing && <p className="text-[11px] text-gray-400 italic">{current.angle}</p>}
                      {current.why_now && (
                        <p className="text-[10px] text-emerald-600 font-medium">⚡ {current.why_now}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) { setEditingIdeaIdx(null) } else { if (!editedIdeas[i]) setEditedIdeas(p => ({ ...p, [i]: { ...idea } })); setEditingIdeaIdx(i) }
                          }}
                          className="btn-secondary text-xs py-1.5 flex-1"
                        >
                          {isEditing ? <><Check size={12} /> Pronto</> : <><Pencil size={12} /> Editar</>}
                        </button>
                        <button onClick={() => handleSaveIdea(editedIdeas[i] || idea)} className="btn-primary text-xs py-1.5 flex-1">
                          <Plus size={12} /> Salvar no Hub
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TRANSCRIÇÃO ───────────────────────────────────────────────────── */}
          {activeTab === 'transcricao' && (
            <div className="space-y-4">
              {transcript && transcript.trim().length > 30 ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-emerald-500" />
                      <h3 className="text-sm font-semibold text-gray-900">Transcrição Real</h3>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">✦ Conteúdo original</span>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(transcript)}
                      className="btn-secondary text-xs"
                    >
                      <Copy size={12} /> Copiar
                    </button>
                  </div>
                  <div className="card p-5 bg-emerald-50/20 border border-emerald-100 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">
                      <Check size={11} /> Transcrição fornecida — {transcript.trim().split(/\s+/).length} palavras
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                  </div>

                  {/* Detected structure from transcript */}
                  {analysis.structure && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                        <Zap size={12} className="text-orange-500" /> Estrutura detectada na transcrição
                      </p>
                      <div className="space-y-2">
                        {analysis.structure.hook?.text && (
                          <div className="card p-3 border border-orange-100 bg-orange-50/30">
                            <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wide mb-1">Gancho detectado ({analysis.structure.hook.type})</p>
                            <p className="text-xs text-gray-800 italic">"{analysis.structure.hook.text}"</p>
                          </div>
                        )}
                        {analysis.structure.promise?.text && (
                          <div className="card p-3 border border-blue-100 bg-blue-50/30">
                            <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide mb-1">Promessa detectada</p>
                            <p className="text-xs text-gray-800 italic">"{analysis.structure.promise.text}"</p>
                          </div>
                        )}
                        {analysis.structure.cta?.text && (
                          <div className="card p-3 border border-violet-100 bg-violet-50/30">
                            <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-wide mb-1">CTA detectado</p>
                            <p className="text-xs text-gray-800 italic">"{analysis.structure.cta.text}"</p>
                          </div>
                        )}
                        {analysis.patterns?.filter(p => p.example).map((p, i) => (
                          <div key={i} className="card p-3 border border-amber-100 bg-amber-50/30">
                            <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wide mb-1">Padrão: {p.name}</p>
                            <p className="text-xs text-gray-800 italic">"{p.example}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="card p-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
                    <Mic size={22} className="text-amber-400" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm text-gray-700 font-semibold">Análise feita sem transcrição</p>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">
                      {analysisSource === 'frames'
                        ? 'A análise usou os frames visuais do vídeo. Para citações reais e estrutura de falas, adicione a transcrição.'
                        : 'A análise foi por inferência (título/URL). Para resultados reais, adicione a transcrição do áudio.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {videoFile && groqKey ? (
                      <button
                        onClick={async () => {
                          setTranscribing(true)
                          try {
                            const text = await transcribeWithGroq(groqKey, videoFile, transcriptLang)
                            if (text?.trim()) setTranscript(text.trim())
                          } catch(e) { setError(e.message) }
                          finally { setTranscribing(false) }
                        }}
                        disabled={transcribing}
                        className="btn-primary text-xs py-2 px-4"
                        style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                      >
                        {transcribing
                          ? <><RefreshCw size={12} className="animate-spin" /> Transcrevendo...</>
                          : <><Mic size={12} /> Transcrever e Reanalisar</>
                        }
                      </button>
                    ) : !groqKey ? (
                      <button
                        onClick={() => setShowGroqModal(true)}
                        className="btn-primary text-xs py-2 px-4"
                        style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                      >
                        <Mic size={12} /> Ativar Whisper (gratuito)
                      </button>
                    ) : null}
                    <button onClick={handleReset} className="btn-secondary text-xs">
                      <RotateCcw size={12} /> Nova análise
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ANALISADOR DE COMENTÁRIOS ─────────────────────────────────── */}
          {activeTab === 'comentarios' && (
            <CommentAnalyzer />
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMMENT ANALYZER — Analisa prints de comentários e sugere conteúdos
   ══════════════════════════════════════════════════════════════════════════════ */
function CommentAnalyzer() {
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [error, setError] = useState('')
  const addIdea = useStore(s => s.addIdea)
  const brandVoice = useStore(s => s.brandVoice)
  const fileRef = useRef(null)

  const addComment = () => {
    if (!commentText.trim()) return
    setComments(prev => [...prev, { id: Date.now(), text: commentText.trim(), source: 'text' }])
    setCommentText('')
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key da Anthropic primeiro'); return }

    setAnalyzing(true)
    setError('')
    try {
      for (const file of files) {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.readAsDataURL(file)
        })
        const mediaType = file.type || 'image/png'

        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text', text: 'Extraia TODOS os comentários visíveis nesta imagem. Retorne APENAS um JSON array de strings, cada string sendo um comentário completo. Exemplo: ["comentário 1", "comentário 2"]. Se não houver comentários, retorne []. Sem markdown, sem explicação.' }
              ]
            }]
          })
        })
        const data = await resp.json()
        const text = data.content?.[0]?.text || '[]'
        try {
          const clean = text.replace(/```json\n?|\n?```/g, '').trim()
          const extracted = JSON.parse(clean)
          if (Array.isArray(extracted)) {
            setComments(prev => [...prev, ...extracted.map(c => ({ id: Date.now() + Math.random(), text: c, source: 'image' }))])
          }
        } catch { setComments(prev => [...prev, { id: Date.now(), text: text, source: 'image' }]) }
      }
    } catch (e) { setError(e.message) }
    finally { setAnalyzing(false) }
    if (fileRef.current) fileRef.current.value = ''
  }

  const analyzeComments = async () => {
    if (!comments.length) return
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { setError('Configure sua API key da Anthropic primeiro'); return }

    setAnalyzing(true)
    setError('')
    setSuggestions(null)
    try {
      const voiceContext = brandVoice?.prompt ? `\n\nVOZ DO CRIADOR:\n${brandVoice.prompt}` : ''
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `Você é um estrategista de conteúdo especializado em transformar dores e dúvidas reais da audiência em conteúdos de alto impacto.
${voiceContext}

COMENTÁRIOS DA AUDIÊNCIA:
${comments.map((c, i) => `${i + 1}. "${c.text}"`).join('\n')}

Analise esses comentários e identifique:
1. Os PERFIS DE DOR (agrupamento de problemas/frustrações similares)
2. Para CADA perfil de dor, sugira 2-3 conteúdos que resolvam, eduquem ou conectem com essa pessoa

Responda APENAS com JSON válido, sem markdown:
{
  "pain_profiles": [
    {
      "name": "nome do perfil de dor",
      "description": "o que essas pessoas sentem/enfrentam",
      "comments_count": 3,
      "intensity": "alta|média|baixa",
      "content_ideas": [
        {
          "title": "título do conteúdo sugerido",
          "format": "carrossel|reel|stories|thread|artigo",
          "hook": "frase de abertura sugerida",
          "angle": "abordagem/ângulo do conteúdo",
          "why": "por que esse conteúdo resolve essa dor"
        }
      ]
    }
  ],
  "meta_insight": "insight geral sobre o que a audiência está pedindo entre linhas"
}`
          }]
        })
      })
      const data = await resp.json()
      const text = data.content?.[0]?.text || '{}'
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      setSuggestions(JSON.parse(clean))
    } catch (e) { setError(e.message) }
    finally { setAnalyzing(false) }
  }

  const handleSaveIdea = (idea, profileName) => {
    addIdea({
      title: idea.title,
      description: `Ângulo: ${idea.angle}\n\nGancho: ${idea.hook}\n\nPor quê: ${idea.why}\n\nPerfil de dor: ${profileName}`,
      format: idea.format,
      hook_type: 'pain-point',
      priority: 'high',
      status: 'idea',
      tags: ['comentarios', 'dor-audiencia'],
    })
  }

  const removeComment = (id) => setComments(prev => prev.filter(c => c.id !== id))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
            <MessageSquare size={18} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Analisador de Comentários</h3>
            <p className="text-[11px] text-gray-500">Printe comentários do seu nicho e a IA sugere conteúdos para resolver essas dores</p>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Adicionar comentários</h4>
        </div>

        {/* Upload image */}
        <div className="flex gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={analyzing}
            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-indigo-200 rounded-xl text-sm text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer"
          >
            <Upload size={16} />
            {analyzing ? 'Extraindo comentários...' : 'Upload de print (imagem)'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Manual text input */}
        <div className="flex gap-2">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Ou cole um comentário manualmente..."
            rows={2}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />
          <button
            onClick={addComment}
            disabled={!commentText.trim()}
            className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {comments.length} comentário{comments.length !== 1 ? 's' : ''} coletado{comments.length !== 1 ? 's' : ''}
            </h4>
            <button
              onClick={() => setComments([])}
              className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
            >
              Limpar todos
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {comments.map(c => (
              <div key={c.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg group">
                <MessageSquare size={13} className={`mt-0.5 shrink-0 ${c.source === 'image' ? 'text-indigo-400' : 'text-gray-400'}`} />
                <p className="text-xs text-gray-700 flex-1 leading-relaxed">{c.text}</p>
                <button
                  onClick={() => removeComment(c.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Analyze button */}
          <button
            onClick={analyzeComments}
            disabled={analyzing}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <><Loader2 size={16} className="animate-spin" /> Analisando dores...</>
            ) : (
              <><Sparkles size={16} /> Analisar e Sugerir Conteúdos</>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>
      )}

      {/* Results */}
      {suggestions && (
        <div className="space-y-4">
          {/* Meta insight */}
          {suggestions.meta_insight && (
            <div className="card p-4 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-2">
                <Zap size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Insight geral da audiência</p>
                  <p className="text-xs text-gray-700">{suggestions.meta_insight}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pain profiles */}
          {(suggestions.pain_profiles || []).map((profile, pi) => (
            <div key={pi} className="card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      profile.intensity === 'alta' ? 'bg-red-500' :
                      profile.intensity === 'média' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`} />
                    <h4 className="text-sm font-bold text-gray-900">{profile.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {profile.comments_count} comentário{profile.comments_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{profile.description}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  profile.intensity === 'alta' ? 'bg-red-100 text-red-700' :
                  profile.intensity === 'média' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  Dor {profile.intensity}
                </span>
              </div>

              <div className="space-y-2">
                {(profile.content_ideas || []).map((idea, ii) => (
                  <div key={ii} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Lightbulb size={13} className="text-indigo-500" />
                          <span className="text-sm font-semibold text-gray-900">{idea.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{idea.format}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSaveIdea(idea, profile.name)}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <Plus size={12} /> Salvar
                      </button>
                    </div>
                    {idea.hook && (
                      <p className="text-xs text-gray-600"><span className="font-medium text-gray-800">Gancho:</span> "{idea.hook}"</p>
                    )}
                    {idea.angle && (
                      <p className="text-xs text-gray-600"><span className="font-medium text-gray-800">Ângulo:</span> {idea.angle}</p>
                    )}
                    {idea.why && (
                      <p className="text-xs text-gray-500 italic">{idea.why}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
