import { useState, useEffect } from 'react'
import Modal from '../common/Modal'

const PLATFORMS = ['linkedin', 'instagram', 'twitter', 'youtube', 'tiktok']
const FORMATS = ['carrossel', 'thread', 'video', 'reel', 'artigo', 'story', 'podcast']
const FORMAT_LABELS = { carrossel: 'Carrossel', thread: 'Thread', video: 'Vídeo', reel: 'Reel', artigo: 'Artigo', story: 'Story', podcast: 'Podcast' }
const HOOK_TYPES = ['lista', 'contrario', 'historia', 'dados', 'problema', 'pergunta', 'como-fazer', 'novidade']
const HOOK_LABELS = { lista: 'Lista', contrario: 'Contrário', historia: 'História', dados: 'Dados', problema: 'Problema', pergunta: 'Pergunta', 'como-fazer': 'Como Fazer', novidade: 'Novidade' }
const PRIORITIES = ['high', 'medium', 'low']
const PRIORITY_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' }
const STATUSES = ['idea', 'draft', 'ready', 'published']
const STATUS_LABELS = { idea: 'Ideia', draft: 'Rascunho', ready: 'Pronto', published: 'Publicado' }

const EMPTY = {
  title: '', description: '', topic: '', format: 'carrossel',
  hook_type: 'lista', platform: 'linkedin', priority: 'medium',
  status: 'idea', tags: '', scheduled_date: '',
}

export default function IdeaForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (initial) {
      setForm({ ...EMPTY, ...initial, tags: (initial.tags || []).join(', ') })
    } else {
      setForm(EMPTY)
    }
  }, [initial, open])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave({
      ...form,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      scheduled_date: form.scheduled_date || null,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar Ideia' : 'Nova Ideia de Conteúdo'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Título */}
        <div>
          <label className="label">Título *</label>
          <input className="input" placeholder="ex: 5 Ferramentas de IA Que Todo Criador Precisa" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>

        {/* Descrição */}
        <div>
          <label className="label">Descrição</label>
          <textarea
            className="input resize-y"
            rows={4}
            placeholder="Qual é a ideia central? Que valor ela entrega? Você pode escrever um briefing completo aqui..."
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Tópico */}
        <div>
          <label className="label">Tópico / Nicho</label>
          <input className="input" placeholder="ex: Economia Criativa, Ferramentas de IA, Crescimento de Carreira" value={form.topic} onChange={(e) => set('topic', e.target.value)} />
        </div>

        {/* Plataforma + Formato */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Plataforma</label>
            <select className="select" value={form.platform} onChange={(e) => set('platform', e.target.value)}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Formato</label>
            <select className="select" value={form.format} onChange={(e) => set('format', e.target.value)}>
              {FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f] || f}</option>)}
            </select>
          </div>
        </div>

        {/* Tipo de Gancho + Prioridade */}
        <div className="grid grid-cols-2 gap-3">
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
        </div>

        {/* Status + Data programada */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data Programada</label>
            <input type="date" className="input" value={form.scheduled_date || ''} onChange={(e) => set('scheduled_date', e.target.value)} />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="label">Tags (separadas por vírgula)</label>
          <input className="input" placeholder="IA, ferramentas, produtividade" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">
            {initial ? 'Salvar Alterações' : 'Criar Ideia'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
