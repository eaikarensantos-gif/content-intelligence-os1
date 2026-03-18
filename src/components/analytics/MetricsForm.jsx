import { useState } from 'react'
import { Upload, Plus, FileText, ExternalLink } from 'lucide-react'
import Papa from 'papaparse'
import Modal from '../common/Modal'
import useStore from '../../store/useStore'

const EMPTY = {
  post_id: '', platform: 'instagram', date: new Date().toISOString().split('T')[0],
  impressions: '', reach: '', likes: '', comments: '', shares: '', saves: '', link_clicks: '',
  follows: '', duration_sec: '',
}

const NUMERIC_FIELDS = [
  ['impressions', 'Visualizações'], ['reach', 'Alcance'], ['likes', 'Curtidas'],
  ['comments', 'Comentários'], ['shares', 'Compartilhamentos'], ['saves', 'Salvamentos'],
  ['follows', 'Seguimentos'], ['link_clicks', 'Cliques no Link'], ['duration_sec', 'Duração (s)'],
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

  // ── mapeamento de colunas PT → EN (+ exportação bruta do Instagram) ────────
  const COL_MAP = {
    // identificador
    'post_id': 'post_id', 'post id': 'post_id',

    // datas
    'data': 'date', 'publish time': 'date', 'horário de publicação': 'date',
    'horario de publicação': 'date', 'horário de publicacao': 'date',
    'horario de publicacao': 'date', 'publish_time': 'date',

    // plataforma
    'plataforma': 'platform', 'platform': 'platform',

    // tipo de post
    'post type': 'post_type', 'tipo de post': 'post_type', 'tipo': 'post_type',
    'post_type': 'post_type',

    // descrição / legenda do post
    'description': 'description', 'descrição': 'description', 'descricao': 'description',
    'descriçao': 'description', 'legenda': 'description',

    // permalink / link permanente
    'permalink': 'link', 'link permanente': 'link', 'link': 'link', 'url': 'link',

    // comentário de dados (campo extra de observações)
    'comentário de dados': 'data_comment', 'comentario de dados': 'data_comment',
    'data comment': 'data_comment',

    // duração
    'duração (s)': 'duration_sec', 'duracao (s)': 'duration_sec', 'duração': 'duration_sec',
    'duracao': 'duration_sec', 'duration': 'duration_sec', 'duration (s)': 'duration_sec',

    // visualizações / impressões
    'visualizações': 'impressions', 'visualizacoes': 'impressions', 'visualizaçoes': 'impressions',
    'impressões': 'impressions', 'impressoes': 'impressions', 'impressions': 'impressions',
    'views': 'impressions',

    // alcance
    'alcance': 'reach', 'reach': 'reach',

    // curtidas
    'curtidas': 'likes', 'likes': 'likes',

    // comentários
    'coment.': 'comments', 'comentários': 'comments', 'comentarios': 'comments',
    'comments': 'comments', 'replies': 'comments',

    // compartilhamentos
    'compart.': 'shares', 'compartilhamentos': 'shares', 'shares': 'shares',

    // seguimentos / follows
    'seguimentos': 'follows', 'follows': 'follows', 'seguidores': 'follows',
    'new followers': 'follows', 'novos seguidores': 'follows',

    // salvamentos
    'salvam.': 'saves', 'salvamentos': 'saves', 'saves': 'saves', 'sticker taps': 'saves',

    // cliques no link
    'cliques no link': 'link_clicks', 'link_clicks': 'link_clicks', 'link clicks': 'link_clicks',
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

  // "IG story" → "story" · "IG Reel" → "reel" · "IG carousel post" → "carousel" …
  const normalizePostType = (raw = '') => {
    const v = raw.toLowerCase().trim()
    if (v.includes('story') || v.includes('storie')) return 'story'
    if (v.includes('reel')) return 'reel'
    if (v.includes('carousel')) return 'carousel'
    if (v.includes('video')) return 'video'
    if (v.includes('image') || v.includes('photo') || v.includes('foto')) return 'image'
    return v || ''
  }

  // Aceita múltiplos formatos de data:
  // DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, "20 mar. 2025 16:52"
  const normalizeDate = (raw = '') => {
    const s = raw.trim()
    if (!s) return new Date().toISOString().split('T')[0]

    // ISO direto: YYYY-MM-DD
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

    // Formato "20 mar. 2025 16:52" ou "20 mar 2025"
    const ptMonth = { 'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
                      'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12' }
    const brLong = s.match(/(\d{1,2})\s+de?\s*(\w{3})\.?\s+(\d{4})/)
    if (brLong) {
      const mon = ptMonth[brLong[2].toLowerCase().replace('.', '')] || '01'
      return `${brLong[3]}-${mon}-${brLong[1].padStart(2, '0')}`
    }

    // DD/MM/YYYY ou MM/DD/YYYY — assume DD/MM/YYYY (padrão BR)
    const slash = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (slash) {
      const day = slash[1].padStart(2, '0')
      const month = slash[2].padStart(2, '0')
      // Se dia > 12, é com certeza DD/MM/YYYY
      // Se mês > 12, é com certeza MM/DD/YYYY
      // Default: assume DD/MM/YYYY (formato brasileiro)
      if (Number(slash[1]) > 12) return `${slash[3]}-${month}-${day}`
      if (Number(slash[2]) > 12) return `${slash[3]}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`
      return `${slash[3]}-${month}-${day}` // default BR: DD/MM/YYYY
    }

    // Fallback genérico
    const d = new Date(s)
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
    // Se não veio platform mas veio post_type, deduz instagram
    const platform = row.platform
      ? normalizePlatform(row.platform)
      : (row.post_type ? 'instagram' : 'instagram')
    return {
      post_id:      row.post_id || '',
      platform,
      date:         normalizeDate(row.date),
      impressions:  toNumber(row.impressions),
      reach:        toNumber(row.reach),
      likes:        toNumber(row.likes),
      comments:     toNumber(row.comments),
      shares:       toNumber(row.shares),
      saves:        toNumber(row.saves),
      follows:      toNumber(row.follows),
      link_clicks:  toNumber(row.link_clicks),
      duration_sec: toNumber(row.duration_sec),
      // Campos de texto
      description:  (row.description || '').trim(),
      link:         (row.link || '').trim(),
      post_type:    normalizePostType(row.post_type),
      data_comment: (row.data_comment || '').trim(),
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
              Aceita colunas em português: <span className="text-gray-500">Descrição, Duração (s), Horário de publicação, Link permanente, Tipo de post, Comentário de dados, Data, Visualizações, Alcance, Curtidas, Compartilhamentos, Seguimentos, Comentários, Salvamentos</span>
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
                  <div key={i} className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 last:border-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {row.post_type && (
                        <span className="chip border text-[10px] bg-purple-50 text-purple-600 border-purple-200 capitalize">{row.post_type}</span>
                      )}
                      <span className="font-medium text-gray-700">{row.platform} · {row.date}</span>
                      {row.duration_sec > 0 && <span className="text-[10px] text-gray-400">{row.duration_sec}s</span>}
                      {row.link && (
                        <a href={row.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-400 hover:text-blue-600">
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span>{(row.impressions || 0).toLocaleString()} vis.</span>
                      <span>{(row.reach || 0).toLocaleString()} alc.</span>
                      <span>{row.likes} curt.</span>
                      <span>{row.comments} coment.</span>
                      <span>{row.shares} compart.</span>
                      {row.follows > 0 && <span>{row.follows} seg.</span>}
                      <span>{row.saves} salv.</span>
                    </div>
                    {row.description && (
                      <p className="text-[10px] text-gray-400 truncate">{row.description.slice(0, 80)}{row.description.length > 80 ? '…' : ''}</p>
                    )}
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
