import { useState } from 'react'
import {
  Plus, DollarSign, Calendar, TrendingUp, BarChart2, Edit3,
  Trash2, X, Check, Filter, Search, Eye, Target, Users,
  ArrowUpRight, ArrowDownRight, Minus, Clock, CheckCircle2,
  AlertCircle, ChevronDown, ExternalLink,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'

/* ── Constants ──────────────────────────────────────────── */
const STATUSES = [
  { id: 'draft', label: 'Rascunho', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
  { id: 'active', label: 'Ativo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'paused', label: 'Pausado', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { id: 'completed', label: 'Concluído', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { id: 'cancelled', label: 'Cancelado', color: 'bg-red-100 text-red-600 border-red-200', dot: 'bg-red-500' },
]

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'google', label: 'Google Ads', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'youtube', label: 'YouTube', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'other', label: 'Outro', color: 'bg-gray-100 text-gray-600 border-gray-200' },
]

const AD_TYPES = [
  { id: 'publi', label: 'Publi' },
  { id: 'boost', label: 'Impulsionamento' },
  { id: 'partnership', label: 'Parceria Paga' },
  { id: 'sponsored', label: 'Patrocinado' },
  { id: 'affiliate', label: 'Afiliado' },
  { id: 'other', label: 'Outro' },
]

const EMPTY_AD = {
  title: '',
  client: '',
  platform: 'instagram',
  ad_type: 'publi',
  status: 'draft',
  budget: '',
  spent: '',
  revenue: '',
  start_date: '',
  end_date: '',
  impressions: '',
  reach: '',
  clicks: '',
  conversions: '',
  notes: '',
  link: '',
}

function fmt(n) {
  if (!n && n !== 0) return '-'
  return Number(n).toLocaleString('pt-BR')
}

function fmtMoney(n) {
  if (!n && n !== 0) return '-'
  return `R$ ${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function calcROI(revenue, spent) {
  if (!spent || !revenue) return null
  return ((Number(revenue) - Number(spent)) / Number(spent) * 100)
}

/* ── Ad Form Modal ──────────────────────────────────────── */
function AdForm({ ad, onSave, onClose }) {
  const [form, setForm] = useState(ad || EMPTY_AD)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">{ad?.id ? 'Editar Campanha' : 'Nova Campanha'}</h3>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          {/* Title + Client */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Título *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="Nome da campanha" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Cliente</label>
              <input value={form.client} onChange={e => set('client', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="Ex: FIAP, Brand X" />
            </div>
          </div>

          {/* Platform + Type + Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Plataforma</label>
              <select value={form.platform} onChange={e => set('platform', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300">
                {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Tipo</label>
              <select value={form.ad_type} onChange={e => set('ad_type', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300">
                {AD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300">
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Budget + Spent + Revenue */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Orçamento (R$)</label>
              <input type="number" step="0.01" value={form.budget} onChange={e => set('budget', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="0.00" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Gasto (R$)</label>
              <input type="number" step="0.01" value={form.spent} onChange={e => set('spent', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="0.00" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Receita (R$)</label>
              <input type="number" step="0.01" value={form.revenue} onChange={e => set('revenue', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="0.00" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Início</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Término</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: 'impressions', label: 'Impressões' },
              { key: 'reach', label: 'Alcance' },
              { key: 'clicks', label: 'Cliques' },
              { key: 'conversions', label: 'Conversões' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">{label}</label>
                <input type="number" value={form[key]} onChange={e => set(key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="0" />
              </div>
            ))}
          </div>

          {/* Link + Notes */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Link do Post/Anúncio</label>
            <input value={form.link} onChange={e => set('link', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="https://..." />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Observações</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300 resize-none" placeholder="Notas internas..." />
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button type="submit" className="flex-1 py-2 text-sm font-medium bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors">
              {ad?.id ? 'Salvar' : 'Criar Campanha'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 rounded-xl transition-colors">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Ad Card ────────────────────────────────────────────── */
function AdCard({ ad, onEdit, onDelete }) {
  const status = STATUSES.find(s => s.id === ad.status) || STATUSES[0]
  const platform = PLATFORMS.find(p => p.id === ad.platform) || PLATFORMS[6]
  const adType = AD_TYPES.find(t => t.id === ad.ad_type)
  const roi = calcROI(ad.revenue, ad.spent)
  const budgetPct = ad.budget && ad.spent ? Math.min((Number(ad.spent) / Number(ad.budget)) * 100, 100) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-orange-200 hover:shadow-md transition-all">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{ad.title}</p>
            {ad.client && <p className="text-[10px] text-gray-400 mt-0.5">{ad.client}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-md border', status.color)}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-md border', platform.color)}>{platform.label}</span>
          {adType && <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border bg-gray-50 text-gray-600 border-gray-200">{adType.label}</span>}
          {ad.start_date && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Calendar size={9} /> {new Date(ad.start_date + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              {ad.end_date && ` - ${new Date(ad.end_date + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
            </span>
          )}
        </div>

        {/* Budget bar */}
        {ad.budget && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">Orçamento</span>
              <span className="text-[10px] font-medium text-gray-600">{fmtMoney(ad.spent)} / {fmtMoney(ad.budget)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={clsx('h-full rounded-full transition-all', budgetPct > 90 ? 'bg-red-400' : budgetPct > 70 ? 'bg-amber-400' : 'bg-emerald-400')}
                style={{ width: `${budgetPct}%` }} />
            </div>
          </div>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Impressões', value: ad.impressions, icon: Eye },
            { label: 'Alcance', value: ad.reach, icon: Users },
            { label: 'Cliques', value: ad.clicks, icon: Target },
            { label: 'Conversões', value: ad.conversions, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <Icon size={10} className="text-gray-300 mx-auto mb-0.5" />
              <p className="text-xs font-semibold text-gray-800">{fmt(value)}</p>
              <p className="text-[8px] text-gray-400 uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* ROI + Revenue */}
        {(ad.revenue || roi !== null) && (
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            {ad.revenue && (
              <div className="flex items-center gap-1.5">
                <DollarSign size={12} className="text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700">{fmtMoney(ad.revenue)}</span>
                <span className="text-[10px] text-gray-400">receita</span>
              </div>
            )}
            {roi !== null && (
              <div className={clsx('flex items-center gap-1 text-xs font-bold', roi >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {roi >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(roi).toFixed(0)}% ROI
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={() => onEdit(ad)} className="flex-1 text-[10px] font-medium text-gray-500 hover:text-orange-600 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-lg py-1.5 flex items-center justify-center gap-1 transition-all">
            <Edit3 size={10} /> Editar
          </button>
          {ad.link && (
            <a href={ad.link} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-medium text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg py-1.5 px-3 flex items-center gap-1 transition-all">
              <ExternalLink size={10} />
            </a>
          )}
          <button onClick={() => onDelete(ad.id)} className="text-[10px] font-medium text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg py-1.5 px-3 flex items-center gap-1 transition-all">
            <Trash2 size={10} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────── */
export default function AdManager() {
  const ads = useStore(s => s.ads)
  const addAd = useStore(s => s.addAd)
  const updateAd = useStore(s => s.updateAd)
  const deleteAd = useStore(s => s.deleteAd)

  const [showForm, setShowForm] = useState(false)
  const [editingAd, setEditingAd] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlatform, setFilterPlatform] = useState('all')

  const handleSave = (data) => {
    if (editingAd?.id) {
      updateAd(editingAd.id, data)
    } else {
      addAd(data)
    }
    setEditingAd(null)
  }

  const handleEdit = (ad) => {
    setEditingAd(ad)
    setShowForm(true)
  }

  const filtered = (ads || []).filter(ad => {
    if (search && !ad.title.toLowerCase().includes(search.toLowerCase()) && !(ad.client || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus !== 'all' && ad.status !== filterStatus) return false
    if (filterPlatform !== 'all' && ad.platform !== filterPlatform) return false
    return true
  })

  // Stats
  const totalBudget = (ads || []).reduce((s, a) => s + (Number(a.budget) || 0), 0)
  const totalSpent = (ads || []).reduce((s, a) => s + (Number(a.spent) || 0), 0)
  const totalRevenue = (ads || []).reduce((s, a) => s + (Number(a.revenue) || 0), 0)
  const activeCount = (ads || []).filter(a => a.status === 'active').length

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center"><DollarSign size={16} className="text-orange-500" /></div>
          <div><div className="text-sm font-bold text-gray-900">{fmtMoney(totalBudget)}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Orçamento Total</div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><TrendingUp size={16} className="text-red-500" /></div>
          <div><div className="text-sm font-bold text-gray-900">{fmtMoney(totalSpent)}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Total Gasto</div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><DollarSign size={16} className="text-emerald-500" /></div>
          <div><div className="text-sm font-bold text-gray-900">{fmtMoney(totalRevenue)}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Receita Total</div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><BarChart2 size={16} className="text-blue-500" /></div>
          <div><div className="text-sm font-bold text-gray-900">{activeCount}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Campanhas Ativas</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar campanhas..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-300" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 outline-none focus:border-orange-300">
            <option value="all">Todos Status</option>
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 outline-none focus:border-orange-300">
            <option value="all">Todas Plataformas</option>
            {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button onClick={() => { setEditingAd(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-sm">
            <Plus size={14} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* Ads grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <DollarSign size={28} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">Nenhuma campanha encontrada</p>
          <p className="text-xs text-gray-400 mt-1">Clique em "Nova Campanha" para registrar publis, impulsionamentos e parcerias</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(ad => (
            <AdCard key={ad.id} ad={ad} onEdit={handleEdit} onDelete={deleteAd} />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <AdForm
          ad={editingAd}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingAd(null) }}
        />
      )}
    </div>
  )
}
