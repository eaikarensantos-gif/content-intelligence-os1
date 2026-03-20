import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import Modal from '../common/Modal'
import useStore from '../../store/useStore'

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
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function IdeaForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(EMPTY)
  const [tagInput, setTagInput] = useState('')
  const tagRef = useRef(null)
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

        {/* Título */}
        <div>
          <label className="label">Título *</label>
          <input
            className="input"
            placeholder="ex: 5 Ferramentas de IA Que Todo Criador Precisa"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="label">Descrição</label>
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
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">
            {initial?.id ? 'Salvar Alterações' : 'Criar Ideia'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
