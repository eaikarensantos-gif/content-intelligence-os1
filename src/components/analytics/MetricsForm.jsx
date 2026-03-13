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
  ['impressions', 'Impressions'], ['reach', 'Reach'], ['likes', 'Likes'],
  ['comments', 'Comments'], ['shares', 'Shares'], ['saves', 'Saves'], ['link_clicks', 'Link Clicks'],
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

  const handleCSV = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setCsvResult(data)
      },
    })
  }

  const importCSV = () => {
    if (!csvResult) return
    csvResult.forEach((row) => {
      addMetric({
        post_id: row.post_id || '',
        platform: row.platform || 'linkedin',
        date: row.date || new Date().toISOString().split('T')[0],
        impressions: Number(row.impressions) || 0,
        reach: Number(row.reach) || 0,
        likes: Number(row.likes) || 0,
        comments: Number(row.comments) || 0,
        shares: Number(row.shares) || 0,
        saves: Number(row.saves) || 0,
        link_clicks: Number(row.link_clicks) || 0,
      })
    })
    setCsvResult(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Performance Metrics">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-5">
        {[['manual', 'Manual Entry'], ['csv', 'CSV Upload']].map(([id, label]) => (
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
          {/* Post selector */}
          <div>
            <label className="label">Linked Post</label>
            <select className="select" value={form.post_id} onChange={(e) => set('post_id', e.target.value)} required>
              <option value="">Select a post...</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>{p.title.slice(0, 50)} — {p.platform}</option>
              ))}
            </select>
          </div>

          {/* Platform + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Platform</label>
              <select className="select" value={form.platform} onChange={(e) => set('platform', e.target.value)}>
                {['linkedin', 'instagram', 'twitter', 'youtube', 'tiktok'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required />
            </div>
          </div>

          {/* Metrics grid */}
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

          {/* Calculated preview */}
          {(form.likes || form.comments || form.shares || form.saves) && (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Calculated Metrics Preview</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  ['Engagement', (Number(form.likes || 0) + Number(form.comments || 0) + Number(form.shares || 0) + Number(form.saves || 0)).toLocaleString()],
                  ['Eng. Rate', form.impressions ? `${((Number(form.likes || 0) + Number(form.comments || 0) + Number(form.shares || 0) + Number(form.saves || 0)) / Number(form.impressions) * 100).toFixed(2)}%` : '—'],
                  ['Authority', (Number(form.shares || 0) + Number(form.saves || 0)).toLocaleString()],
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
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              <Plus size={14} /> Add Metrics
            </button>
          </div>
        </form>
      )}

      {tab === 'csv' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center">
            <Upload size={24} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-700 mb-1">Upload a CSV file</p>
            <p className="text-xs text-gray-400 mb-3">
              Columns: post_id, platform, date, impressions, reach, likes, comments, shares, saves, link_clicks
            </p>
            <label className="btn-primary cursor-pointer inline-flex">
              <FileText size={14} /> Choose CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            </label>
          </div>

          {csvResult && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Found <span className="text-emerald-600 font-semibold">{csvResult.length} rows</span> ready to import
              </p>
              <div className="max-h-40 overflow-y-auto rounded-lg bg-gray-50 border border-gray-200">
                {csvResult.slice(0, 5).map((row, i) => (
                  <div key={i} className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 last:border-0">
                    {row.post_id || 'No post_id'} · {row.platform} · {row.date} · {parseInt(row.impressions || 0).toLocaleString()} imp.
                  </div>
                ))}
                {csvResult.length > 5 && (
                  <div className="px-3 py-2 text-xs text-gray-400">+ {csvResult.length - 5} more rows</div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setCsvResult(null)}>Clear</button>
                <button className="btn-primary" onClick={importCSV}>
                  Import {csvResult.length} rows
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
