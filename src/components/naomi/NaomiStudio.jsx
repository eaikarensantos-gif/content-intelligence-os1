import { useState, useRef } from 'react'
import {
  Sparkles, Loader2, Copy, Check, RefreshCw, Upload, X,
  Briefcase, Quote, Brain, ChevronDown, ChevronUp, Camera,
  Film, Monitor, MessageSquare, Clapperboard,
} from 'lucide-react'
import clsx from 'clsx'

const LS_KEY = 'cio-anthropic-key'

const NAOMI_SYSTEM = `You are the character content generator for Critical Content Coach.

NAOMI — PHYSICAL REFERENCE (always consistent):
French bulldog. Dark brindle coat. Black mask. Flat face. Large bat ears. Brown eyes. Gray collar.
Fixed title: HR Manager.
Expression: always flat — no raised eyebrows, no excitement, no overreaction.
Posture: she observes, documents, and judges with precision.
Character arc: wants Karen to be healthier, less anxious, and to follow through on what she promises. She never succeeds. That is the character.

KAREN — REFERENCE:
Senior designer, AI specialist, Samsung brand ambassador.
Content universe: career, professional maturity, corporate life.
Tone: dry and analytical.
When Karen appears in frame: she never looks at the camera.

FIXED RULES — NEVER BREAK:
- No Apple devices visible in any scene
- Desk surface always clean and black
- Black wired keyboard only
- Naomi's expression is always flat
- Karen never looks at the camera when in frame
- ALL text content in Brazilian Portuguese — scene directions, camera descriptions, on-screen text, video prompts, captions, titles. Only the JSON keys stay in English.

Respond EXCLUSIVELY with valid JSON.`

const VIDEO_TOOLS = [
  { id: 'kling',  label: 'Kling',   note: 'Format for Kling AI. Structure: [scene setup], [character motion], [camera movement], [duration per shot]. Emphasize consistency between cuts.' },
  { id: 'hailuo', label: 'Hailuo',  note: 'Format for Hailuo (MiniMax). Lead with physical character description, then scene setup, then motion sequence. Emphasize frame-to-frame consistency.' },
  { id: 'gemini', label: 'Gemini Veo', note: 'Format for Google Veo. Use natural flowing description. Emphasize visual style, character consistency across temporal sequence, and lighting.' },
  { id: 'other',  label: 'Outro',   note: 'Format as a universal video generation prompt. Explicit physical descriptions, scene composition, camera angles, and shot timing.' },
]

const buildPrompt = ({ situation, videoTool, hasPhoto }) => {
  const tool = VIDEO_TOOLS.find(t => t.id === videoTool) || VIDEO_TOOLS[0]

  return `${situation
    ? `SITUATION: ${situation}`
    : 'No situation provided. Generate scene content from typical universes: home office workflow, video calls, deadlines, corporate culture, Karen\'s daily routine. Choose the most visually interesting angle.'
  }

VIDEO TOOL: ${tool.label}
TOOL FORMAT NOTE: ${tool.note}
${hasPhoto ? 'A photo reference has been provided. Use it as visual reference for Naomi\'s positioning and the scene environment.' : ''}

Deliver all five sections:
1. SCENE DIRECTION: 2–4 cenas numeradas. Cada uma: duração em segundos, descrição da ação em português, posição e instrução de câmera em português, karen_in_frame true/false.
2. VIDEO PROMPT: Em português. Include Naomi's complete physical reference. Calibrated for ${tool.label}. State total runtime. No Apple devices.
3. ON-SCREEN TEXT: Per scene. Simple font style. Screen position. Entry timing in seconds from scene start.
4. POST CAPTION: Brazilian Portuguese. Naomi's voice, first person. Dry HR tone. HR jargon applied to the domestic or professional context. No motivation. No drama. Ends with data, dry observation, or HR jargon.
5. SITUATIONAL TITLE: If the context calls for it, suggest a temporary title beyond "HR Manager". Examples: Food Welfare Analyst, Overtime Compliance Officer, Unused Benefits Auditor, Domestic Compliance Coordinator.

Respond EXCLUSIVELY with valid JSON:
{
  "situational_title": "HR Manager",
  "situational_title_suggestion": "optional contextual sub-title or null",
  "scene_direction": [
    { "scene": 1, "duration_seconds": 3, "action": "...", "camera": "...", "karen_in_frame": false }
  ],
  "video_prompt": "Prompt completo em português para ${tool.label}...",
  "onscreen_text": [
    { "scene": 1, "text": "...", "font": "...", "position": "...", "timing": "..." }
  ],
  "caption": "...",
  "total_duration_seconds": 0
}`
}

