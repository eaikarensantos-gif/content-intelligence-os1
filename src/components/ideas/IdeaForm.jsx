import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, Tag, Sparkles, Loader2, Wand2, Zap, Link2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import Modal from '../common/Modal'
import useStore from '../../store/useStore'
import { lintText } from '../../utils/brandLinter'
import BrandLinterPanel, { BrandDirectiveBanner } from '../common/BrandLinterPanel'

const LS_KEY = 'cio-anthropic-key'

const PLATFORMS = ['instagram', 'linkedin', 'twitter', 'youtube', 'tiktok']

const PLATFORM_COLORS = {
  instagram: 'bg-pink-100 text-pink-700 border-pink-300',
  linkedin:  'bg-blue-100 text-blue-700 border-blue-300',
  twitter:   'bg-sky-100 text-sky-700 border-sky-300',
  youtube:   'bg-red-100 text-red-700 border-red-300',
  tiktok:    'bg-purple-100 text-purple-700 border-purple-300',
}

const FORMATS = ['carrossel', 'thread', 'video', 'reel', 'artigo', 'story', 'podcast']
const FORMAT_LABELS = { carrossel: 'Carrossel', thread: 'Thread', video: 'Vídeo', reel: 'Reel', artigo: 'Artigo', story: 'Story', podcast: 'Podcast' }

const HOOK_TYPES = ['lista', 'contrario', 'historia', 'dados', 'problema', 'pergunta', 'como-fazer', 'novidade']
const HOOK_LABELS = { lista: 'Lista', contrario: 'Contrário', historia: 'História', dados: 'Dados', problema: 'Problema', pergunta: 'Pergunta', 'como-fazer': 'Como Fazer', novidade: 'Novidade' }

const PRIORITIES = ['high', 'medium', 'low']
const PRIORITY_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' }

const STATUSES = ['idea', 'draft', 'ready', 'published']
const STATUS_LABELS = { idea: 'Ideia', draft: 'Rascunho', ready: 'Pronto', published: 'Publicado' }

