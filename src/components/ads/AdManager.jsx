import { useState, useMemo } from 'react'
import {
  Plus, DollarSign, Calendar, TrendingUp, BarChart2, Edit3,
  Trash2, X, Check, Filter, Search, Eye, Target, Users,
  ArrowUpRight, ArrowDownRight, Minus, Clock, CheckCircle2,
  AlertCircle, ChevronDown, ExternalLink, UserPlus, Phone,
  MessageSquare, Star, XCircle, ArrowRight, Mail, Building2, Hash, FileText,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'
import ReportBuilder from '../analytics/ReportBuilder'

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

const LEAD_STAGES = [
  { id: 'new', label: 'Novo Lead', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { id: 'contact', label: 'Contato Feito', color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  { id: 'proposal', label: 'Proposta Enviada', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { id: 'negotiation', label: 'Negociação', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  { id: 'won', label: 'Fechou!', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'lost', label: 'Perdido', color: 'bg-red-100 text-red-600 border-red-200', dot: 'bg-red-500' },
]

const LEAD_SOURCES = [
  'Instagram DM', 'LinkedIn', 'Indicação', 'Email', 'WhatsApp', 'Site', 'Evento', 'Outro',
]

const EMPTY_AD = {
  title: '', client: '', platform: 'instagram', ad_type: 'publi', status: 'draft',
  budget: '', spent: '', revenue: '', start_date: '', end_date: '',
  impressions: '', reach: '', clicks: '', conversions: '', notes: '', link: '',
}

const EMPTY_LEAD = {
  name: '', company: '', contact: '', email: '', source: 'Instagram DM',
  stage: 'new', value: '', notes: '', next_followup: '', service: '',
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

function daysAgo(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - d) / (1000 * 60 * 60 * 24))
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

/* ── Lead Form Modal ────────────────────────────────────── */
function LeadForm({ lead, onSave, onClose }) {
  const [form, setForm] = useState(lead || EMPTY_LEAD)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">{lead?.id ? 'Editar Lead' : 'Novo Lead'}</h3>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Nome / Marca *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="Nome do lead ou marca" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Empresa</label>
              <input value={form.company} onChange={e => set('company', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="Empresa (opcional)" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Contato (WhatsApp/Telefone)</label>
              <input value={form.contact} onChange={e => set('contact', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="email@exemplo.com" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Origem</label>
              <select value={form.source} onChange={e => set('source', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300">
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Etapa</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300">
                {LEAD_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Valor Estimado (R$)</label>
              <input type="number" step="0.01" value={form.value} onChange={e => set('value', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Serviço / Proposta</label>
              <input value={form.service} onChange={e => set('service', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" placeholder="Ex: Pack 3 Reels + 1 Carrossel" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Próximo Follow-up</label>
              <input type="date" value={form.next_followup} onChange={e => set('next_followup', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Observações</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-300 resize-none"
              placeholder="Histórico de conversas, detalhes da negociação, o que foi combinado..." />
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button type="submit" className="flex-1 py-2 text-sm font-medium bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors">
              {lead?.id ? 'Salvar' : 'Adicionar Lead'}
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
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{ad.title}</p>
            {ad.client && <p className="text-[10px] text-gray-400 mt-0.5">{ad.client}</p>}
          </div>
          <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-md border shrink-0', status.color)}>
            {status.label}
          </span>
        </div>

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

/* ── Lead Card ──────────────────────────────────────────── */
function LeadCard({ lead, onEdit, onDelete, onStageChange }) {
  const stage = LEAD_STAGES.find(s => s.id === lead.stage) || LEAD_STAGES[0]
  const days = daysAgo(lead.created_at)
  const fupDays = lead.next_followup ? daysAgo(lead.next_followup) : null
  const isOverdue = fupDays !== null && fupDays > 0
  const isFupToday = fupDays === 0

  return (
    <div className={clsx(
      'bg-white rounded-xl border hover:shadow-md transition-all',
      isOverdue ? 'border-red-200' : 'border-gray-200 hover:border-orange-200'
    )}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
            {lead.company && <p className="text-[10px] text-gray-400 mt-0.5">{lead.company}</p>}
          </div>
          <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-md border shrink-0', stage.color)}>
            {stage.label}
          </span>
        </div>

        {/* Info badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.source && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border bg-gray-50 text-gray-600 border-gray-200">{lead.source}</span>
          )}
          {lead.value && (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {fmtMoney(lead.value)}
            </span>
          )}
          {days !== null && (
            <span className="text-[10px] text-gray-400">{days === 0 ? 'Hoje' : `${days}d atrás`}</span>
          )}
        </div>

        {/* Service */}
        {lead.service && (
          <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">{lead.service}</p>
        )}

        {/* Contact info */}
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          {lead.contact && (
            <span className="flex items-center gap-1"><Phone size={10} /> {lead.contact}</span>
          )}
          {lead.email && (
            <span className="flex items-center gap-1 truncate"><Mail size={10} /> {lead.email}</span>
          )}
        </div>

        {/* Follow-up alert */}
        {lead.next_followup && (
          <div className={clsx(
            'flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg border',
            isOverdue ? 'bg-red-50 border-red-200 text-red-700' :
            isFupToday ? 'bg-amber-50 border-amber-200 text-amber-700' :
            'bg-blue-50 border-blue-200 text-blue-700'
          )}>
            <Clock size={11} />
            {isOverdue ? `Follow-up atrasado ${Math.abs(fupDays)}d` :
             isFupToday ? 'Follow-up hoje!' :
             `Próximo FUP: ${new Date(lead.next_followup + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
          </div>
        )}

        {/* Notes preview */}
        {lead.notes && (
          <p className="text-[11px] text-gray-500 line-clamp-2 italic">"{lead.notes}"</p>
        )}

        {/* Stage quick-change */}
        {lead.stage !== 'won' && lead.stage !== 'lost' && (
          <div className="flex gap-1.5 pt-1">
            {LEAD_STAGES.filter(s => s.id !== lead.stage && s.id !== 'new').map(s => (
              <button key={s.id} onClick={() => onStageChange(lead.id, s.id)}
                className={clsx('flex-1 text-[9px] font-medium py-1 rounded-md border transition-all hover:shadow-sm', s.color)}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <button onClick={() => onEdit(lead)} className="flex-1 text-[10px] font-medium text-gray-500 hover:text-orange-600 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-lg py-1.5 flex items-center justify-center gap-1 transition-all">
            <Edit3 size={10} /> Editar
          </button>
          <button onClick={() => onDelete(lead.id)} className="text-[10px] font-medium text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg py-1.5 px-3 flex items-center gap-1 transition-all">
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
  const leads = useStore(s => s.leads) || []
  const addLead = useStore(s => s.addLead)
  const updateLead = useStore(s => s.updateLead)
  const deleteLead = useStore(s => s.deleteLead)

  const clients = useStore(s => s.clients) || []
  const addClient = useStore(s => s.addClient)
  const updateClient = useStore(s => s.updateClient)
  const deleteClient = useStore(s => s.deleteClient)

  const [tab, setTab] = useState('campaigns') // 'campaigns' | 'leads' | 'clients' | 'reports'
  const [showForm, setShowForm] = useState(false)
  const [editingAd, setEditingAd] = useState(null)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [filterStage, setFilterStage] = useState('all')
  const [newClientName, setNewClientName] = useState('')
  const [newClientHashtags, setNewClientHashtags] = useState('')
  const [editingClient, setEditingClient] = useState(null)

  // ── Campaign handlers ──
  const handleSaveAd = (data) => {
    if (editingAd?.id) updateAd(editingAd.id, data)
    else addAd(data)
    setEditingAd(null)
  }

  const handleEditAd = (ad) => { setEditingAd(ad); setShowForm(true) }

  // ── Lead handlers ──
  const handleSaveLead = (data) => {
    if (editingLead?.id) updateLead(editingLead.id, data)
    else addLead(data)
    setEditingLead(null)
  }

  const handleEditLead = (lead) => { setEditingLead(lead); setShowLeadForm(true) }

  const handleStageChange = (id, stage) => updateLead(id, { stage })

  // ── Filtered data ──
  const filteredAds = (ads || []).filter(ad => {
    if (search && !ad.title.toLowerCase().includes(search.toLowerCase()) && !(ad.client || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus !== 'all' && ad.status !== filterStatus) return false
    if (filterPlatform !== 'all' && ad.platform !== filterPlatform) return false
    return true
  })

  const filteredLeads = leads.filter(l => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !(l.company || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterStage !== 'all' && l.stage !== filterStage) return false
    return true
  })

  // ── Stats ──
  const totalBudget = (ads || []).reduce((s, a) => s + (Number(a.budget) || 0), 0)
  const totalSpent = (ads || []).reduce((s, a) => s + (Number(a.spent) || 0), 0)
  const totalRevenue = (ads || []).reduce((s, a) => s + (Number(a.revenue) || 0), 0)
  const activeCount = (ads || []).filter(a => a.status === 'active').length

  const pipelineValue = leads.filter(l => !['won', 'lost'].includes(l.stage)).reduce((s, l) => s + (Number(l.value) || 0), 0)
  const wonValue = leads.filter(l => l.stage === 'won').reduce((s, l) => s + (Number(l.value) || 0), 0)
  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.stage)).length
  const overdueLeads = leads.filter(l => {
    if (!l.next_followup || ['won', 'lost'].includes(l.stage)) return false
    return daysAgo(l.next_followup) > 0
  }).length

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-lg">
        <button onClick={() => setTab('campaigns')}
          className={clsx('flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'campaigns' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          <DollarSign size={14} /> Campanhas
        </button>
        <button onClick={() => setTab('leads')}
          className={clsx('flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'leads' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          <UserPlus size={14} /> Leads
          {activeLeads > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">{activeLeads}</span>
          )}
        </button>
        <button onClick={() => setTab('clients')}
          className={clsx('flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'clients' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          <Building2 size={14} /> Clientes
          {clients.length > 0 && (
            <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">{clients.length}</span>
          )}
        </button>
        <button onClick={() => setTab('reports')}
          className={clsx('flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'reports' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          <FileText size={14} /> Relatórios
        </button>
      </div>

      {/* ════════════════ CAMPAIGNS TAB ════════════════ */}
      {tab === 'campaigns' && (
        <>
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

          {filteredAds.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <DollarSign size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">Nenhuma campanha encontrada</p>
              <p className="text-xs text-gray-400 mt-1">Clique em "Nova Campanha" para registrar publis, impulsionamentos e parcerias</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAds.map(ad => (
                <AdCard key={ad.id} ad={ad} onEdit={handleEditAd} onDelete={deleteAd} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════ LEADS TAB ════════════════ */}
      {tab === 'leads' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center"><UserPlus size={16} className="text-orange-500" /></div>
              <div><div className="text-sm font-bold text-gray-900">{activeLeads}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Leads Ativos</div></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><DollarSign size={16} className="text-amber-500" /></div>
              <div><div className="text-sm font-bold text-gray-900">{fmtMoney(pipelineValue)}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Pipeline</div></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-500" /></div>
              <div><div className="text-sm font-bold text-gray-900">{fmtMoney(wonValue)}</div><div className="text-[10px] text-gray-400 uppercase font-semibold">Fechados</div></div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3">
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', overdueLeads > 0 ? 'bg-red-50' : 'bg-gray-50')}>
                <Clock size={16} className={overdueLeads > 0 ? 'text-red-500' : 'text-gray-400'} />
              </div>
              <div>
                <div className={clsx('text-sm font-bold', overdueLeads > 0 ? 'text-red-600' : 'text-gray-900')}>{overdueLeads}</div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">FUPs Atrasados</div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar leads..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-300" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 outline-none focus:border-orange-300">
                <option value="all">Todas Etapas</option>
                {LEAD_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <button onClick={() => { setEditingLead(null); setShowLeadForm(true) }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-sm">
                <Plus size={14} /> Novo Lead
              </button>
            </div>
          </div>

          {/* Pipeline visual */}
          {leads.length > 0 && filterStage === 'all' && !search && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">Pipeline</h3>
              <div className="flex gap-1 items-end h-8">
                {LEAD_STAGES.map(stage => {
                  const count = leads.filter(l => l.stage === stage.id).length
                  const maxCount = Math.max(...LEAD_STAGES.map(s => leads.filter(l => l.stage === s.id).length), 1)
                  const pct = (count / maxCount) * 100
                  return (
                    <div key={stage.id} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-gray-700">{count}</span>
                      <div className={clsx('w-full rounded-t-md transition-all', stage.dot)} style={{ height: `${Math.max(pct * 0.32, 4)}px` }} />
                      <span className="text-[8px] text-gray-400 truncate w-full text-center">{stage.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {filteredLeads.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <UserPlus size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">Nenhum lead encontrado</p>
              <p className="text-xs text-gray-400 mt-1">Clique em "Novo Lead" para adicionar propostas e negociações em andamento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} onEdit={handleEditLead} onDelete={deleteLead} onStageChange={handleStageChange} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════ CLIENTS TAB ════════════════ */}
      {tab === 'clients' && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 size={16} className="text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Cadastro de Clientes</h3>
                <p className="text-xs text-gray-400">Cadastre seus clientes e hashtags associadas. Eles aparecerão automaticamente no Gerador de Relatório.</p>
              </div>
            </div>

            {/* Add client form */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Nome do Cliente</label>
                <input
                  type="text"
                  value={editingClient ? editingClient.name : newClientName}
                  onChange={e => editingClient ? setEditingClient({ ...editingClient, name: e.target.value }) : setNewClientName(e.target.value)}
                  placeholder="Ex: FIAP, Samsung, Glamour..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Hashtags / @ (separar por vírgula)</label>
                <input
                  type="text"
                  value={editingClient ? editingClient.hashtags : newClientHashtags}
                  onChange={e => editingClient ? setEditingClient({ ...editingClient, hashtags: e.target.value }) : setNewClientHashtags(e.target.value)}
                  placeholder="Ex: #publi, @fiapoficial, #Fiap"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300"
                />
              </div>
              <div className="flex items-end gap-2">
                {editingClient ? (
                  <>
                    <button
                      onClick={() => {
                        if (editingClient.name.trim()) {
                          updateClient(editingClient.id, { name: editingClient.name.trim(), hashtags: editingClient.hashtags.trim() })
                          setEditingClient(null)
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                    >
                      <Check size={14} /> Salvar
                    </button>
                    <button
                      onClick={() => setEditingClient(null)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      if (newClientName.trim()) {
                        addClient({ name: newClientName.trim(), hashtags: newClientHashtags.trim() })
                        setNewClientName('')
                        setNewClientHashtags('')
                      }
                    }}
                    disabled={!newClientName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Client list */}
          {clients.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Building2 size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">Nenhum cliente cadastrado</p>
              <p className="text-xs text-gray-400 mt-1">Adicione seus clientes acima para facilitar a geração de relatórios</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...clients].sort((a, b) => a.name.localeCompare(b.name)).map(client => (
                <div key={client.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-3 group hover:border-blue-200 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: client.color || '#3b82f6' }}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-bold text-gray-900 truncate">{client.name}</p>
                    </div>
                    {client.hashtags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {client.hashtags.split(',').map((tag, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-300 mt-2">
                      Criado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setEditingClient({ id: client.id, name: client.name, hashtags: client.hashtags || '' })}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => { if (confirm(`Remover ${client.name}?`)) deleteClient(client.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════ REPORTS TAB ════════════════ */}
      {tab === 'reports' && <ReportBuilder />}

      {/* Form modals */}
      {showForm && (
        <AdForm ad={editingAd} onSave={handleSaveAd} onClose={() => { setShowForm(false); setEditingAd(null) }} />
      )}
      {showLeadForm && (
        <LeadForm lead={editingLead} onSave={handleSaveLead} onClose={() => { setShowLeadForm(false); setEditingLead(null) }} />
      )}
    </div>
  )
}
