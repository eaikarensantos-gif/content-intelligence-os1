import { useState } from 'react'
import { Upload, Plus, FileText } from 'lucide-react'
import Papa from 'papaparse'
import Modal from '../common/Modal'
import useStore from '../../store/useStore'

const EMPTY = {
  post_id: '', platform: 'linkedin', date: new Date().toISOString().split('T')[0],
  impressions: '', reach: '', likes: '', comments: '', shares: '', saves: '', link_clicks: '',
}

const NUMERIC_FIELDS = [
  ['impressions', 'Impressões'], ['reach', 'Alcance'], ['likes', 'Curtidas'],
  ['comments', 'Comentários'], ['shares', 'Compartilhamentos'], ['saves', 'Salvamentos'], ['link_clicks', 'Cliques no Link'],
]

export default function MetricsForm({ open, onClose }) {
  const posts = useStore((s) => s.posts)
  const addMetric = useStore((s) => s.addMetric)
  const [form, setForm] = useState(EMPTY)
  const [tab, setTab] = useState('manual')
  const [csvResult, setCsvResult] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    addMetric({
      ...form,
      ...Object.fromEntries(NUMERIC_FIELDS.map(([k]) => [k, Number(form[k]) || 0])),
    })
    setForm(EMPTY)
    onClose()
  }

  // ── mapeamento de colunas PT → EN ──────────────────────────────────────────
  const COL_MAP = {
    // datas
    'data': 'date', 'date': 'date',
    // plataforma
    'plataforma': 'platform', 'platform': 'platform',
    // números
    'impressões': 'impressions', 'impressoes': 'impressions', 'impressions': 'impressions',
    'alcance': 'reach', 'reach': 'reach',
    'curtidas': 'likes', 'likes': 'likes',
    'coment.': 'comments', 'comentários': 'comments', 'comentarios': 'comments', 'comments': 'comments',
    'compart.': 'shares', 'compartilhamentos': 'shares', 'shares': 'shares',
    'salvam.': 'saves', 'salvamentos': 'saves', 'saves': 'saves',
    'cliques no link': 'link_clicks', 'link_clicks': 'link_clicks',
    'post_id': 'post_id',
  }

  const normalizePlatform = (raw = '') => {
    const v = raw.toLowerCase()
    if (v.includes('ig') || v.includes('instagram')) return 'instagram'
    if (v.includes('fb') || v.includes('facebook')) return 'facebook'
    if (v.includes('tw') || v.includes('twitter') || v === 'x') return 'twitter'
    if (v.includes('yt') || v.includes('youtube')) return 'youtube'
    if (v.includes('tk') || v.includes('tiktok')) return 'tiktok'
    if (v.includes('li') || v.includes('linkedin')) return 'linkedin'
    return v || 'instagram'
  }

  // MM/DD/YYYY HH:MM  →  YYYY-MM-DD
  const normalizeDate = (raw = '') => {
    const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    if (m) return `${m[3]}-${m[1]}-${m[2]}`
    // fallback: tenta ISO direto
    const d = new Date(raw)
    if (!isNaN(d)) return d.toISOString().split('T')[0]
    return new Date().toISOString().split('T')[0]
  }

  const toNumber = (v = '') =>
    Number(String(v).replace(/[^0-9]/g, '')) || 0

  const normalizeRow = (raw) => {
    const row = {}
    for (const [key, val] of Object.entries(raw)) {
      const mapped = COL_MAP[key.toLowerCase().trim()]
      if (mapped) row[mapped] = val
    }
    return {
      post_id:     row.post_id || '',
      platform:    normalizePlatform(row.platform),
      date:        normalizeDate(row.date),
      impressions: toNumber(row.impressions),
      reach:       toNumber(row.reach),
      likes:       toNumber(row.likes),
      comments:    toNumber(row.comments),
      shares:      toNumber(row.shares),
      saves:       toNumber(row.saves),
      link_clicks: toNumber(row.link_clicks),
    }
  }

  const handleCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setCsvResult(data.map(normalizeRow))
      },
    })
  }

  const importCSV = () => {
    if (!csvResult) return
    csvResult.forEach((row) => addMetric(row))
    setCsvResult(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Métricas de Desempenho">
      {/* Abas */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-5">
        {[['manual', 'Entrada Manual'], ['csv', 'Upload CSV']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
              tab === id ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletor de post */}
          <div>
            <label className="label">Post Vinculado</label>
            <select className="select" value={form.post_id} onChange={(e) => set('post_id', e.target.value)} required>
              <option value="">Selecione um post...</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>{p.title.slice(0, 50)} — {p.platform}</option>
              ))}
            </select>
          </div>

          {/* Plataforma + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Plataforma</label>
              <select className="select" value={form.platform} onChange={(e) => set('platform', e.target.value)}>
                {['linkedin', 'instagram', 'twitter', 'youtube', 'tiktok'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Data</label>
              <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
          </div>

          {/* Grid de métricas */}
          <div className="grid grid-cols-2 gap-3">
            {NUMERIC_FIELDS.map(([key, label]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  placeholder="0"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Preview calculado */}
          {(form.likes || form.comments || form.shares || form.saves) && (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Prévia das Métricas Calculadas</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  ['Engajamento', (Number(form.likes || 0) + Number(form.comments || 0) + Number(form.shares || 0) + Number(form.saves || 0)).toLocaleString()],
                  ['Taxa Eng.', form.impressions ? `${((Number(form.likes || 0) + Number(form.comments || 0) + Number(form.shares || 0) + Number(form.saves || 0)) / Number(form.impressions) * 100).toFixed(2)}%` : '—'],
                  ['Autoridade', (Number(form.shares || 0) + Number(form.saves || 0)).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label} className="text-center">
                    <p className="text-gray-400">{label}</p>
                    <p className="text-gray-800 font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">
              <Plus size={14} /> Adicionar Métricas
            </button>
          </div>
        </form>
      )}

      {tab === 'csv' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center">
            <Upload size={24} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-700 mb-1">Faça upload de um arquivo CSV</p>
            <p className="text-xs text-gray-400 mb-3">
              Aceita exportações do Instagram/Meta: <span className="text-gray-500">Data, Plataforma, Impressões, Alcance, Curtidas, Coment., Compart., Salvam.</span>
            </p>
            <label className="btn-primary cursor-pointer inline-flex">
              <FileText size={14} /> Escolher CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            </label>
          </div>

          {csvResult && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Encontradas <span className="text-emerald-600 font-semibold">{csvResult.length} linhas</span> prontas para importar
              </p>
              <div className="max-h-40 overflow-y-auto rounded-lg bg-gray-50 border border-gray-200">
                {csvResult.slice(0, 5).map((row, i) => (
                  <div key={i} className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 last:border-0">
                    {row.platform} · {row.date} · {(row.impressions || 0).toLocaleString()} imp. · {row.likes} curtidas
                  </div>
                ))}
                {csvResult.length > 5 && (
                  <div className="px-3 py-2 text-xs text-gray-400">+ {csvResult.length - 5} linhas mais</div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setCsvResult(null)}>Limpar</button>
                <button className="btn-primary" onClick={importCSV}>
                  Importar {csvResult.length} linhas
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
