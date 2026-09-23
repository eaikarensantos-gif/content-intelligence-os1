import { useState } from 'react'
import { Check, Edit3, Plus, Trash2, X } from 'lucide-react'
import { clientLedgerRows, parseClientValue } from '../../lib/clientValues'

const money = value => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function ClientLedger({ clients, updateClient, filter, setFilter, ledgerRef }) {
  const [work, setWork] = useState({ clientId: '', month: today().slice(0, 7), description: '', amount: '' })
  const [editingWork, setEditingWork] = useState(null)
  const [paymentRow, setPaymentRow] = useState(null)
  const [payment, setPayment] = useState({ date: today(), amount: '' })
  const [error, setError] = useState('')
  const rows = clients.filter(client => !filter || client.id === filter)
    .flatMap(clientLedgerRows)
    .sort((a, b) => b.month.localeCompare(a.month) || a.clientName.localeCompare(b.clientName))
  const receivedByMonth = Object.entries(rows.flatMap(row => row.payments).reduce((totals, receipt) => {
    const month = receipt.date?.slice(0, 7)
    if (month) totals[month] = (totals[month] || 0) + Math.round((parseClientValue(receipt.amount) ?? 0) * 100)
    return totals
  }, {})).sort(([a], [b]) => b.localeCompare(a))

  const saveWork = () => {
    const client = clients.find(item => item.id === work.clientId)
    const amount = parseClientValue(work.amount)
    if (!client || !/^\d{4}-(0[1-9]|1[0-2])$/.test(work.month) || !work.description.trim() || amount === null || amount <= 0) {
      setError('Escolha cliente e mês, descreva o trabalho e informe um valor maior que zero.')
      return
    }
    const entries = Array.isArray(client.work_entries) ? client.work_entries : []
    const current = entries.find(entry => entry.id === editingWork)
    const received = (current?.payments || []).reduce((sum, item) => sum + (parseClientValue(item.amount) ?? 0), 0)
    if (Math.round(amount * 100) < Math.round(received * 100)) {
      setError('O valor do trabalho não pode ser menor que o valor já recebido.')
      return
    }
    const entry = { id: current?.id || crypto.randomUUID(), month: work.month, description: work.description.trim(), amount, payments: current?.payments || [] }
    updateClient(client.id, { work_entries: current ? entries.map(item => item.id === current.id ? entry : item) : [...entries, entry] })
    setWork({ clientId: work.clientId, month: today().slice(0, 7), description: '', amount: '' })
    setEditingWork(null)
    setError('')
  }

  const savePayment = row => {
    const client = clients.find(item => item.id === row.clientId)
    const amount = parseClientValue(payment.amount)
    if (!client || !/^\d{4}-\d{2}-\d{2}$/.test(payment.date) || amount === null || amount <= 0 || Math.round(amount * 100) > Math.round(row.outstanding * 100)) {
      setError('Informe uma data e um valor maior que zero, até o saldo que falta receber.')
      return
    }
    const receipt = { id: crypto.randomUUID(), date: payment.date, amount }
    if (row.id === 'base') updateClient(client.id, { base_payments: [...(client.base_payments || []), receipt], payment_status: '' })
    else updateClient(client.id, { work_entries: client.work_entries.map(entry => entry.id === row.id ? { ...entry, payments: [...(entry.payments || []), receipt] } : entry) })
    setPaymentRow(null)
    setPayment({ date: today(), amount: '' })
    setError('')
  }

  const removePayment = (row, paymentId) => {
    if (!confirm('Remover este recebimento?')) return
    const client = clients.find(item => item.id === row.clientId)
    if (row.id === 'base') updateClient(client.id, { base_payments: client.base_payments.filter(item => item.id !== paymentId) })
    else updateClient(client.id, { work_entries: client.work_entries.map(entry => entry.id === row.id ? { ...entry, payments: entry.payments.filter(item => item.id !== paymentId) } : entry) })
  }

  return <section ref={ledgerRef} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Trabalhos e recebimentos por mês</h3>
        <p className="text-xs text-gray-500">Cada trabalho aumenta o valor total. Registre recebimentos parciais ou marque o saldo como recebido.</p>
      </div>
      <select aria-label="Filtrar cliente" value={filter} onChange={event => setFilter(event.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
        <option value="">Todos os clientes</option>
        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
      </select>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
      <select aria-label="Cliente do trabalho" disabled={!!editingWork} value={work.clientId} onChange={event => setWork({ ...work, clientId: event.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-60">
        <option value="">Cliente</option>
        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
      </select>
      <input aria-label="Mês do trabalho" type="month" value={work.month} onChange={event => setWork({ ...work, month: event.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      <input aria-label="Trabalho realizado" value={work.description} onChange={event => setWork({ ...work, description: event.target.value })} placeholder="O que foi feito" className="lg:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <input aria-label="Valor do trabalho" inputMode="decimal" value={work.amount} onChange={event => setWork({ ...work, amount: event.target.value })} placeholder="Valor (R$)" className="min-w-0 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <button onClick={saveWork} className="shrink-0 bg-blue-500 text-white rounded-lg px-3 text-xs font-semibold flex items-center gap-1"><Plus size={14} /> {editingWork ? 'Salvar' : 'Adicionar'}</button>
        {editingWork && <button aria-label="Cancelar edição" onClick={() => { setEditingWork(null); setWork({ clientId: '', month: today().slice(0, 7), description: '', amount: '' }); setError('') }} className="text-gray-500"><X size={16} /></button>}
      </div>
    </div>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}

    {receivedByMonth.length > 0 && <div className="border border-emerald-100 bg-emerald-50 rounded-lg px-3 py-2">
      <p className="text-xs font-semibold text-emerald-800 mb-1">Recebimentos por mês</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-emerald-900">
        {receivedByMonth.map(([month, cents]) => <span key={month}>{new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}: <strong>{money(cents / 100)}</strong></span>)}
      </div>
    </div>}

    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]"><tr>
          <th className="px-3 py-2">Mês / cliente</th><th className="px-3 py-2">Trabalho</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-right">Recebido</th><th className="px-3 py-2 text-right">Falta receber</th><th className="px-3 py-2">Ações</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => <tr key={`${row.clientId}-${row.id}`} className="align-top">
            <td className="px-3 py-3"><strong className="block text-gray-800">{row.month ? new Date(`${row.month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'Sem mês informado'}</strong><span className="text-gray-500">{row.clientName}</span></td>
            <td className="px-3 py-3 text-gray-700">{row.description}{row.legacyPaid && <span className="block text-[10px] text-emerald-700">Marcado como pago antes deste controle, sem data</span>}
              {row.payments.map(receipt => <div key={receipt.id} className="text-[10px] text-gray-500 flex gap-1 items-center">Recebido em {new Date(`${receipt.date}T12:00:00`).toLocaleDateString('pt-BR')}: {money(parseClientValue(receipt.amount) ?? 0)} <button aria-label={`Remover recebimento de ${row.clientName}`} onClick={() => removePayment(row, receipt.id)} className="text-red-500"><X size={11} /></button></div>)}
            </td>
            <td className="px-3 py-3 text-right">{money(row.amount)}</td><td className="px-3 py-3 text-right text-emerald-700">{money(row.received)}</td><td className="px-3 py-3 text-right font-semibold text-orange-700">{money(row.outstanding)}</td>
            <td className="px-3 py-3"><div className="flex flex-wrap gap-2">
              {row.outstanding > 0 && <button onClick={() => { setPaymentRow(`${row.clientId}-${row.id}`); setPayment({ date: today(), amount: row.outstanding.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }); setError('') }} className="text-blue-700 hover:underline">Registrar recebimento</button>}
              {row.legacyPaid && <button onClick={() => { if (confirm('Reabrir este valor como pendente?')) updateClient(row.clientId, { payment_status: '' }) }} className="text-gray-500 hover:underline">Reabrir</button>}
              {row.id !== 'base' && <><button aria-label={`Editar trabalho ${row.description}`} onClick={() => { setEditingWork(row.id); setWork({ clientId: row.clientId, month: row.month, description: row.description, amount: row.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }); setError(''); ledgerRef.current?.scrollIntoView({ behavior: 'smooth' }) }} className="text-gray-500"><Edit3 size={13} /></button>
              <button aria-label={`Excluir trabalho ${row.description}`} onClick={() => { if (!confirm('Excluir este trabalho e seus recebimentos?')) return; const client = clients.find(item => item.id === row.clientId); updateClient(client.id, { work_entries: client.work_entries.filter(entry => entry.id !== row.id) }) }} className="text-red-500"><Trash2 size={13} /></button></>}
            </div>
              {paymentRow === `${row.clientId}-${row.id}` && <div className="flex gap-1 mt-2">
                <input aria-label="Data do recebimento" type="date" value={payment.date} onChange={event => setPayment({ ...payment, date: event.target.value })} className="w-32 border rounded px-1" />
                <input aria-label="Valor recebido" inputMode="decimal" value={payment.amount} onChange={event => setPayment({ ...payment, amount: event.target.value })} className="w-24 border rounded px-1" />
                <button aria-label="Salvar recebimento" onClick={() => savePayment(row)} className="text-emerald-700"><Check size={15} /></button>
                <button aria-label="Cancelar recebimento" onClick={() => setPaymentRow(null)} className="text-gray-500"><X size={15} /></button>
              </div>}
            </td>
          </tr>)}
          {rows.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">Nenhum trabalho ou valor cadastrado para este filtro.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>
}
