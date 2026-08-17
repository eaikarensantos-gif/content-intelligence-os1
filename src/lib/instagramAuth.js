// Conexão oficial com a Instagram Graph API (Meta) via Facebook Login for
// Business. Não existe OAuth direto "só Instagram" para contas Business — o
// fluxo passa pelo login do Facebook e descobre a conta do Instagram a partir
// das Páginas que a pessoa administra.

const LS_APP_ID     = 'cio-ig-app-id'
const LS_APP_SECRET = 'cio-ig-app-secret'
const LS_CONNECTION = 'cio-ig-connection'
const SS_STATE       = 'cio-ig-oauth-state'

const META_GRAPH_VERSION = 'v21.0'
const SCOPES = 'instagram_basic,pages_show_list,pages_read_engagement'

export function getAppId()     { return localStorage.getItem(LS_APP_ID) || '' }
export function getAppSecret() { return localStorage.getItem(LS_APP_SECRET) || '' }

export function saveCredentials(appId, appSecret) {
  if (appId?.trim())     localStorage.setItem(LS_APP_ID, appId.trim());     else localStorage.removeItem(LS_APP_ID)
  if (appSecret?.trim()) localStorage.setItem(LS_APP_SECRET, appSecret.trim()); else localStorage.removeItem(LS_APP_SECRET)
}

export function getRedirectUri() {
  return `${window.location.origin}/instagram-callback`
}

export function getConnection() {
  try { return JSON.parse(localStorage.getItem(LS_CONNECTION) || 'null') } catch { return null }
}

export function saveConnection({ accessToken, expiresIn, accounts }) {
  const record = {
    accessToken,
    accounts,
    connectedAt: Date.now(),
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
  }
  localStorage.setItem(LS_CONNECTION, JSON.stringify(record))
  return record
}

export function clearConnection() {
  localStorage.removeItem(LS_CONNECTION)
}

export function isExpiringSoon(connection, days = 7) {
  if (!connection?.expiresAt) return false
  return connection.expiresAt - Date.now() < days * 24 * 60 * 60 * 1000
}

export function startConnect(appId) {
  const state = crypto.randomUUID()
  sessionStorage.setItem(SS_STATE, state)
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getRedirectUri(),
    state,
    scope: SCOPES,
    response_type: 'code',
  })
  window.location.href = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`
}

// Confere o state recebido no callback contra o que foi salvo antes do
// redirect (proteção CSRF) e o consome (uso único).
export function consumeState(receivedState) {
  const expected = sessionStorage.getItem(SS_STATE)
  sessionStorage.removeItem(SS_STATE)
  return !!expected && expected === receivedState
}
