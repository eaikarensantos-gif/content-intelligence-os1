/**
 * Handle Anthropic API errors with user-friendly Portuguese messages.
 * Call after a fetch to api.anthropic.com when !res.ok.
 */
export async function handleApiError(res) {
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.error?.message || ''
  } catch {
    try { detail = await res.text() } catch { /* ignore */ }
  }

  const status = res.status

  if (status === 401)
    throw new Error('Chave de API inválida. Verifique sua chave Anthropic nas configurações.')

  if (status === 402 || (detail && detail.toLowerCase().includes('credit')))
    throw new Error('Seus créditos da API Anthropic acabaram. Recarregue em console.anthropic.com para continuar usando.')

  if (status === 429)
    throw new Error('Muitas requisições simultâneas. Aguarde alguns segundos e tente novamente.')

  if (status === 529 || status === 503)
    throw new Error('A API da Anthropic está temporariamente sobrecarregada. Tente novamente em alguns minutos.')

  if (status >= 500)
    throw new Error(`Erro no servidor da Anthropic (${status}). Tente novamente em instantes.`)

  throw new Error(detail || `Erro na API: ${status}`)
}
