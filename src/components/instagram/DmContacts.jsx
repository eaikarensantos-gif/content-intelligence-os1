import { useEffect, useState } from 'react'
import { Users, Search, Download, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { monthStartISO, contactsToCsv } from '../../lib/dmContacts'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DmContacts() {
  const db = getSupabase()

  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [tag, setTag] = useState('')
  const [field, setField] = useState('')
  const [value, setValue] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)

  const search = async () => {
    if (!db) return
    setLoading(true)
    setLoadError(null)

    let query = db.from('ig_contacts').select('*').order('last_interaction_at', { ascending: false })
    if (tag.trim()) query = query.contains('tags', [tag.trim()])
    if (field.trim() && value.trim()) query = query.eq(`fields->>${field.trim()}`, value.trim())
    if (activeOnly) query = query.gte('last_interaction_at', monthStartISO())

    const { data, error } = await query
    if (error) setLoadError(error.message)
    else setContacts(data || [])
    setLoading(false)
  }

  useEffect(() => { search() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    setTag('')
    setField('')
    setValue('')
    setActiveOnly(false)
    setTimeout(search, 0)
  }

  const handleExportCsv = () => {
    const csv = contactsToCsv(contacts)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contatos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="card p-6 flex items-center gap-3 text-sm text-gray-600">
          <AlertCircle size={18} className="text-orange-500 shrink-0" />
          Configure o Supabase em Configurações antes de ver os contatos.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2"><Users size={20} className="text-orange-500" /> Contatos</h1>
          <p className="text-sm text-gray-500 mt-1">{contacts.length} contato{contacts.length === 1 ? '' : 's'} {loading ? '' : 'encontrado' + (contacts.length === 1 ? '' : 's')}</p>
        </div>
        <button className="btn-secondary" onClick={handleExportCsv} disabled={loading || contacts.length === 0}>
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto_auto_auto] gap-3 items-end">
          <div>
            <label className="label">Tag</label>
            <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex: lead-lancamento" />
          </div>
          <div>
            <label className="label">Campo customizado</label>
            <input className="input" value={field} onChange={(e) => setField(e.target.value)} placeholder="Ex: plano" />
          </div>
          <div>
            <label className="label">Valor</label>
            <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex: pro" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 pb-2 whitespace-nowrap">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            Ativos no mês
          </label>
          <button className="btn-primary" onClick={search} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Buscar
          </button>
          <button className="btn-ghost" onClick={handleReset}>
            <RotateCcw size={14} /> Limpar
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loadError && <div className="text-xs text-red-600 p-4">{loadError}</div>}
        {!loading && !loadError && contacts.length === 0 && <div className="text-sm text-gray-400 p-8 text-center">Nenhum contato encontrado com esses filtros.</div>}
        {contacts.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium">Campos</th>
                <th className="px-4 py-3 font-medium">Última interação</th>
                <th className="px-4 py-3 font-medium">Desde</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.ig_username || <span className="text-gray-400">{c.ig_scoped_id}</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags || []).map((t) => (
                        <span key={t} className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full">{t}</span>
                      ))}
                      {(c.tags || []).length === 0 && <span className="text-gray-300 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {Object.keys(c.fields || {}).length > 0 ? JSON.stringify(c.fields) : <span className="text-gray-300 font-sans">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.last_interaction_at)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
