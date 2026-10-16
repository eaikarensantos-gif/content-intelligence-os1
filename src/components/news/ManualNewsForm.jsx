import { useState } from 'react'

export default function ManualNewsForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const inputClass = 'w-full rounded-lg border border-gray-200 p-2 text-sm'

  function submit(event) {
    event.preventDefault()
    setError('')
    if (!text.trim()) { setError('Cole o texto da notícia para continuar.'); return }
    if (url.trim()) {
      try {
        if (!['http:', 'https:'].includes(new URL(url.trim()).protocol)) throw new Error()
      } catch { setError('Informe um link http ou https válido, ou deixe o campo vazio.'); return }
    }
    onSubmit({
      title: title.trim() || text.trim().split('\n')[0].slice(0, 160),
      description: text.trim(),
      link: url.trim(),
      guid: `manual-${crypto.randomUUID()}`,
      source: 'Notícia colada',
      sourceColor: 'bg-orange-500',
      categories: [],
      pubDate: '',
      manual: true,
    })
  }

  return (
    <form onSubmit={submit} className="m-6 p-5 bg-white border border-gray-200 rounded-2xl space-y-4 overflow-y-auto">
      <h2 className="font-semibold text-gray-900">Colar notícia</h2>
      <p className="text-sm text-gray-500">Cole o texto em qualquer idioma. Depois, traduza para português ou gere posts no seu tom de voz.</p>
      <label className="block text-sm">Título (opcional)
        <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} maxLength={300} />
      </label>
      <label className="block text-sm">Texto da notícia
        <textarea className={inputClass} rows={12} value={text} onChange={e => setText(e.target.value)} maxLength={12000} required />
        <span className="text-xs text-gray-500">{text.length}/12.000 caracteres. Cole o texto, não apenas o link.</span>
      </label>
      <label className="block text-sm">Link da fonte (opcional)
        <input className={inputClass} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" className="px-4 py-2 rounded-lg bg-orange-500 text-white">Usar notícia</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border">Cancelar</button>
      </div>
    </form>
  )
}
