import { useState, useEffect } from 'react'
import Modal from '../common/Modal'

const PLATFORMS = ['linkedin', 'instagram', 'twitter', 'youtube', 'tiktok']
const FORMATS = ['carousel', 'thread', 'video', 'reel', 'article', 'story', 'podcast']
const HOOK_TYPES = ['list', 'contrarian', 'story', 'data', 'problem', 'question', 'how-to', 'news']
const PRIORITIES = ['high', 'medium', 'low']
const STATUSES = ['idea', 'draft', 'ready', 'published']

const EMPTY = {
  title: '', description: '', topic: '', format: 'carousel',
  hook_type: 'list', platform: 'linkedin', priority: 'medium',
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
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Idea' : 'New Content Idea'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="label">Title *</label>
          <input className="input" placeholder="e.g. 5 AI Tools Every Creator Needs" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="What's the core idea? What value does it deliver?"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Topic */}
        <div>
          <label className="label">Topic / Niche</label>
          <input className="input" placeholder="e.g. Creator Economy, AI Tools, Career Growth" value={form.topic} onChange={(e) => set('topic', e.target.value)} />
        </div>

        {/* Row: Platform + Format */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Platform</label>
            <select className="select" value={form.platform} onChange={(e) => set('platform', e.target.value)}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Format</label>
            <select className="select" value={form.format} onChange={(e) => set('format', e.target.value)}>
              {FORMATS.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Row: Hook Type + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Hook Type</label>
            <select className="select" value={form.hook_type} onChange={(e) => set('hook_type', e.target.value)}>
              {HOOK_TYPES.map((h) => <option key={h} value={h}>{h.charAt(0).toUpperCase() + h.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Row: Status + Scheduled date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Scheduled Date</label>
            <input type="date" className="input" value={form.scheduled_date || ''} onChange={(e) => set('scheduled_date', e.target.value)} />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input className="input" placeholder="AI, tools, productivity" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">
            {initial ? 'Save Changes' : 'Create Idea'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
