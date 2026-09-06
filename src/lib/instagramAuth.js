// Conexão oficial com a API do Instagram via Instagram Business Login — login
// direto pela conta do Instagram (appId/appSecret são o "ID do app do
// Instagram" e a "Chave secreta do app do Instagram" do caso de uso "API do
// Instagram", não as credenciais do App do Facebook).

import { getSupabase } from './supabase'

const LS_APP_ID     = 'cio-ig-app-id'
const LS_APP_SECRET = 'cio-ig-app-secret'
const LS_CONNECTION = 'cio-ig-connection'
const SS_STATE       = 'cio-ig-oauth-state'

const SCOPES = 'instagram_business_basic,instagram_business_manage_insights,instagram_business_manage_comments,instagram_business_manage_messages'

export function getAppId()     { return localStorage.getItem(LS_APP_ID) || '' }
export function getAppSecret() { return localStorage.getItem(LS_APP_SECRET) || '' }

// Um campo vazio aqui só significa "não mexer nessa credencial agora" —
// nunca apaga uma credencial já salva.
export function saveCredentials(appId, appSecret) {
  if (appId?.trim())     localStorage.setItem(LS_APP_ID, appId.trim())
  if (appSecret?.trim()) localStorage.setItem(LS_APP_SECRET, appSecret.trim())
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
  window.location.href = `https://www.instagram.com/oauth/authorize?${params.toString()}`
}

// Confere o state recebido no callback contra o que foi salvo antes do
// redirect (proteção CSRF) e o consome (uso único).
export function consumeState(receivedState) {
  const expected = sessionStorage.getItem(SS_STATE)
  sessionStorage.removeItem(SS_STATE)
  return !!expected && expected === receivedState
}

// Ponte pro webhook (que roda no servidor, sem acesso ao localStorage do
// navegador): grava o token de acesso e o App Secret na tabela ig_connection
// do Supabase logo após o OAuth. O webhook (api/instagramWebhook.js) lê essa
// mesma linha via SUPABASE_SERVICE_ROLE_KEY.
export async function syncConnectionToServer({ accessToken, expiresIn, account, appSecret }) {
  const db = getSupabase()
  if (!db) throw new Error('Supabase não configurado — configure em Configurações antes de conectar o Instagram.')

  const { error } = await db.from('ig_connection').upsert({
    id: 'default',
    ig_user_id: account?.id || null,
    ig_username: account?.username || null,
    access_token: accessToken,
    app_secret: appSecret,
    expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}