const CONTENT_TYPES = [
  { id: 'organic',     label: 'Orgânico',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { id: 'paid',        label: 'Publi',     cls: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'partnership', label: 'Parceria',  cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'other',       label: 'Outros',    cls: 'bg-gray-100 text-gray-600 border-gray-300' },
]

const WEEK_SLOTS = [
  { day: 'Seg', offset: 0, label: 'Carrossel' },
  { day: 'Qua', offset: 2, label: 'Reels' },
  { day: 'Qui', offset: 3, label: 'Post' },
  { day: 'Sáb', offset: 5, label: 'Reels pessoal' },
]

const EMPTY = {
  title: '', description: '', topic: '', format: 'carrossel', hook_type: 'lista',
  platforms: ['instagram'], priority: 'medium', status: 'idea', tags: [],
  scheduled_date: '', content_type: 'organic', client: '', script: '',
  caption: '', cta: '', creation_order: null, reference_links: [],
}

async function generateWithAI(apiKey, type, context) {
  const prompts = {
    title: `Você é especialista em títulos de conteúdo para criadores brasileiros. Crie 4 opções de título para o seguinte conteúdo.

${context.description ? `Ideia/Descrição: ${context.description}` : ''}
${context.topic ? `Nicho: ${context.topic}` : ''}
Formato: ${context.format || 'video'}
Plataforma: ${context.platforms?.join(', ') || 'Instagram'}

REGRAS OBRIGATÓRIAS:
- Títulos CHAMATIVOS mas 100% honestos — sem exagero, sem clickbait
- PROIBIDO: "Incrível", "Chocante", "Você não vai acreditar", "NUNCA", "SEMPRE", extremismos
- Use especificidade real (números, situações concretas, nomes de conceitos)
- Pode usar contrário, pergunta, dado, problema — desde que seja verdadeiro
- Tom: inteligente, direto, maduro — como um especialista falaria
- Máximo 80 caracteres por título

Retorne APENAS um JSON válido com array de 4 strings, sem markdown:
["Título 1", "Título 2", "Título 3", "Título 4"]`,

    hook: `Você é especialista em ganchos (hooks) para criadores de conteúdo brasileiros.

Título do conteúdo: ${context.title}
${context.description ? `Contexto: ${context.description.slice(0, 300)}` : ''}
${context.topic ? `Nicho: ${context.topic}` : ''}
Tipo de gancho: ${context.hook_type || 'problema'}
Formato: ${context.format || 'video'}

Crie UM gancho de alta conversão para abrir este conteúdo.

REGRAS:
- Primeira frase ou parágrafo curto (máximo 3 frases)
- Chame atenção SEM clickbait nem exagero
- Use a tensão real do problema, dado ou contrário
- Tom humano, específico, inteligente
- PROIBIDO: frases genéricas, superlativo vazio, mentira ou medo exagerado

Responda APENAS com o texto do gancho, sem explicações nem formatação.`,

    caption: `Você é um copywriter expert em redes sociais brasileiras. Gere UMA legenda engajadora para o seguinte conteúdo. A legenda deve ser natural, conversacional e adequada para ${context.platforms?.join(', ') || 'Instagram'}.

Título: ${context.title}
${context.description ? `Descrição: ${context.description}` : ''}
${context.topic ? `Nicho: ${context.topic}` : ''}
Formato: ${context.format}

Regras:
- Máximo 2200 caracteres
- Use quebras de linha estratégicas
- Tom humano e autêntico, NUNCA genérico
- Inclua emojis com moderação
- Termine com uma pergunta ou reflexão que gere comentários

Responda APENAS com a legenda, sem explicações.`,

    script: `Você é especialista em roteiros de conteúdo para criadores brasileiros. Crie um roteiro completo e detalhado para o seguinte conteúdo.

Título: ${context.title}
${context.description ? `Briefing: ${context.description}` : ''}
${context.topic ? `Nicho: ${context.topic}` : ''}
Formato: ${context.format || 'video'}
Plataforma: ${context.platforms?.join(', ') || 'Instagram'}
Tipo de gancho: ${context.hook_type || 'problema'}

REGRAS:
- Comece com o gancho forte que prende nos primeiros 3 segundos
- Estruture em blocos claros: Abertura → Desenvolvimento → Conclusão/CTA
- Linguagem direta, conversacional — como Karen fala, não como IA escreve
- PROIBIDO: frases genéricas, enrolação, superlativo vazio
- Use marcadores visuais para cenas/cortes quando for Reels ou Vídeo
- Tom: especialista sênior que fala com pares, não que explica para iniciantes

Responda APENAS com o roteiro, sem introdução nem explicações.`,

    cta: `Você é especialista em CTAs (Call to Action) de alta conversão para criadores de conteúdo brasileiros.

Título: ${context.title}
${context.description ? `Contexto: ${context.description.slice(0, 400)}` : ''}
Plataforma(s): ${context.platforms?.join(', ') || 'Instagram'}
Formato: ${context.format || 'carrossel'}
Tipo de gancho: ${context.hook_type || 'lista'}

Gere EXATAMENTE 4 CTAs com MECÂNICAS distintas, na ordem:
1. SALVAR — incentiva salvar/favoritar o conteúdo (ex: "Salva antes de fechar...")
2. MARCAR — pede pra marcar alguém específico relacionado ao tema (ex: "Marca aquela pessoa que...")
3. COMENTAR — gera interação direta no comentário (ex: "Comenta a letra X se..." ou pergunta curta)
4. SEGUIR / DM / LINK — pede follow, resposta por DM com palavra-chave, ou clique no link da bio

REGRAS OBRIGATÓRIAS:
- Cada CTA deve ser ESPECÍFICO para o tema "${context.title}" — nada genérico
- Tom natural e direto, como alguém falaria com um amigo
- Pode usar emoji com moderação (máximo 2 por CTA)
- PROIBIDO: "incrível", "sensacional", urgência falsa, manipulação emocional
- Máximo 130 caracteres por CTA

Responda APENAS com JSON válido (array de 4 strings), sem markdown nem explicações:
["CTA 1", "CTA 2", "CTA 3", "CTA 4"]`,
  }
  const res = await fetch('/api/ai?action=anthropic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: prompts[type] }] }),
  })
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{children}</p>
  )
}

