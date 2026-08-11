/**
 * Handle Gemini API errors (via /api/ai?action=gemini) with user-friendly Portuguese messages.
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
  const lower = detail.toLowerCase()

  if (status === 400 && (lower.includes('api key') || lower.includes('api_key')))
    throw new Error('Chave de API inválida. Verifique sua chave Gemini nas configurações.')

  if (lower.includes('credit') || lower.includes('prepay') || lower.includes('billing'))
    throw new Error('Seus créditos da API Gemini acabaram. Adicione créditos em aistudio.google.com/projects para continuar usando.')

  if (status === 429)
    throw new Error('Muitas requisições simultâneas. Aguarde alguns segundos e tente novamente.')

  if (status === 404)
    throw new Error('Modelo de IA indisponível no momento. Tente novamente em instantes.')

  if (status === 503)
    throw new Error('A API do Gemini está temporariamente sobrecarregada. Tente novamente em alguns minutos.')

  if (status >= 500)
    throw new Error(`Erro no servidor do Gemini (${status}). Tente novamente em instantes.`)

  throw new Error(detail || `Erro na API: ${status}`)
}
