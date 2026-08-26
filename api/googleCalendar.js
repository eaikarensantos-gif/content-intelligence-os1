const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

async function exchangeToken(params) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error_description || data.error || 'Falha ao conectar com o Google.')
  return data
}

async function validAccessToken({ accessToken, expiresAt, refreshToken, clientId, clientSecret }) {
  if (accessToken && (!expiresAt || Number(expiresAt) > Date.now() + 60_000)) {
    return { accessToken, expiresIn: Math.max(60, Math.floor((Number(expiresAt) - Date.now()) / 1000)) }
  }
  if (!refreshToken || !clientId || !clientSecret) throw new Error('Conexão com o Google expirada. Reconecte o calendário.')
  const refreshed = await exchangeToken({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  return { accessToken: refreshed.access_token, expiresIn: refreshed.expires_in || 3600 }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { action } = req.body || {}
    if (action === 'exchange') {
      const { code, clientId, clientSecret, redirectUri } = req.body
      if (!code || !clientId || !clientSecret || !redirectUri) return res.status(400).json({ error: 'Dados OAuth incompletos.' })
      const tokens = await exchangeToken({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      })
      return res.status(200).json({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresIn: tokens.expires_in || 3600,
      })
    }

    if (action === 'events') {
      const { timeMin, timeMax, ...credentials } = req.body
      const token = await validAccessToken(credentials)
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '2500',
        timeZone: 'America/Sao_Paulo',
      })
      const response = await fetch(`${EVENTS_URL}?${params}`, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error?.message || 'Falha ao buscar a agenda do Google.')
      const events = (data.items || []).filter((event) => event.status !== 'cancelled').map((event) => ({
        id: event.id,
        title: event.summary || 'Compromisso sem título',
        description: event.description || '',
        location: event.location || '',
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        allDay: Boolean(event.start?.date),
        htmlLink: event.htmlLink || '',
        colorId: event.colorId || '',
      }))
      return res.status(200).json({ events, accessToken: token.accessToken, expiresIn: token.expiresIn })
    }

    return res.status(400).json({ error: 'Ação inválida.' })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Falha no Google Calendar.' })
  }
}
