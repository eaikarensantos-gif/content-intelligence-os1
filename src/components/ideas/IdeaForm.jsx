import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, Tag, Sparkles, Loader2, Wand2, Zap } from 'lucide-react'
import Modal from '../common/Modal'
import useStore from '../../store/useStore'
import { lintText } from '../../utils/brandLinter'
import BrandLinterPanel, { BrandDirectiveBanner } from '../common/BrandLinterPanel'

const LS_KEY = 'cio-anthropic-key'

// ─── Constantes ───────────────────────────────────────────────────────────────
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

const EMPTY = {
  title: '',
  description: '',
  topic: '',
  format: 'carrossel',
  hook_type: 'lista',
  platforms: ['instagram'],   // multi-select, instagram como padrão
  priority: 'medium',
  status: 'idea',
  tags: [],                   // array de strings
  scheduled_date: '',
  content_type: 'organic',
  script: '',                 // roteiro do conteúdo
  caption: '',                // legenda
  cta: '',                    // call to action
  creation_order: null,       // ordem de criação/postagem
}

// ─── Componente principal ─────────────────────────────────────────────────────
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

    cta: `Você é especialista em CTAs (Call to Action) para redes sociais brasileiras. Gere UM CTA altamente engajador para o seguinte conteúdo.

Título: ${context.title}
${context.description ? `Descrição: ${context.description}` : ''}
Plataforma: ${context.platforms?.join(', ') || 'Instagram'}
Formato: ${context.format}

Regras:
- CTA direto, curto e irresistível
- Gere urgência ou curiosidade
- Adequado para a plataforma
- Pode incluir emoji
- Exemplos de bons CTAs: "Salva pra quando precisar", "Marca alguém que precisa ver isso", "Comenta SIM que eu mando o link"

Responda APENAS com o CTA, sem explicações.`,
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, messages: [{ role: 'user', content: prompts[type] }] }),
  })
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export default function IdeaForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(EMPTY)
  const [tagInput, setTagInput] = useState('')
  const [generatingTitle, setGeneratingTitle] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState([])
  const [generatingHook, setGeneratingHook] = useState(false)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [generatingCta, setGeneratingCta] = useState(false)
  const tagRef = useRef(null)
  // All unique tags from existing ideas (history)
  const allIdeas = useStore((s) => s.ideas)
  const tagHistory = useMemo(() => {
    const counts = {}
    ;(allIdeas || []).forEach((idea) => {
      ;(idea.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1 })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
  }, [allIdeas])

  // Brand Linter — linta título + descrição + roteiro + legenda
  const lintViolations = useMemo(() => {
    const combined = [form.title, form.description, form.script, form.caption]
      .filter(Boolean)
      .join('\n')
    return lintText(combined)
  }, [form.title, form.description, form.script, form.caption])

  const descRef = useRef(null)
  const autoResizeDesc = useCallback((el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 500) + 'px'
  }, [])

  useEffect(() => {
    if (open && descRef.current) {
      setTimeout(() => autoResizeDesc(descRef.current), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (initial) {
      // Suporta formato antigo (platform: string) e novo (platforms: array)
      const platforms = initial.platforms
        ? initial.platforms
        : initial.platform
          ? [initial.platform]
          : ['instagram']
      // Suporta tags antiga (string) e nova (array)
      const tags = Array.isArray(initial.tags)
        ? initial.tags
        : typeof initial.tags === 'string'
          ? initial.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : []
      setForm({ ...EMPTY, ...initial, platforms, tags })
    } else {
      setForm({ ...EMPTY })
    }
    setTagInput('')
  }, [open, initial])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // ── Plataformas ─────────────────────────────────────────────────────────────
  const togglePlatform = (p) => {
    const current = form.platforms || []
    set('platforms', current.includes(p) ? current.filter((x) => x !== p) : [...current, p])
  }

  // ── Tags ────────────────────────────────────────────────────────────────────
  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/^#/, '')
    if (tag && !(form.tags || []).includes(tag)) {
      set('tags', [...(form.tags || []), tag])
    }
    setTagInput('')
  }

  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && form.tags?.length > 0) {
      set('tags', form.tags.slice(0, -1))
    }
  }

  const removeTag = (tag) => set('tags', form.tags.filter((t) => t !== tag))

  // ── AI generation ─────────────────────────────────────────────────────────
  const handleGenerateTitle = async () => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { alert('Configure sua API key da Anthropic primeiro (em qualquer módulo de criação).'); return }
    if (!form.description.trim() && !form.topic.trim()) { alert('Preencha a descrição ou tópico para gerar títulos.'); return }
    setGeneratingTitle(true)
    setTitleSuggestions([])
    try {
      const raw = await generateWithAI(apiKey, 'title', form)
      const parsed = JSON.parse(raw.trim())
      if (Array.isArray(parsed)) setTitleSuggestions(parsed.filter(Boolean))
    } catch { /* silent */ }
    setGeneratingTitle(false)
  }

  const handleGenerateHook = async () => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { alert('Configure sua API key da Anthropic primeiro (em qualquer módulo de criação).'); return }
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

  const handleGenerateAI = async (type) => {
    const apiKey = localStorage.getItem(LS_KEY)
    if (!apiKey) { alert('Configure sua API key da Anthropic primeiro (em qualquer módulo de criação).'); return }
    if (!form.title.trim()) { alert('Preencha o título antes de gerar.'); return }
    const setter = type === 'caption' ? setGeneratingCaption : setGeneratingCta
    setter(true)
    try {
      const result = await generateWithAI(apiKey, type, form)
      set(type === 'caption' ? 'caption' : 'cta', result)
    } catch { /* silent */ }
    setter(false)
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    // Finaliza tag digitada mas não confirmada
    if (tagInput.trim()) addTag(tagInput)

    onSave({
      ...form,
      platform: (form.platforms || [])[0] || 'instagram', // retrocompat
      scheduled_date: form.scheduled_date || null,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Editar Ideia' : 'Nova Ideia de Conteúdo'}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Brand Directive Banner */}
        <BrandDirectiveBanner />

        {/* Título */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Título *</label>
            <button
              type="button"
              onClick={handleGenerateTitle}
              disabled={generatingTitle}
              className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 font-medium transition-all disabled:opacity-50"
            >
              {generatingTitle ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
              {generatingTitle ? 'Gerando...' : 'Gerar Títulos'}
            </button>
          </div>
          <input
            className="input"
            placeholder="ex: 5 Ferramentas de IA Que Todo Criador Precisa"
            value={form.title}
            onChange={(e) => { set('title', e.target.value); setTitleSuggestions([]) }}
            required
          />
          {/* Title suggestions */}
          {titleSuggestions.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Clique para usar:</p>
              {titleSuggestions.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { set('title', t); setTitleSuggestions([]) }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-800 hover:border-violet-300 transition-all leading-snug"
                >
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
            <button
              type="button"
              onClick={handleGenerateHook}
              disabled={generatingHook}
              className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 font-medium transition-all disabled:opacity-50"
            >
              {generatingHook ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
              {generatingHook ? 'Gerando...' : 'Gerar Gancho'}
            </button>
          </div>
          <textarea
            ref={descRef}
            className="input resize-none min-h-[80px]"
            placeholder="Qual é a ideia central? Que valor ela entrega? Você pode escrever um briefing completo aqui..."
            value={form.description}
            onChange={(e) => {
              set('description', e.target.value)
              autoResizeDesc(e.target)
            }}
          />
        </div>

        {/* Tópico */}
        <div>
          <label className="label">Tópico / Nicho</label>
          <input
            className="input"
            placeholder="ex: Economia Criativa, Ferramentas de IA, Crescimento de Carreira"
            value={form.topic}
            onChange={(e) => set('topic', e.target.value)}
          />
        </div>

        {/* Plataformas — multi-select */}
        <div>
          <label className="label">Plataforma(s)</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PLATFORMS.map((p) => {
              const active = (form.platforms || []).includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    active
                      ? PLATFORM_COLORS[p]
                      : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              )
            })}
          </div>
          {(form.platforms || []).length === 0 && (
            <p className="text-[11px] text-amber-500 mt-1">Selecione ao menos uma plataforma</p>
          )}
        </div>

        {/* Formato + Gancho */}
        <div className="grid grid-cols-2 gap-3">
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
        </div>

        {/* Prioridade + Status */}
        <div className="grid grid-cols-2 gap-3">
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

        {/* Data + Tipo de Conteúdo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data Programada</label>
            <input
              type="date"
              className="input"
              value={form.scheduled_date || ''}
              onChange={(e) => set('scheduled_date', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Tipo de Conteúdo</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CONTENT_TYPES.map(({ id, label, cls }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set('content_type', id)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                    form.content_type === id ? cls : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Roteiro */}
        <div>
          <label className="label">Roteiro</label>
          <textarea
            className="input resize-none min-h-[80px]"
            placeholder="Escreva o roteiro completo do conteúdo aqui..."
            value={form.script || ''}
            onChange={(e) => set('script', e.target.value)}
          />
        </div>

        {/* Legenda + AI */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Legenda</label>
            <button
              type="button"
              onClick={() => handleGenerateAI('caption')}
              disabled={generatingCaption}
              className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 font-medium transition-all disabled:opacity-50"
            >
              {generatingCaption ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              {generatingCaption ? 'Gerando...' : 'Gerar com IA'}
            </button>
          </div>
          <textarea
            className="input resize-none min-h-[60px]"
            placeholder="Legenda para o post... ou clique em 'Gerar com IA'"
            value={form.caption || ''}
            onChange={(e) => set('caption', e.target.value)}
          />
        </div>

        {/* CTA + AI */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">CTA (Call to Action)</label>
            <button
              type="button"
              onClick={() => handleGenerateAI('cta')}
              disabled={generatingCta}
              className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 font-medium transition-all disabled:opacity-50"
            >
              {generatingCta ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              {generatingCta ? 'Gerando...' : 'Gerar com IA'}
            </button>
          </div>
          <input
            className="input"
            placeholder="ex: Salva pra quando precisar... ou clique em 'Gerar com IA'"
            value={form.cta || ''}
            onChange={(e) => set('cta', e.target.value)}
          />
        </div>

        {/* Tags — chip input */}
        <div>
          <label className="label">Tags</label>
          <div
            className="input min-h-[38px] flex flex-wrap gap-1.5 items-center cursor-text py-1.5 px-2"
            onClick={() => tagRef.current?.focus()}
          >
            {(form.tags || []).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-200 text-[11px] px-2 py-0.5 rounded-full font-medium"
              >
                #{tag}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                  className="hover:text-orange-900 leading-none"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              ref={tagRef}
              className="flex-1 min-w-[80px] outline-none text-xs bg-transparent text-gray-800 placeholder:text-gray-400"
              placeholder={(form.tags || []).length ? '' : 'IA, ferramentas… (Enter para adicionar)'}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
            />
          </div>
          {/* Tag suggestions from history */}
          {tagHistory.filter((t) => !(form.tags || []).includes(t)).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5 mr-0.5"><Tag size={9} /> Usadas:</span>
              {tagHistory
                .filter((t) => !(form.tags || []).includes(t))
                .filter((t) => !tagInput || t.includes(tagInput.toLowerCase()))
                .slice(0, 12)
                .map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="text-[10px] text-gray-500 hover:text-orange-700 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 px-1.5 py-0.5 rounded-full transition-all"
                  >
                    #{t}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Brand Linter Panel */}
        {lintViolations.length > 0 && (
          <BrandLinterPanel violations={lintViolations} compact />
        )}

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            type="submit"
            disabled={lintViolations.length > 0}
            title={lintViolations.length > 0 ? 'Corrija as violações de tom antes de salvar' : undefined}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {initial?.id ? 'Salvar Alterações' : 'Criar Ideia'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
