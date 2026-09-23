// Accept existing numeric data and Brazilian currency input without treating
// an absent value as a zero-value contract.
export function parseClientValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null
  let text = String(value ?? '').trim().replace(/^R\$\s*/, '').trim()
  if (!text) return null
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) {
    text = text.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+(,\d{1,2})$/.test(text)) {
    text = text.replace(',', '.')
  } else if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

export function summarizeClients(clients) {
  let cents = 0
  let receivedCents = 0
  let missing = 0
  for (const client of clients) {
    const value = parseClientValue(client.value)
    const entries = Array.isArray(client.work_entries) ? client.work_entries : []
    if (value === null && entries.length === 0) missing += 1
    if (value !== null) cents += Math.round(value * 100)
    const basePayments = Array.isArray(client.base_payments) ? client.base_payments : null
    if (basePayments) receivedCents += sumPayments(basePayments)
    else if (client.payment_status === 'pago' && value !== null) receivedCents += Math.round(value * 100)
    for (const entry of entries) {
      cents += Math.round((parseClientValue(entry.amount) ?? 0) * 100)
      receivedCents += sumPayments(entry.payments)
    }
  }
  return { total: cents / 100, received: receivedCents / 100, outstanding: Math.max(0, cents - receivedCents) / 100, missing }
}

export function sumPayments(payments) {
  return (Array.isArray(payments) ? payments : []).reduce((cents, payment) =>
    cents + Math.round((parseClientValue(payment.amount) ?? 0) * 100), 0)
}

export function clientLedgerRows(client) {
  const rows = []
  const base = parseClientValue(client.value)
  if (base !== null) {
    const payments = Array.isArray(client.base_payments) ? client.base_payments : []
    const received = client.base_payments === undefined && client.payment_status === 'pago'
      ? base : sumPayments(payments) / 100
    rows.push({ id: 'base', clientId: client.id, clientName: client.name, month: '', description: 'Valor cadastrado anteriormente', amount: base, received, outstanding: Math.max(0, Math.round((base - received) * 100)) / 100, payments, legacyPaid: client.base_payments === undefined && client.payment_status === 'pago' })
  }
  for (const entry of Array.isArray(client.work_entries) ? client.work_entries : []) {
    const amount = parseClientValue(entry.amount) ?? 0
    const payments = Array.isArray(entry.payments) ? entry.payments : []
    const received = sumPayments(payments) / 100
    rows.push({ id: entry.id, clientId: client.id, clientName: client.name, month: entry.month || '', description: entry.description || '', amount, received, outstanding: Math.max(0, Math.round((amount - received) * 100)) / 100, payments, legacyPaid: false })
  }
  return rows
}
