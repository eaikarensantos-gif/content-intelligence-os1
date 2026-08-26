const LS_CLIENT_ID = 'cio-google-calendar-client-id'
const LS_CLIENT_SECRET = 'cio-google-calendar-client-secret'
const LS_CONNECTION = 'cio-google-calendar-connection'
const SS_STATE = 'cio-google-calendar-oauth-state'

export const getGoogleClientId = () => localStorage.getItem(LS_CLIENT_ID) || ''
export const getGoogleClientSecret = () => localStorage.getItem(LS_CLIENT_SECRET) || ''
export const getGoogleCalendarRedirectUri = () => `${window.location.origin}/google-calendar-callback`

export function saveGoogleCredentials(clientId, clientSecret) {
  if (clientId?.trim()) localStorage.setItem(LS_CLIENT_ID, clientId.trim()); else localStorage.removeItem(LS_CLIENT_ID)
  if (clientSecret?.trim()) localStorage.setItem(LS_CLIENT_SECRET, clientSecret.trim()); else localStorage.removeItem(LS_CLIENT_SECRET)
}

export function getGoogleConnection() {
  try { return JSON.parse(localStorage.getItem(LS_CONNECTION) || 'null') } catch { return null }
}

export function saveGoogleConnection(connection) {
  const previous = getGoogleConnection()
  const record = {
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken || previous?.refreshToken || null,
    expiresAt: Date.now() + (connection.expiresIn || 3600) * 1000,
    connectedAt: previous?.connectedAt || Date.now(),
  }
  localStorage.setItem(LS_CONNECTION, JSON.stringify(record))
  return record
}

export function clearGoogleConnection() { localStorage.removeItem(LS_CONNECTION) }

export function startGoogleCalendarConnect(clientId) {
  const state = crypto.randomUUID()
  sessionStorage.setItem(SS_STATE, state)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleCalendarRedirectUri(),
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export function consumeGoogleState(received) {
  const expected = sessionStorage.getItem(SS_STATE)
  sessionStorage.removeItem(SS_STATE)
  return Boolean(expected && received && expected === received)
}

export async function fetchGoogleCalendarEvents(timeMin, timeMax) {
  const connection = getGoogleConnection()
  if (!connection) throw new Error('Conecte o Google Calendar nas Configurações.')
  const response = await fetch('/api/googleCalendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'events',
      ...connection,
      clientId: getGoogleClientId(),
      clientSecret: getGoogleClientSecret(),
      timeMin,
      timeMax,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Falha ao buscar a agenda do Google.')
  saveGoogleConnection({ accessToken: data.accessToken, expiresIn: data.expiresIn })
  return data.events || []
}
