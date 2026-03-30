import { useState, useEffect, useRef } from 'react'
import {
  DollarSign, FileText, Plus, Trash2, Edit3, Check, X, Download,
  ChevronRight, Copy, Eye, Printer, Calendar, User, Building2,
  Package, Clock, Briefcase, Hash, AlertCircle, Search,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import useStore from '../../store/useStore'

// ── Dados iniciais da tabela ────────────────────────────────────────────────
const DEFAULT_PRODUCTS = [
  { id: '1',  name: 'Aula',                         presence: '',   hours: 13, price1: 4500,  price2: 3500,  price3: 2500,  tier: 'projeto' },
  { id: '2',  name: 'Collab conteudo (artigo)',      presence: '',   hours: 2,  price1: 3000,  price2: 2500,  price3: 1500,  tier: 'hora' },
  { id: '3',  name: 'Facilitacao',                   presence: '',   hours: 2,  price1: 10000, price2: 4000,  price3: 2000,  tier: 'projeto' },
  { id: '4',  name: 'Story',                         presence: '',   hours: 1,  price1: 1000,  price2: 1000,  price3: 500,   tier: 'hora' },
  { id: '5',  name: 'Reels',                         presence: '',   hours: 7,  price1: 5000,  price2: 4000,  price3: 2000,  tier: 'hora' },
  { id: '6',  name: 'Feed Instagram',                presence: '',   hours: 2,  price1: 3000,  price2: 2700,  price3: 2000,  tier: 'hora' },
  { id: '7',  name: 'Painel',                        presence: '',   hours: 12, price1: 8000,  price2: 6000,  price3: 1500,  tier: 'projeto' },
  { id: '8',  name: 'Palestra',                      presence: '2',  hours: 16, price1: 10000, price2: 5000,  price3: 2500,  tier: 'projeto' },
  { id: '9',  name: 'Post Linkedin (foto+texto)',    presence: '',   hours: 1,  price1: 6000,  price2: 4000,  price3: 2000,  tier: 'hora' },
  { id: '10', name: 'Post Linkedin Artigo',          presence: '',   hours: 2,  price1: 2500,  price2: 2000,  price3: 1000,  tier: 'hora' },
  { id: '11', name: 'Post Linkedin Video',           presence: '',   hours: 6,  price1: 10000, price2: 7000,  price3: 5000,  tier: 'hora' },
  { id: '12', name: 'Sprint',                        presence: '',   hours: 40, price1: 30000, price2: 20000, price3: 7000,  tier: 'pacote' },
  { id: '13', name: 'Presenca no evento (12h)',      presence: '12', hours: 0,  price1: 22000, price2: 20000, price3: 10000, tier: 'pacote', note: '12 stories + 2 reels' },
  { id: '14', name: 'Presenca no evento (6h)',       presence: '6',  hours: 0,  price1: 6000,  price2: 6000,  price3: 3000,  tier: 'pacote', note: '6 stories' },
  { id: '15', name: 'Presenca no evento (3h)',       presence: '3',  hours: 0,  price1: 14000, price2: 13000, price3: 6500,  tier: 'pacote', note: '1 reels + 9 stories' },
]

const TIER_LABELS = { projeto: 'Por Projeto', hora: 'Por Hora', pacote: 'Pacote' }
const TIER_COLORS = {
  projeto:  'bg-blue-100 text-blue-700',
  hora:     'bg-emerald-100 text-emerald-700',
  pacote:   'bg-purple-100 text-purple-700',
}
const PRICE_LABELS = { 1: 'Tabela Cheia', 2: 'Desconto Medio', 3: 'Parceiro / Agressivo' }

const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtShort = (v) => `R$ ${v.toLocaleString('pt-BR')}`

let nextId = 100

export default function PricingManager() {
  const storedProducts = useStore((s) => s.pricingProducts)
  const setPricingProducts = useStore((s) => s.setPricingProducts)
  const proposals = useStore((s) => s.proposals)
  const addProposal = useStore((s) => s.addProposal)
  const deleteProposal = useStore((s) => s.deleteProposal)

  const [products, setProducts] = useState(() =>
    storedProducts?.length > 0 ? storedProducts : DEFAULT_PRODUCTS
  )
  const [tab, setTab] = useState('tabela') // tabela | proposta | historico
  const [editingId, setEditingId] = useState(null)
  const [editRow, setEditRow] = useState({})
  const [search, setSearch] = useState('')

  // Proposal state
  const [clientName, setClientName] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [validity, setValidity] = useState(15)
  const [selectedItems, setSelectedItems] = useState([]) // { productId, qty, priceTier }
  const [showPreview, setShowPreview] = useState(false)
  const [notes, setNotes] = useState('')

  // Persist products to store
  useEffect(() => {
    setPricingProducts(products)
  }, [products])

  // ── Product CRUD ────────────────────────────────────────────────────────────
  const startEdit = (p) => {
    setEditingId(p.id)
    setEditRow({ ...p })
  }
  const saveEdit = () => {
    setProducts(prev => prev.map(p => p.id === editingId ? { ...editRow } : p))
    setEditingId(null)
  }
  const cancelEdit = () => setEditingId(null)
  const deleteProduct = (id) => setProducts(prev => prev.filter(p => p.id !== id))
  const addProduct = () => {
    const newP = { id: String(++nextId), name: 'Novo servico', presence: '', hours: 1, price1: 0, price2: 0, price3: 0, tier: 'projeto' }
    setProducts(prev => [...prev, newP])
    startEdit(newP)
  }

  // ── Proposal helpers ────────────────────────────────────────────────────────
  const addItem = (productId) => {
    if (selectedItems.find(i => i.productId === productId)) return
    setSelectedItems(prev => [...prev, { productId, qty: 1, priceTier: 1 }])
  }
  const removeItem = (productId) => setSelectedItems(prev => prev.filter(i => i.productId !== productId))
  const updateItem = (productId, field, value) => {
    setSelectedItems(prev => prev.map(i => i.productId === productId ? { ...i, [field]: value } : i))
  }

  const getItemTotal = (item) => {
    const product = products.find(p => p.id === item.productId)
    if (!product) return 0
    const price = item.priceTier === 1 ? product.price1 : item.priceTier === 2 ? product.price2 : product.price3
    return price * item.qty
  }

  const proposalTotal = selectedItems.reduce((s, i) => s + getItemTotal(i), 0)

  const saveProposal = () => {
    if (!clientName.trim()) return
    addProposal({
      clientName, clientCompany, validity, notes,
      items: selectedItems.map(i => {
        const product = products.find(p => p.id === i.productId)
        return { ...i, productName: product?.name || '?', unitPrice: getItemTotal(i) / i.qty, total: getItemTotal(i) }
      }),
      total: proposalTotal,
    })
    setSelectedItems([])
    setClientName('')
    setClientCompany('')
    setNotes('')
    setTab('historico')
  }

  // ── PDF generation ──────────────────────────────────────────────────────────
  const generatePDF = (proposal) => {
    const doc = new jsPDF()
    const items = proposal.items || []
    const pageW = doc.internal.pageSize.getWidth()
    let y = 20

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('PROPOSTA COMERCIAL', pageW / 2, y, { align: 'center' })
    y += 12

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Data: ${new Date(proposal.created_at).toLocaleDateString('pt-BR')}`, 20, y)
    doc.text(`Validade: ${proposal.validity} dias`, pageW - 20, y, { align: 'right' })
    y += 10

    // Client info
    doc.setDrawColor(230)
    doc.setFillColor(248, 248, 248)
    doc.roundedRect(15, y - 4, pageW - 30, proposal.clientCompany ? 22 : 14, 3, 3, 'F')
    doc.setTextColor(50)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Cliente: ${proposal.clientName}`, 20, y + 4)
    if (proposal.clientCompany) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Empresa: ${proposal.clientCompany}`, 20, y + 13)
    }
    y += proposal.clientCompany ? 30 : 20

    // Table header
    doc.setFillColor(30, 30, 30)
    doc.rect(15, y, pageW - 30, 10, 'F')
    doc.setTextColor(255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Servico', 20, y + 7)
    doc.text('Qtd', 110, y + 7, { align: 'center' })
    doc.text('Valor Unit.', 140, y + 7, { align: 'right' })
    doc.text('Total', pageW - 20, y + 7, { align: 'right' })
    y += 14

    // Table rows
    doc.setTextColor(50)
    doc.setFont('helvetica', 'normal')
    items.forEach((item, i) => {
      if (y > 260) { doc.addPage(); y = 20 }
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248)
        doc.rect(15, y - 4, pageW - 30, 10, 'F')
      }
      doc.setFontSize(9)
      doc.text(item.productName, 20, y + 2)
      doc.text(String(item.qty), 110, y + 2, { align: 'center' })
      doc.text(fmtShort(item.unitPrice), 140, y + 2, { align: 'right' })
      doc.setFont('helvetica', 'bold')
      doc.text(fmtShort(item.total), pageW - 20, y + 2, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      y += 10
    })

    // Total
    y += 4
    doc.setDrawColor(230)
    doc.line(15, y, pageW - 15, y)
    y += 8
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30)
    doc.text('TOTAL:', 20, y)
    doc.text(fmt(proposal.total), pageW - 20, y, { align: 'right' })
    y += 12

    // Notes
    if (proposal.notes) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text('Observacoes:', 20, y)
      y += 6
      const lines = doc.splitTextToSize(proposal.notes, pageW - 40)
      doc.text(lines, 20, y)
      y += lines.length * 5
    }

    // Footer
    y = doc.internal.pageSize.getHeight() - 20
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('Proposta gerada pelo Content Intelligence OS', pageW / 2, y, { align: 'center' })

    const date = new Date(proposal.created_at).toISOString().slice(0, 10)
    const safeName = (proposal.clientName || 'cliente').toLowerCase().replace(/[^a-z0-9]/g, '-')
    doc.save(`proposta-${safeName}-${date}.pdf`)
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const TABS = [
    { id: 'tabela', label: 'Tabela de Precos', icon: DollarSign },
    { id: 'proposta', label: 'Nova Proposta', icon: FileText },
    { id: 'historico', label: 'Historico', icon: Clock, count: proposals.length },
  ]

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={22} className="text-orange-500" />
            Precificacao & Propostas
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{products.length} servicos cadastrados</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={14} />
            {t.label}
            {t.count > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: Tabela de Precos ═══════════ */}
      {tab === 'tabela' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                className="input text-xs py-2 pl-9 w-full"
                placeholder="Buscar servico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button onClick={addProduct} className="btn-primary text-xs flex items-center gap-1.5">
              <Plus size={14} /> Adicionar Servico
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-2.5 px-3 font-semibold text-gray-500">Servico</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-gray-500 w-16">Presenca</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-gray-500 w-16">Horas</th>
                  <th className="text-right py-2.5 px-2 font-semibold text-gray-500">
                    <div>Preco 1</div>
                    <div className="text-[9px] text-gray-400 font-normal">Tabela cheia</div>
                  </th>
                  <th className="text-right py-2.5 px-2 font-semibold text-gray-500">
                    <div>Preco 2</div>
                    <div className="text-[9px] text-gray-400 font-normal">Desc. medio</div>
                  </th>
                  <th className="text-right py-2.5 px-2 font-semibold text-gray-500">
                    <div>Preco 3</div>
                    <div className="text-[9px] text-gray-400 font-normal">Parceiro</div>
                  </th>
                  <th className="text-center py-2.5 px-2 font-semibold text-gray-500 w-16">R$/h</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-gray-500 w-24">Tipo</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-gray-500 w-20">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => {
                  const isEditing = editingId === p.id
                  const perHour = p.hours > 0 ? Math.round(p.price1 / p.hours) : 0
                  return (
                    <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                      {isEditing ? (
                        <>
                          <td className="py-1.5 px-3">
                            <input className="input text-xs py-1 w-full" value={editRow.name} onChange={(e) => setEditRow({ ...editRow, name: e.target.value })} />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <input className="input text-xs py-1 w-14 text-center" value={editRow.presence} onChange={(e) => setEditRow({ ...editRow, presence: e.target.value })} />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <input type="number" className="input text-xs py-1 w-14 text-center" value={editRow.hours} onChange={(e) => setEditRow({ ...editRow, hours: Number(e.target.value) })} />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" className="input text-xs py-1 w-20 text-right" value={editRow.price1} onChange={(e) => setEditRow({ ...editRow, price1: Number(e.target.value) })} />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" className="input text-xs py-1 w-20 text-right" value={editRow.price2} onChange={(e) => setEditRow({ ...editRow, price2: Number(e.target.value) })} />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" className="input text-xs py-1 w-20 text-right" value={editRow.price3} onChange={(e) => setEditRow({ ...editRow, price3: Number(e.target.value) })} />
                          </td>
                          <td className="py-1.5 px-2 text-center text-gray-400">—</td>
                          <td className="py-1.5 px-2 text-center">
                            <select className="input text-xs py-1" value={editRow.tier} onChange={(e) => setEditRow({ ...editRow, tier: e.target.value })}>
                              <option value="projeto">Projeto</option>
                              <option value="hora">Hora</option>
                              <option value="pacote">Pacote</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={saveEdit} className="p-1 rounded hover:bg-emerald-100 text-emerald-600"><Check size={14} /></button>
                              <button onClick={cancelEdit} className="p-1 rounded hover:bg-red-100 text-red-500"><X size={14} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 font-medium text-gray-800">
                            {p.name}
                            {p.note && <span className="text-[9px] text-gray-400 ml-1.5">({p.note})</span>}
                          </td>
                          <td className="py-2 px-2 text-center text-gray-500">{p.presence || '—'}</td>
                          <td className="py-2 px-2 text-center text-gray-500">{p.hours || '—'}</td>
                          <td className="py-2 px-2 text-right font-semibold text-gray-800">{fmtShort(p.price1)}</td>
                          <td className="py-2 px-2 text-right text-gray-600">{fmtShort(p.price2)}</td>
                          <td className="py-2 px-2 text-right text-gray-500">{fmtShort(p.price3)}</td>
                          <td className="py-2 px-2 text-center text-gray-400">{perHour > 0 ? fmtShort(perHour) : '—'}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[p.tier]}`}>
                              {TIER_LABELS[p.tier]}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => startEdit(p)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Edit3 size={13} /></button>
                              <button onClick={() => deleteProduct(p.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex gap-3 flex-wrap">
            <div className="card p-3 flex-1 min-w-[140px] text-center">
              <p className="text-[10px] text-gray-400 font-medium">Range Preco 1</p>
              <p className="text-sm font-bold text-gray-800">{fmtShort(Math.min(...products.map(p => p.price1)))} — {fmtShort(Math.max(...products.map(p => p.price1)))}</p>
            </div>
            <div className="card p-3 flex-1 min-w-[140px] text-center">
              <p className="text-[10px] text-gray-400 font-medium">Media Preco 1</p>
              <p className="text-sm font-bold text-gray-800">{fmtShort(Math.round(products.reduce((s, p) => s + p.price1, 0) / products.length))}</p>
            </div>
            <div className="card p-3 flex-1 min-w-[140px] text-center">
              <p className="text-[10px] text-gray-400 font-medium">Servicos</p>
              <p className="text-sm font-bold text-gray-800">{products.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: Nova Proposta ═══════════ */}
      {tab === 'proposta' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Config */}
          <div className="space-y-4">
            {/* Client info */}
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><User size={14} className="text-orange-500" /> Dados do Cliente</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Nome do cliente *</label>
                  <input className="input text-xs py-2 w-full" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Karen Santos" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Empresa</label>
                  <input className="input text-xs py-2 w-full" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="FIAP" />
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Validade (dias)</label>
                  <input type="number" className="input text-xs py-2 w-20" value={validity} onChange={(e) => setValidity(Number(e.target.value))} />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Observacoes</label>
                  <input className="input text-xs py-2 w-full" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condicoes especiais, escopo extra..." />
                </div>
              </div>
            </div>

            {/* Product selector */}
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Package size={14} className="text-orange-500" /> Selecionar Servicos</h3>
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {products.map(p => {
                  const isSelected = selectedItems.some(i => i.productId === p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => isSelected ? removeItem(p.id) : addItem(p.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all ${
                        isSelected ? 'bg-orange-50 border border-orange-200 text-orange-800' : 'hover:bg-gray-50 border border-transparent text-gray-600'
                      }`}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-gray-400">
                        {isSelected ? <Check size={14} className="text-orange-500" /> : fmtShort(p.price1)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected items config */}
            {selectedItems.length > 0 && (
              <div className="card p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Itens da Proposta ({selectedItems.length})</h3>
                {selectedItems.map(item => {
                  const product = products.find(p => p.id === item.productId)
                  if (!product) return null
                  return (
                    <div key={item.productId} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{product.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          <label className="text-[9px] text-gray-400">Qtd</label>
                          <input
                            type="number"
                            min={1}
                            className="input text-xs py-1 w-12 text-center"
                            value={item.qty}
                            onChange={(e) => updateItem(item.productId, 'qty', Math.max(1, Number(e.target.value)))}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400">Preco</label>
                          <select
                            className="input text-xs py-1 w-24"
                            value={item.priceTier}
                            onChange={(e) => updateItem(item.productId, 'priceTier', Number(e.target.value))}
                          >
                            <option value={1}>Preco 1</option>
                            <option value={2}>Preco 2</option>
                            <option value={3}>Preco 3</option>
                          </select>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <label className="text-[9px] text-gray-400">Total</label>
                          <p className="text-xs font-bold text-gray-800">{fmtShort(getItemTotal(item))}</p>
                        </div>
                        <button onClick={() => removeItem(item.productId)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><X size={14} /></button>
                      </div>
                    </div>
                  )
                })}

                {/* Total + actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">TOTAL DA PROPOSTA</p>
                    <p className="text-lg font-bold text-gray-900">{fmt(proposalTotal)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPreview(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye size={14} /> Preview
                    </button>
                    <button
                      onClick={saveProposal}
                      disabled={!clientName.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-40"
                    >
                      <Check size={14} /> Salvar Proposta
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="card p-5 space-y-4 border-2 border-dashed border-gray-200 min-h-[400px]">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <FileText size={32} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Selecione servicos para montar a proposta</p>
              </div>
            ) : (
              <>
                <div className="text-center pb-3 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">PROPOSTA COMERCIAL</h2>
                  <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString('pt-BR')} | Validade: {validity} dias</p>
                </div>

                {clientName && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs"><span className="font-semibold">Cliente:</span> {clientName}</p>
                    {clientCompany && <p className="text-xs"><span className="font-semibold">Empresa:</span> {clientCompany}</p>}
                  </div>
                )}

                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-semibold text-gray-600">Servico</th>
                      <th className="text-center py-2 font-semibold text-gray-600 w-12">Qtd</th>
                      <th className="text-right py-2 font-semibold text-gray-600">Unit.</th>
                      <th className="text-right py-2 font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map(item => {
                      const product = products.find(p => p.id === item.productId)
                      if (!product) return null
                      const price = item.priceTier === 1 ? product.price1 : item.priceTier === 2 ? product.price2 : product.price3
                      return (
                        <tr key={item.productId} className="border-b border-gray-100">
                          <td className="py-2 font-medium text-gray-800">{product.name}</td>
                          <td className="py-2 text-center text-gray-500">{item.qty}</td>
                          <td className="py-2 text-right text-gray-600">{fmtShort(price)}</td>
                          <td className="py-2 text-right font-bold text-gray-800">{fmtShort(getItemTotal(item))}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className="flex items-center justify-between pt-3 border-t-2 border-gray-900">
                  <p className="text-sm font-bold text-gray-900">TOTAL</p>
                  <p className="text-lg font-bold text-gray-900">{fmt(proposalTotal)}</p>
                </div>

                {notes && (
                  <div className="pt-2">
                    <p className="text-[10px] text-gray-400 font-semibold mb-1">OBSERVACOES</p>
                    <p className="text-xs text-gray-600">{notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ TAB: Historico ═══════════ */}
      {tab === 'historico' && (
        <div className="space-y-3">
          {proposals.length === 0 ? (
            <div className="card p-14 text-center">
              <FileText size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Nenhuma proposta salva ainda</p>
              <button onClick={() => setTab('proposta')} className="btn-primary mx-auto mt-4 text-xs">
                <Plus size={14} /> Criar Primeira Proposta
              </button>
            </div>
          ) : (
            [...proposals].reverse().map(p => (
              <div key={p.id} className="card p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900">{p.clientName}</h4>
                    {p.clientCompany && <span className="text-xs text-gray-400">({p.clientCompany})</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')} | {p.items?.length || 0} itens | Validade: {p.validity} dias
                  </p>
                </div>
                <p className="text-base font-bold text-gray-900">{fmt(p.total)}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => generatePDF(p)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Download size={12} /> PDF
                  </button>
                  <button
                    onClick={() => deleteProposal(p.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