export default function IdeaForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(EMPTY)
  const [tagInput, setTagInput] = useState('')
  const [generatingTitle, setGeneratingTitle] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState([])
  const [generatingHook, setGeneratingHook] = useState(false)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [generatingCta, setGeneratingCta] = useState(false)
  const [ctaSuggestions, setCtaSuggestions] = useState([])
  const [generatingScript, setGeneratingScript] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [showProducao, setShowProducao] = useState(false)
  const tagRef = useRef(null)
  const linkRef = useRef(null)

  const allIdeas = useStore((s) => s.ideas)
  const tagHistory = useMemo(() => {
    const counts = {}
    ;(allIdeas || []).forEach((idea) => {
      ;(idea.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1 })
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  }, [allIdeas])

  const lintViolations = useMemo(() => {
    const combined = [form.title, form.description, form.script, form.caption].filter(Boolean).join('\n')
    return lintText(combined)
  }, [form.title, form.description, form.script, form.caption])

  const descRef = useRef(null)
  const autoResizeDesc = useCallback((el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 500) + 'px'
  }, [])

  useEffect(() => {
    if (open && descRef.current) setTimeout(() => autoResizeDesc(descRef.current), 50)
  }, [open])

  useEffect(() => {
    if (!open) return
    if (initial) {
      const platforms = initial.platforms ? initial.platforms : initial.platform ? [initial.platform] : ['instagram']
      const tags = Array.isArray(initial.tags) ? initial.tags
        : typeof initial.tags === 'string' ? initial.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
      setForm({ ...EMPTY, ...initial, platforms, tags })
      // open production section if has content
      if (initial.script || initial.caption || initial.cta) setShowProducao(true)
    } else {
      setForm({ ...EMPTY })
      setShowProducao(false)
    }
    setTagInput('')
    setCtaSuggestions([])
  }, [open, initial])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const togglePlatform = (p) => {
    const current = form.platforms || []
    set('platforms', current.includes(p) ? current.filter((x) => x !== p) : [...current, p])
  }

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/^#/, '')
    if (tag && !(form.tags || []).includes(tag)) set('tags', [...(form.tags || []), tag])
    setTagInput('')
  }

  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    else if (e.key === 'Backspace' && !tagInput && form.tags?.length > 0) set('tags', form.tags.slice(0, -1))
  }

  const removeTag = (tag) => set('tags', form.tags.filter((t) => t !== tag))

  const addLink = (raw) => {
    const url = raw.trim()
    if (!url) return
    const links = form.reference_links || []
    if (!links.includes(url)) set('reference_links', [...links, url])
    setLinkInput('')
  }
  const removeLink = (url) => set('reference_links', (form.reference_links || []).filter((l) => l !== url))

  const handleGenerateTitle = async () => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { alert('Configure sua API key da Anthropic primeiro.'); return }
    if (!form.description.trim() && !form.topic.trim()) { alert('Preencha a Descrição ou o Tópico antes de gerar títulos.'); return }
    setGeneratingTitle(true); setTitleSuggestions([])
    try {
      const raw = await generateWithAI(apiKey, 'title', form)
      const clean = raw.replace(/```[a-z]*\n?/gi, '').trim()
      const match = clean.match(/\[[\s\S]*\]/)
      const parsed = JSON.parse(match ? match[0] : clean)
      if (Array.isArray(parsed) && parsed.length > 0) setTitleSuggestions(parsed.filter(Boolean))
      else alert('Não foi possível gerar títulos. Tente novamente.')
    } catch { alert('Erro ao gerar títulos. Verifique sua API key.') }
    setGeneratingTitle(false)
  }

  const handleGenerateHook = async () => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { alert('Configure sua API key da Anthropic primeiro.'); return }
    if (!form.title.trim()) { alert('Preencha o título antes de gerar o gancho.'); return }
    setGeneratingHook(true)
    try {
      const hook = await generateWithAI(apiKey, 'hook', form)
      if (hook.trim()) {
        set('description', hook.trim() + (form.description.trim() ? '\n\n' + form.description.trim() : ''))
        setTimeout(() => autoResizeDesc(descRef.current), 50)
      }
    } catch { /* silent */ }
    setGeneratingHook(false)
  }

  const handleGenerateScript = async () => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { alert('Configure sua API key da Anthropic primeiro.'); return }
    if (!form.title.trim()) { alert('Preencha o título antes de gerar o roteiro.'); return }
    setGeneratingScript(true)
    try {
      const script = await generateWithAI(apiKey, 'script', form)
      if (script.trim()) set('script', script.trim())
    } catch { /* silent */ }
    setGeneratingScript(false)
  }

  const handleGenerateAI = async (type) => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { alert('Configure sua API key da Anthropic primeiro.'); return }
    if (!form.title.trim()) { alert('Preencha o título antes de gerar.'); return }
    const setter = type === 'caption' ? setGeneratingCaption : setGeneratingCta
    setter(true)
    try {
      const result = await generateWithAI(apiKey, type, form)
      if (type === 'cta') {
        const clean = result.replace(/```[a-z]*\n?/gi, '').trim()
        const match = clean.match(/\[[\s\S]*\]/)
        try {
          const parsed = JSON.parse(match ? match[0] : clean)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCtaSuggestions(parsed.filter(Boolean))
          } else {
            set('cta', result.trim())
          }
        } catch {
          set('cta', result.trim())
        }
      } else {
        set('caption', result)
      }
    } catch { /* silent */ }
    setter(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    if (tagInput.trim()) addTag(tagInput)
    onSave({ ...form, platform: (form.platforms || [])[0] || 'instagram', scheduled_date: form.scheduled_date || null })
    onClose()
  }

  const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Editar Ideia' : 'Nova Ideia de Conteúdo'}>
      <form onSubmit={handleSubmit} className="space-y-5">

        <BrandDirectiveBanner />

        {/* ── 1. CONFIGURAÇÃO ──────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionLabel>Configuração</SectionLabel>

          {/* Plataformas */}
          <div>
            <label className="label">Plataforma(s)</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {PLATFORMS.map((p) => {
                const active = (form.platforms || []).includes(p)
                return (
                  <button key={p} type="button" onClick={() => togglePlatform(p)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${active ? PLATFORM_COLORS[p] : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'}`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                )
              })}
            </div>
            {(form.platforms || []).length === 0 && (
              <p className="text-[11px] text-amber-500 mt-1">Selecione ao menos uma plataforma</p>
            )}
          </div>

          {/* Formato + Gancho + Prioridade + Status — 2x2 grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="label">Formato</label>
              <select className="select" value={form.format} onChange={(e) => set('format', e.target.value)}>
                {FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f] || f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tipo de Gancho</label>
              <select className="select" value={form.hook_type} onChange={(e) => set('hook_type', e.target.value)}>
                {HOOK_TYPES.map((h) => <option key={h} value={h}>{HOOK_LABELS[h] || h}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prioridade</label>
              <select className="select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          {/* Tipo de Conteúdo — inline chips */}
          <div>
            <label className="label">Tipo de Conteúdo</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CONTENT_TYPES.map(({ id, label, cls }) => (
                <button key={id} type="button" onClick={() => set('content_type', id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${form.content_type === id ? cls : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cliente (condicional) */}
          {(form.content_type === 'paid' || form.content_type === 'partnership') && (
            <div>
              <label className="label">Cliente / Marca</label>
              <input className="input" placeholder="ex: Samsung, FIAP, orgânico próprio"
                value={form.client || ''} onChange={(e) => set('client', e.target.value)} />
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* ── 2. AGENDAMENTO ───────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionLabel>Agendamento</SectionLabel>

          {/* Slots da semana */}
          <div className="grid grid-cols-4 gap-1.5">
            {WEEK_SLOTS.map(({ day, offset, label }) => {
              const today = new Date()
              const dow = today.getDay()
              const monday = new Date(today)
              monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
              monday.setHours(0, 0, 0, 0)
              const slotDate = new Date(monday)
              slotDate.setDate(monday.getDate() + offset)
              const dateStr = localDateStr(slotDate)
              const isSelected = form.scheduled_date === dateStr
              return (
                <button key={day} type="button" onClick={() => set('scheduled_date', isSelected ? '' : dateStr)}
                  className={`flex flex-col items-center py-2.5 px-1 rounded-xl border text-center transition-all ${isSelected ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-orange-300 hover:bg-orange-50'}`}>
                  <span className="text-xs font-bold">{day}</span>
                  <span className="text-[9px] text-gray-400 mt-0.5 leading-tight">{label}</span>
                </button>
              )
            })}
          </div>

          {/* Data livre */}
          <div>
            <label className="label flex items-center gap-1.5">
              Data Programada
              {!initial?.id && initial?.scheduled_date && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium border border-orange-200">
                  do calendário
                </span>
              )}
            </label>
            <input type="date" className="input" value={form.scheduled_date || ''}
              onChange={(e) => set('scheduled_date', e.target.value)} />
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── 3. CONTEÚDO ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionLabel>Conteúdo</SectionLabel>

          {/* Título */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Título *</label>
              <button type="button" onClick={handleGenerateTitle} disabled={generatingTitle}
                className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 font-medium transition-all disabled:opacity-50">
                {generatingTitle ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                {generatingTitle ? 'Gerando...' : 'Gerar Títulos'}
              </button>
            </div>
            <input className="input" placeholder="ex: 5 Ferramentas de IA Que Todo Criador Precisa"
              value={form.title} onChange={(e) => { set('title', e.target.value); setTitleSuggestions([]) }} required />
            {titleSuggestions.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Clique para usar:</p>
                {titleSuggestions.map((t, i) => (
                  <button key={i} type="button" onClick={() => { set('title', t); setTitleSuggestions([]) }}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 hover:border-violet-300 transition-all leading-snug">
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Descrição */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Descrição</label>
              <button type="button" onClick={handleGenerateHook} disabled={generatingHook}
                className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 font-medium transition-all disabled:opacity-50">
                {generatingHook ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                {generatingHook ? 'Gerando...' : 'Gerar Gancho'}
              </button>
            </div>
            <textarea ref={descRef} className="input resize-none min-h-[72px]"
              placeholder="Qual é a ideia central? Que valor ela entrega? Você pode escrever um briefing completo aqui..."
              value={form.description}
              onChange={(e) => { set('description', e.target.value); autoResizeDesc(e.target) }} />
          </div>

          {/* Roteiro */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Roteiro</label>
              <button type="button" onClick={handleGenerateScript} disabled={generatingScript}
                className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 font-medium transition-all disabled:opacity-50">
                {generatingScript ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                {generatingScript ? 'Gerando...' : 'Gerar com IA'}
              </button>
            </div>
            <textarea className="input resize-none min-h-[80px]"
              placeholder="Escreva o roteiro completo do conteúdo aqui..."
              value={form.script || ''} onChange={(e) => set('script', e.target.value)} />
          </div>

          {/* Legenda */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Legenda</label>
              <button type="button" onClick={() => handleGenerateAI('caption')} disabled={generatingCaption}
                className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 font-medium transition-all disabled:opacity-50">
                {generatingCaption ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                {generatingCaption ? 'Gerando...' : 'Gerar com IA'}
              </button>
            </div>
            <textarea className="input resize-none min-h-[60px]"
              placeholder="Legenda para o post... ou clique em 'Gerar com IA'"
              value={form.caption || ''} onChange={(e) => set('caption', e.target.value)} />
          </div>

          {/* CTA */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">CTA (Call to Action)</label>
              <button type="button" onClick={() => { setCtaSuggestions([]); handleGenerateAI('cta') }} disabled={generatingCta}
                className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 font-medium transition-all disabled:opacity-50">
                {generatingCta ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                {generatingCta ? 'Gerando 4 opções...' : 'Gerar com IA'}
              </button>
            </div>
            <input className="input" placeholder="ex: Salva pra quando precisar... ou clique em 'Gerar com IA'"
              value={form.cta || ''} onChange={(e) => { set('cta', e.target.value); setCtaSuggestions([]) }} />
            {ctaSuggestions.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Escolha uma opção:</p>
                {ctaSuggestions.map((cta, i) => {
                  const labels = ['💾 Salvar', '👥 Marcar', '💬 Comentar', '➡️ Seguir / DM']
                  return (
                    <button key={i} type="button"
                      onClick={() => { set('cta', cta); setCtaSuggestions([]) }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 transition-all group">
                      <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wide block mb-0.5">
                        {labels[i] || `Opção ${i + 1}`}
                      </span>
                      <span className="text-xs text-orange-800 leading-snug">{cta}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── 4. ORGANIZAÇÃO ───────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionLabel>Organização</SectionLabel>

          {/* Tags */}
          <div>
            <label className="label">Tags</label>
            <div className="input min-h-[38px] flex flex-wrap gap-1.5 items-center cursor-text py-1.5 px-2"
              onClick={() => tagRef.current?.focus()}>
              {(form.tags || []).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-200 text-[11px] px-2 py-0.5 rounded-full font-medium">
                  #{tag}
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag) }} className="hover:text-orange-900 leading-none"><X size={10} /></button>
                </span>
              ))}
              <input ref={tagRef}
                className="flex-1 min-w-[80px] outline-none text-xs bg-transparent text-gray-800 placeholder:text-gray-400"
                placeholder={(form.tags || []).length ? '' : 'IA, ferramentas… (Enter para adicionar)'}
                value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKey} onBlur={() => { if (tagInput.trim()) addTag(tagInput) }} />
            </div>
            {tagHistory.filter((t) => !(form.tags || []).includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5 mr-0.5"><Tag size={9} /> Usadas:</span>
                {tagHistory.filter((t) => !(form.tags || []).includes(t))
                  .filter((t) => !tagInput || t.includes(tagInput.toLowerCase()))
                  .slice(0, 12).map((t) => (
                    <button key={t} type="button" onClick={() => addTag(t)}
                      className="text-[10px] text-gray-500 hover:text-orange-700 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 px-1.5 py-0.5 rounded-full transition-all">
                      #{t}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Links de referência */}
          <div>
            <label className="label">Links de Referência</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link2 size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input ref={linkRef} className="input pl-7 text-xs"
                  placeholder="https://... Cole o link e pressione Enter"
                  value={linkInput} onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(linkInput) } }} />
              </div>
              <button type="button" onClick={() => addLink(linkInput)} disabled={!linkInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium border border-gray-200 disabled:opacity-40 transition-all">
                Adicionar
              </button>
            </div>
            {(form.reference_links || []).length > 0 && (
              <div className="mt-2 space-y-1.5">
                {(form.reference_links || []).map((url) => (
                  <div key={url} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                    <Link2 size={10} className="text-gray-400 shrink-0" />
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-[11px] text-blue-600 hover:text-blue-800 truncate underline underline-offset-2">{url}</a>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500 shrink-0"><ExternalLink size={11} /></a>
                    <button type="button" onClick={() => removeLink(url)} className="text-gray-300 hover:text-red-400 shrink-0 transition-colors"><X size={11} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Brand Linter */}
        {lintViolations.length > 0 && <BrandLinterPanel violations={lintViolations} compact />}

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={!form.title.trim()}
            title={!form.title.trim() ? 'Preencha o título antes de salvar' : undefined}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            {initial?.id ? 'Salvar Alterações' : 'Criar Ideia'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