const buildSuggestionsPrompt = () =>
  `Generate 3 short situation descriptions for a video content series featuring Naomi, an HR Manager French bulldog who monitors Karen Santos (senior designer, AI specialist) at her home office.
Universes: home office, video calls, deadlines, company culture, Karen's daily habits.
Each situation: 1 short sentence, dry and specific, visual enough to film.
Respond EXCLUSIVELY with valid JSON: {"situations": ["...", "...", "..."]}`

export default function NaomiStudio() {
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [situation, setSituation] = useState('')
  const [videoTool, setVideoTool] = useState('kling')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showScenes, setShowScenes] = useState(true)
  const [showText, setShowText] = useState(false)
  const [translatedPrompt, setTranslatedPrompt] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [showEnglish, setShowEnglish] = useState(false)
  const photoRef = useRef(null)

  const apiKey = localStorage.getItem(LS_KEY) || ''

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const getSuggestions = async () => {
    if (!apiKey) return
    setSuggestLoading(true)
    setSuggestions([])
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: NAOMI_SYSTEM,
          messages: [{ role: 'user', content: buildSuggestionsPrompt() }],
        }),
      })
      const data = await res.json()
      const match = (data.content?.[0]?.text || '').match(/\{[\s\S]*\}/)
      if (match) setSuggestions(JSON.parse(match[0]).situations || [])
    } catch { /* silent */ }
    finally { setSuggestLoading(false) }
  }

  const generate = async () => {
    if (!apiKey) { setError('Configure sua API key em Configurações'); return }
    setLoading(true)
    setError(null)
    setResult(null)
    setTranslatedPrompt(null)
    setShowEnglish(false)

    try {
      const messages = []

      if (photo && photoPreview) {
        const base64 = photoPreview.split(',')[1]
        const mediaType = photo.type || 'image/jpeg'
        messages.push({
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: buildPrompt({ situation, videoTool, hasPhoto: true }) },
          ],
        })
      } else {
        messages.push({ role: 'user', content: buildPrompt({ situation, videoTool, hasPhoto: false }) })
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 3000, system: NAOMI_SYSTEM, messages }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Erro ${res.status}`)
      }

      const data = await res.json()
      const match = (data.content?.[0]?.text || '').match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta inválida da IA')
      setResult(JSON.parse(match[0]))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const translatePrompt = async () => {
    if (!apiKey || !result?.video_prompt) return
    setTranslating(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          messages: [{ role: 'user', content: `Translate this video generation prompt from Portuguese to English. Keep all technical terms, character descriptions, camera instructions, and formatting intact. Return ONLY the translated prompt, no preamble:\n\n${result.video_prompt}` }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text?.trim() || ''
      if (text) { setTranslatedPrompt(text); setShowEnglish(true) }
    } catch { /* silent */ }
    finally { setTranslating(false) }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">

      {/* Header — Naomi identity card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl shrink-0">
            🐾
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold">Naomi</h1>
              <span className="bg-white/15 border border-white/20 text-white/90 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase size={10} /> HR Manager
              </span>
            </div>
            <p className="text-sm text-white/60 mt-1">French bulldog · dark brindle · black mask · gray collar · flat affect</p>
            <p className="text-[11px] text-white/40 mt-1">Observa. Documenta. Julga. Nunca desiste de Karen. Nunca tem sucesso.</p>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full translate-x-16 -translate-y-10 pointer-events-none" />
        <div className="absolute right-12 bottom-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 pointer-events-none" />
      </div>

      {/* Input card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5">

        {/* Photo upload */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-2">
            Foto de referência <span className="text-gray-300 normal-case font-normal">(opcional)</span>
          </label>
          {photoPreview ? (
            <div className="flex items-center gap-3">
              <img src={photoPreview} alt="referência" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-700 truncate">{photo?.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Naomi ou a cena completa com Karen ao fundo</p>
              </div>
              <button onClick={() => { setPhoto(null); setPhotoPreview(null) }} className="text-gray-300 hover:text-red-400 transition-colors">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => photoRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            >
              <Upload size={14} /> Enviar foto de referência
            </button>
          )}
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Situation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              Situação <span className="text-gray-300 normal-case font-normal">(opcional)</span>
            </label>
            <button
              onClick={getSuggestions}
              disabled={suggestLoading}
              className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-40"
            >
              {suggestLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              Sugerir 3 situações
            </button>
          </div>

          {suggestions.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setSituation(s); setSuggestions([]) }}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={situation}
            onChange={e => setSituation(e.target.value)}
            rows={2}
            placeholder="Descreva a cena... Ex: Karen esqueceu de beber água pelo terceiro dia seguido"
            className="input text-sm w-full resize-none"
          />
        </div>

        {/* Video tool */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-2">
            Ferramenta de vídeo
          </label>
          <div className="flex gap-2 flex-wrap">
            {VIDEO_TOOLS.map(t => (
              <button
                key={t.id}
                onClick={() => setVideoTool(t.id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  videoTool === t.id
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>
        )}

        <button
          onClick={generate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-all shadow-lg shadow-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Gerando conteúdo...</>
            : <><Clapperboard size={15} /> Gerar conteúdo da Naomi</>
          }
        </button>
      </div>

      {/* ── Output ── */}
      {result && (
        <div className="space-y-4 animate-fade-in">

          {/* Títulos */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl">
              <Briefcase size={14} />
              <span className="text-sm font-bold">{result.situational_title || 'HR Manager'}</span>
            </div>
            {result.situational_title_suggestion && result.situational_title_suggestion !== 'null' && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-sm font-semibold">
                <span className="text-[10px] text-amber-500 font-semibold uppercase">também</span>
                {result.situational_title_suggestion}
              </div>
            )}
            {result.total_duration_seconds > 0 && (
              <div className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl text-xs font-semibold">
                {result.total_duration_seconds}s total
              </div>
            )}
          </div>

          {/* Scene Direction */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowScenes(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clapperboard size={14} className="text-slate-600" />
                <span className="text-xs font-semibold text-gray-700 uppercase">Direção de Cenas ({result.scene_direction?.length})</span>
              </div>
              {showScenes ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {showScenes && (
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {(result.scene_direction || []).map((scene) => (
                  <div key={scene.scene} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                        {scene.scene}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {scene.duration_seconds}s
                      </span>
                      {scene.karen_in_frame && (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          Karen no frame
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed ml-8">{scene.action}</p>
                    <p className="text-[11px] text-gray-400 ml-8 flex items-center gap-1.5">
                      <Camera size={10} /> {scene.camera}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Prompt */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Film size={13} className="text-slate-600" />
                <span className="text-[10px] font-semibold text-gray-700 uppercase">
                  Video Prompt — {VIDEO_TOOLS.find(t => t.id === videoTool)?.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* PT / EN toggle */}
                {!translatedPrompt ? (
                  <button
                    onClick={translatePrompt}
                    disabled={translating}
                    className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-all disabled:opacity-40"
                  >
                    {translating ? <Loader2 size={9} className="animate-spin" /> : <span className="text-[9px]">🇺🇸</span>}
                    Traduzir para inglês
                  </button>
                ) : (
                  <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setShowEnglish(false)}
                      className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-md transition-all',
                        !showEnglish ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                      )}
                    >PT</button>
                    <button
                      onClick={() => setShowEnglish(true)}
                      className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-md transition-all',
                        showEnglish ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                      )}
                    >EN</button>
                  </div>
                )}
                <button onClick={() => handleCopy(showEnglish && translatedPrompt ? translatedPrompt : result.video_prompt, 'prompt')}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-slate-700 transition-colors">
                  {copied === 'prompt' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-50 font-mono text-xs text-slate-700 leading-relaxed whitespace-pre-wrap rounded-b-2xl">
              {showEnglish && translatedPrompt ? translatedPrompt : result.video_prompt}
            </div>
          </div>

          {/* On-Screen Text */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowText(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Monitor size={13} className="text-slate-600" />
                <span className="text-xs font-semibold text-gray-700 uppercase">Textos na Tela</span>
              </div>
              {showText ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {showText && (
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {(result.onscreen_text || []).map((item, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3">
                    <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0 mt-0.5">
                      {item.scene}
                    </span>
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-semibold text-gray-800">"{item.text}"</p>
                      <div className="flex gap-3 text-[10px] text-gray-400">
                        <span>{item.font}</span>
                        <span>·</span>
                        <span>{item.position}</span>
                        <span>·</span>
                        <span>{item.timing}</span>
                      </div>
                    </div>
                    <button onClick={() => handleCopy(item.text, `text-${i}`)}
                      className="text-gray-300 hover:text-slate-600 transition-colors mt-0.5 shrink-0">
                      {copied === `text-${i}` ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <MessageSquare size={13} className="text-slate-600" />
                <span className="text-[10px] font-semibold text-gray-700 uppercase">Legenda do Post — voz da Naomi</span>
              </div>
              <button onClick={() => handleCopy(result.caption, 'caption')}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-slate-700 transition-colors">
                {copied === 'caption' ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
              </button>
            </div>
            <div className="p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {result.caption}
            </div>
          </div>

          {/* Regenerar */}
          <button onClick={generate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Regenerar
          </button>
        </div>
      )}
    </div>
  )
}
