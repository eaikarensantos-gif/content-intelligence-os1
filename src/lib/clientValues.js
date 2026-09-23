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
  let missing = 0
  for (const client of clients) {
    const value = parseClientValue(client.value)
    if (value === null) missing += 1
    else cents += Math.round(value * 100)
  }
  return { total: cents / 100, missing }
}
