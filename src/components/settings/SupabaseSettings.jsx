import { useState } from 'react'
import { Database, CheckCircle2, XCircle, Loader2, Eye, EyeOff, ExternalLink, RefreshCw, Key, Youtube, Sun, Moon } from 'lucide-react'
import useStore from '../../store/useStore'
import { resetSupabaseClient, isSupabaseConfigured, getSupabaseUrl, getSupabaseKey } from '../../lib/supabase'
import { dbTestConnection } from '../../lib/db'

const LS_ANTHROPIC  = 'cio-anthropic-key'
const LS_GROQ       = 'cio-groq-key'
const LS_YOUTUBE    = 'cio-youtube-key'
const SUPABASE_URL_KEY = 'supabase-url'
const SUPABASE_KEY_KEY = 'supabase-key'

export default function SupabaseSettings() {
  const dbStatus  = useStore((s) => s.dbStatus)
  const dbError   = useStore((s) => s.dbError)
  const setDbStatus = useStore((s) => s.setDbStatus)
  const loadFromDB  = useStore((s) => s.loadFromDB)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  const [sbUrl, setSbUrl]     = useState(getSupabaseUrl)
  const [sbKey, setSbKey]     = useState(getSupabaseKey)
  const [showSbKey, setShowSbKey] = useState(false)

  const [anthropicKey, setAnthropicKey]   = useState(() => localStorage.getItem(LS_ANTHROPIC) || '')
  const [groqKey, setGroqKey]             = useState(() => localStorage.getItem(LS_GROQ) || '')
  const [youtubeKey, setYoutubeKey]       = useState(() => localStorage.getItem(LS_YOUTUBE) || '')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showGroqKey, setShowGroqKey]           = useState(false)
  const [showYoutubeKey, setShowYoutubeKey]     = useState(false)

  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saved, setSaved]     = useState(false)

  const handleSaveSupabase = () => {
    localStorage.setItem(SUPABASE_URL_KEY, sbUrl.trim())
    localStorage.setItem(SUPABASE_KEY_KEY, sbKey.trim())
    resetSupabaseClient()
    setDbStatus('idle')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await dbTestConnection()
      setDbStatus('connected')
    } catch (e) {
      setDbStatus('error', e.message)
    } finally {
      setTesting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    await loadFromDB()
    setSyncing(false)
  }

  const handleSaveApiKeys = () => {
    localStorage.setItem(LS_ANTHROPIC, anthropicKey.trim())
    localStorage.setItem(LS_GROQ, groqKey.trim())
    if (youtubeKey.trim()) localStorage.setItem(LS_YOUTUBE, youtubeKey.trim())
    else localStorage.removeItem(LS_YOUTUBE)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const configured = isSupabaseConfigured()

  return (
    <div className="p-6 max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-400 mt-0.5">Banco de dados, chaves de API e integrações</p>
      </div>

      {/* ── Aparência ────────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          {theme === 'dark' ? <Moon size={15} className="text-indigo-400" /> : <Sun size={15} className="text-amber-500" />}
          Aparência
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
              theme === 'light'
                ? 'border-orange-400 bg-orange-50 text-orange-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Sun size={16} /> Modo Claro
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
              theme === 'dark'
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Moon size={16} /> Modo Escuro
          </button>
        </div>
      </div>

      {/* ── Supabase ─────────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Database size={15} className="text-emerald-500" /> Banco de Dados (Supabase)
          </h2>
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
            dbStatus === 'connected' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
            dbStatus === 'error'     ? 'bg-red-100 text-red-700 border-red-200' :
            dbStatus === 'loading'   ? 'bg-blue-100 text-blue-700 border-blue-200' :
            configured               ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                       'bg-gray-100 text-gray-500 border-gray-200'
          }`}>
            <Database size={11} />
            {dbStatus === 'connected' ? 'Conectado' :
             dbStatus === 'error'     ? 'Erro' :
             dbStatus === 'loading'   ? 'Sincronizando...' :
             configured               ? 'Configurado' : 'Não configurado'}
          </span>
        </div>

        <p className="text-xs text-gray-500">
          Salva todos os seus dados (ideias, posts, tarefas, clientes...) no PostgreSQL.
          Acessível de qualquer dispositivo, com backup automático a cada alteração.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Project URL</label>
            <input
              type="text"
              value={sbUrl}
              onChange={(e) => setSbUrl(e.target.value)}
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              className="input w-full text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Anon Key</label>
            <div className="relative">
              <input
                type={showSbKey ? 'text' : 'password'}
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                placeholder="sb_publishable_... ou eyJhbGci..."
                className="input w-full pr-10 text-sm font-mono"
              />
              <button onClick={() => setShowSbKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                {showSbKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleSaveSupabase} className="btn-primary text-xs">
            {saved ? <><CheckCircle2 size={12} /> Salvo!</> : 'Salvar credenciais'}
          </button>
          <button onClick={handleTest} disabled={!configured || testing} className="btn-secondary text-xs">
            {testing ? <><Loader2 size={12} className="animate-spin" /> Testando...</> : 'Testar conexão'}
          </button>
          <button onClick={handleSync} disabled={!configured || syncing} className="btn-secondary text-xs">
            {syncing ? <><Loader2 size={12} className="animate-spin" /> Sincronizando...</> : <><RefreshCw size={12} /> Sincronizar dados</>}
          </button>
        </div>

        {dbStatus === 'connected' && (
          <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={12} /> Dados carregados do banco com sucesso</p>
        )}
        {dbStatus === 'error' && (
          <p className="text-xs text-red-500 flex items-center gap-1.5"><XCircle size={12} /> {dbError}</p>
        )}

        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-500 space-y-1">
          <p className="font-semibold">SQL para criar a tabela (rode 1 vez no Supabase SQL Editor):</p>
          <pre className="mt-1 p-2 bg-gray-100 rounded text-[10px] overflow-x-auto">{`create table if not exists user_data (
  key text primary key,
  value jsonb not null default '[]',
  updated_at timestamptz default now()
);
alter table user_data disable row level security;`}</pre>
        </div>

        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline">
          <ExternalLink size={11} /> Abrir Supabase Dashboard
        </a>
      </div>

      {/* ── API Keys ─────────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Key size={15} className="text-violet-500" /> Chaves de API de IA
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Anthropic (Claude)</label>
            <div className="relative">
              <input
                type={showAnthropicKey ? 'text' : 'password'}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="input w-full pr-10 text-sm font-mono"
              />
              <button onClick={() => setShowAnthropicKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                {showAnthropicKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Groq (grátis — transcrição)</label>
            <div className="relative">
              <input
                type={showGroqKey ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="input w-full pr-10 text-sm font-mono"
              />
              <button onClick={() => setShowGroqKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                {showGroqKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1.5">
              <Youtube size={12} className="text-red-500" /> YouTube Data API v3 (criadores reais no Creator Insights)
            </label>
            <div className="relative">
              <input
                type={showYoutubeKey ? 'text' : 'password'}
                value={youtubeKey}
                onChange={(e) => setYoutubeKey(e.target.value)}
                placeholder="AIza..."
                className="input w-full pr-10 text-sm font-mono"
              />
              <button onClick={() => setShowYoutubeKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                {showYoutubeKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Gratuito. Crie em Google Cloud Console → APIs → YouTube Data API v3 → Credentials.</p>
          </div>
        </div>

        <button onClick={handleSaveApiKeys} className="btn-primary text-xs">
          {saved ? <><CheckCircle2 size={12} /> Salvo!</> : 'Salvar chaves de API'}
        </button>

        <div className="flex gap-3 flex-wrap">
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline flex items-center gap-1">
            <ExternalLink size={11} /> Obter chave Anthropic
          </a>
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
            <ExternalLink size={11} /> Obter chave Groq (gratuita)
          </a>
          <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-xs text-red-500 hover:underline flex items-center gap-1">
            <ExternalLink size={11} /> Ativar YouTube Data API
          </a>
        </div>
      </div>
    </div>
  )
}
