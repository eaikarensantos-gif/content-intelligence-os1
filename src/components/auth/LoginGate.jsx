import { useState, useEffect } from 'react'
import { Shield, Lock, Eye, EyeOff, AlertTriangle, LogOut, Zap, Monitor, Globe, Clock } from 'lucide-react'

const AUTH_KEY = 'cio-auth-session'
const OWNER_KEY = 'cio-owner-credentials'
const ATTEMPTS_KEY = 'cio-access-attempts'
const SESSION_HOURS = 24 * 7 // 7 dias

// ── Coleta dados do visitante ────────────────────────────────────────────────
const getVisitorInfo = () => {
  const nav = navigator
  return {
    userAgent: nav.userAgent,
    language: nav.language,
    platform: nav.platform || nav.userAgentData?.platform || 'unknown',
    screenSize: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    referrer: document.referrer || 'direct',
  }
}

// ── Registra tentativa de acesso ─────────────────────────────────────────────
const logAttempt = (email, success, extra = {}) => {
  const attempts = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '[]')
  attempts.push({
    email,
    success,
    ...getVisitorInfo(),
    ...extra,
  })
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
}

// ── Verifica sessão ─────────────────────────────────────────────────────────
const getSession = () => {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    const now = Date.now()
    if (now - session.loginAt > SESSION_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem(AUTH_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

// ── Hash simples (não criptográfico, mas suficiente para client-side) ────────
const simpleHash = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(36)
}

export default function LoginGate({ children }) {
  const [session, setSession] = useState(() => getSession())
  const [mode, setMode] = useState('login') // sempre começa em login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockout, setLockout] = useState(false)

  // Ao deslogar volta para login
  useEffect(() => {
    if (!session) setMode('login')
  }, [session])

  // Lockout após 5 tentativas erradas em 15 min
  useEffect(() => {
    const attempts = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '[]')
    const recent = attempts.filter(a =>
      !a.success && Date.now() - new Date(a.timestamp).getTime() < 15 * 60 * 1000
    )
    if (recent.length >= 5) {
      setLockout(true)
      const timer = setTimeout(() => setLockout(false), 15 * 60 * 1000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // ── Setup inicial (primeiro acesso) ─────────────────────────────────────
  const handleSetup = (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) return setError('Digite seu email')
    if (!password) return setError('Crie uma senha')
    if (password.length < 6) return setError('Senha deve ter pelo menos 6 caracteres')
    if (password !== confirmPassword) return setError('Senhas não conferem')

    const owner = {
      email: email.trim().toLowerCase(),
      passwordHash: simpleHash(password),
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(OWNER_KEY, JSON.stringify(owner))

    const sessionData = {
      email: owner.email,
      loginAt: Date.now(),
      isOwner: true,
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData))
    logAttempt(owner.email, true, { type: 'setup' })
    setSession(sessionData)
  }

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault()
    setError('')

    if (lockout) return setError('Muitas tentativas. Aguarde 15 minutos.')
    if (!email.trim()) return setError('Digite seu email')
    if (!password) return setError('Digite sua senha')

    setLoading(true)

    // Simula delay para dificultar brute-force
    setTimeout(() => {
      const owner = JSON.parse(localStorage.getItem(OWNER_KEY) || '{}')
      const emailMatch = email.trim().toLowerCase() === owner.email
      const passMatch = simpleHash(password) === owner.passwordHash

      if (emailMatch && passMatch) {
        const sessionData = {
          email: owner.email,
          loginAt: Date.now(),
          isOwner: true,
        }
        localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData))
        logAttempt(email.trim(), true, { type: 'login' })
        setSession(sessionData)
      } else {
        logAttempt(email.trim(), false, {
          type: 'login_failed',
          reason: !emailMatch ? 'wrong_email' : 'wrong_password',
        })
        setError('Email ou senha incorretos')
      }
      setLoading(false)
    }, 800)
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY)
    setSession(null)
    setPassword('')
    setEmail('')
    setConfirmPassword('')
    setError('')
  }

  // Se autenticado, renderiza o app
  if (session) {
    return (
      <div className="relative">
        {/* Botão logout discreto */}
        <button
          onClick={handleLogout}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
          title="Sair"
        >
          <LogOut size={12} />
          Sair
        </button>
        {children}
      </div>
    )
  }

  // ── Tela de Login / Setup ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25px 25px, white 1px, transparent 0)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/30 mx-auto mb-4">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Content Intelligence OS</h1>
          <p className="text-gray-400 text-sm mt-1">
            {mode === 'setup' ? 'Configure seu primeiro acesso' : 'Bem-vindo de volta'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Tabs login / cadastro */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode('setup'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'setup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={mode === 'setup' ? handleSetup : handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                autoFocus
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder={mode === 'setup' ? 'Crie uma senha forte' : 'Sua senha'}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password (setup only) */}
            {mode === 'setup' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirmar Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                  placeholder="Repita a senha"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
                  required
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            {/* Lockout warning */}
            {lockout && (
              <div className="flex items-center gap-2 text-amber-700 text-xs bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
                <Clock size={14} />
                Conta temporariamente bloqueada por tentativas excessivas
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || lockout}
              className={`w-full py-3 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm ${
                mode === 'setup'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-200'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : mode === 'setup' ? 'Criar Acesso' : 'Entrar'}
            </button>
          </form>

          {/* Security notice */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2 text-[11px] text-gray-400">
              <Shield size={12} className="shrink-0 mt-0.5" />
              <p>
                {mode === 'setup'
                  ? 'Suas credenciais ficam armazenadas localmente neste navegador. Todas as tentativas de acesso são registradas.'
                  : 'Tentativas de acesso não autorizadas são registradas com email, IP e dados do dispositivo.'}
              </p>
            </div>
          </div>
        </div>

        {/* Visitor info notice (login mode) */}
        {mode === 'login' && (
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><Monitor size={10} /> Dispositivo registrado</span>
            <span className="flex items-center gap-1"><Globe size={10} /> Localização registrada</span>
            <span className="flex items-center gap-1"><Clock size={10} /> Horário registrado</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Exporta utilitários para visualizar tentativas de acesso
export function getAccessAttempts() {
  return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '[]')
}

export function clearAccessAttempts() {
  localStorage.setItem(ATTEMPTS_KEY, '[]')
}

export function logout() {
  localStorage.removeItem(AUTH_KEY)
  window.location.reload()
}
