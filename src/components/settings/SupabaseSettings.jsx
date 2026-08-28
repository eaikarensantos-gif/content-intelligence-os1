import { useState, useEffect } from 'react'
import { Database, CheckCircle2, XCircle, Loader2, Eye, EyeOff, ExternalLink, RefreshCw, Key, Youtube, Sun, Moon, Instagram, Copy, Download, CalendarDays } from 'lucide-react'
import useStore from '../../store/useStore'
import useAIStore from '../../store/useAIStore'
import { resetSupabaseClient, isSupabaseConfigured, getSupabaseUrl, getSupabaseKey } from '../../lib/supabase'
import { dbTestConnection } from '../../lib/db'
import {
  getAppId, getAppSecret, saveCredentials, getRedirectUri,
  getConnection, clearConnection, isExpiringSoon, startConnect,
} from '../../lib/instagramAuth'
import {
  getGoogleClientId, getGoogleClientSecret, saveGoogleCredentials,
  getGoogleCalendarRedirectUri, getGoogleConnection, clearGoogleConnection,
  startGoogleCalendarConnect,
} from '../../lib/googleCalendarAuth'

const LS_OPENAI          = 'cio-openai-key'
const LS_GROQ            = 'cio-groq-key'
const LS_YOUTUBE         = 'cio-youtube-key'
const LS_VIMEO           = 'cio-vimeo-token'
const LS_RAPIDAPI        = 'cio-rapidapi-key'
const LS_RAPIDAPI_HOST   = 'cio-rapidapi-tiktok-host'
const LS_APIFY           = 'cio-apify-token'
const LS_APIFY_ACTOR     = 'cio-apify-instagram-actor'
const SUPABASE_URL_KEY   = 'supabase-url'
const SUPABASE_KEY_KEY   = 'supabase-key'

// Mesmas chaves persistidas pelo partialize() do useStore — o backup precisa
// cobrir tudo que o usuário pode perder num reset de navegador/dispositivo.
const BACKUP_KEYS = [
  'clips', 'ideas', 'posts', 'metrics', 'insights', 'generatedIdeas',
  'trendResults', 'clients', 'videoAnalyses', 'thoughtCaptures',
  'commentContexts', 'tasks', 'ads', 'leads', 'archetypes',
  'hybridArchetypes', 'favorites', 'viralReferences', 'pricingProducts',
  'proposals', 'hiddenReportTags', 'posicionamento', 'creatorProfile',
  'desafioHistory', 'brainItems', 'pinnedPages', 'audienceProfiles',
  'audienceWeights', 'audienceCuts', 'brandVoice',
]

export default function SupabaseSettings() {
  const dbStatus    = useStore((s) => s.dbStatus)
  const dbError     = useStore((s) => s.dbError)
  const setDbStatus = useStore((s) => s.setDbStatus)
  const loadFromDB  = useStore((s) => s.loadFromDB)
  const theme       = useStore((s) => s.theme)
  const setTheme    = useStore((s) => s.setTheme)

  const [sbUrl, setSbUrl]   = useState(getSupabaseUrl)
  const [sbKey, setSbKey]   = useState(getSupabaseKey)
  const [showSbKey, setShowSbKey] = useState(false)

  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem(LS_OPENAI) || '')
  const [groqKey,      setGroqKey]      = useState(() => localStorage.getItem(LS_GROQ)       || '')
  const [youtubeKey,   setYoutubeKey]   = useState(() => localStorage.getItem(LS_YOUTUBE)    || '')
  const [vimeoToken,   setVimeoToken]   = useState(() => localStorage.getItem(LS_VIMEO)      || '')
  const [rapidApiKey,  setRapidApiKey]  = useState(() => localStorage.getItem(LS_RAPIDAPI)   || '')
  const [rapidHost,    setRapidHost]    = useState(() => localStorage.getItem(LS_RAPIDAPI_HOST) || '')
  const [apifyToken,   setApifyToken]   = useState(() => localStorage.getItem(LS_APIFY)      || '')
  const [apifyActor,   setApifyActor]   = useState(() => localStorage.getItem(LS_APIFY_ACTOR) || '')

  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showGroqKey,      setShowGroqKey]      = useState(false)
  const [showYoutubeKey,   setShowYoutubeKey]   = useState(false)
  const [showVimeoToken,   setShowVimeoToken]   = useState(false)
  const [showRapidKey,     setShowRapidKey]     = useState(false)
  const [showApifyToken,   setShowApifyToken]   = useState(false)

  const [testing,  setTesting]  = useState(false)
  const [syncing,  setSyncing]  = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [backupDownloaded, setBackupDownloaded] = useState(false)

  const [igAppId,     setIgAppId]     = useState(() => getAppId())
  const [igAppSecret, setIgAppSecret] = useState(() => getAppSecret())
  const [showIgSecret, setShowIgSecret] = useState(false)
  const [igConnection, setIgConnection] = useState(() => getConnection())
  const [igSaved,        setIgSaved]        = useState(false)
  const [igJustConnected, setIgJustConnected] = useState(false)
  const [copiedUri,      setCopiedUri]      = useState(false)
  const [googleClientId, setGoogleClientId] = useState(() => getGoogleClientId())
  const [googleClientSecret, setGoogleClientSecret] = useState(() => getGoogleClientSecret())
  const [showGoogleSecret, setShowGoogleSecret] = useState(false)
  const [googleConnection, setGoogleConnection] = useState(() => getGoogleConnection())
  const [googleSaved, setGoogleSaved] = useState(false)
  const [copiedGoogleUri, setCopiedGoogleUri] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('instagram') === 'connected') {
      setIgConnection(getConnection())
      setIgJustConnected(true)
      window.history.replaceState({}, '', '/settings')
      setTimeout(() => setIgJustConnected(false), 4000)
    }
  }, [])

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
    try { await dbTestConnection(); setDbStatus('connected') }
    catch (e) { setDbStatus('error', e.message) }
    finally   { setTesting(false) }
  }

  const handleSync = async () => {
    setSyncing(true)
    await loadFromDB()
    setSyncing(false)
  }

  const handleExportBackup = () => {
    const state = useStore.getState()
    const data = {}
    BACKUP_KEYS.forEach((key) => { data[key] = state[key] })

    const backup = { exportedAt: new Date().toISOString(), data }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `content-intelligence-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackupDownloaded(true)
    setTimeout(() => setBackupDownloaded(false), 2000)
  }

  const handleSaveApiKeys = () => {
    localStorage.setItem(LS_OPENAI, openaiKey.trim())
    localStorage.setItem(LS_GROQ, groqKey.trim())
    if (youtubeKey.trim()) localStorage.setItem(LS_YOUTUBE, youtubeKey.trim())
    else localStorage.removeItem(LS_YOUTUBE)
    if (vimeoToken.trim()) localStorage.setItem(LS_VIMEO, vimeoToken.trim())
    else localStorage.removeItem(LS_VIMEO)
    if (rapidApiKey.trim()) localStorage.setItem(LS_RAPIDAPI, rapidApiKey.trim())
    else localStorage.removeItem(LS_RAPIDAPI)
    if (rapidHost.trim()) localStorage.setItem(LS_RAPIDAPI_HOST, rapidHost.trim())
    else localStorage.removeItem(LS_RAPIDAPI_HOST)
    if (apifyToken.trim()) localStorage.setItem(LS_APIFY, apifyToken.trim())
    else localStorage.removeItem(LS_APIFY)
    if (apifyActor.trim()) localStorage.setItem(LS_APIFY_ACTOR, apifyActor.trim())
    else localStorage.removeItem(LS_APIFY_ACTOR)

    // Sync to AI store so Video Swipe / Vídeos Virais reagem na hora (sem reload)
    useAIStore.getState().setYoutubeApiKey(youtubeKey.trim())
    useAIStore.getState().setVimeoToken(vimeoToken.trim())
    useAIStore.getState().setRapidApiKey(rapidApiKey.trim())
    useAIStore.getState().setRapidApiHost(rapidHost.trim())
    useAIStore.getState().setApifyToken(apifyToken.trim())
    useAIStore.getState().setApifyActorId(apifyActor.trim())

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveIgCredentials = () => {
    saveCredentials(igAppId, igAppSecret)
    setIgSaved(true)
    setTimeout(() => setIgSaved(false), 2000)
  }

  const handleConnectInstagram = () => {
    saveCredentials(igAppId, igAppSecret)
    startConnect(igAppId.trim())
  }

  const handleDisconnectInstagram = () => {
    clearConnection()
    setIgConnection(null)
  }

  const handleCopyRedirectUri = async () => {
    await navigator.clipboard.writeText(getRedirectUri())
    setCopiedUri(true)
    setTimeout(() => setCopiedUri(false), 1500)
  }

  const handleSaveGoogleCredentials = () => {
    saveGoogleCredentials(googleClientId, googleClientSecret)
    setGoogleSaved(true)
    setTimeout(() => setGoogleSaved(false), 1500)
  }

  const handleConnectGoogle = () => {
    saveGoogleCredentials(googleClientId, googleClientSecret)
    startGoogleCalendarConnect(googleClientId.trim())
  }

  const handleDisconnectGoogle = () => {
    clearGoogleConnection()
    setGoogleConnection(null)
  }

  const handleCopyGoogleUri = async () => {
    await navigator.clipboard.writeText(getGoogleCalendarRedirectUri())
    setCopiedGoogleUri(true)
    setTimeout(() => setCopiedGoogleUri(false), 1500)
  }

  const configured = isSupabaseConfigured()

  return (
    <div className="p-6 max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-400 mt-0.5">Banco de dados, chaves de API e integrações</p>
      </div>

      {/* ── Aparência ──────────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          {theme === 'dark' ? <Moon size={15} className="text-indigo-400" /> : <Sun size={15} className="text-amber-500" />}
          Aparência
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
              theme === 'light' ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Sun size={16} /> Modo Claro
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
              theme === 'dark' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <Moon size={16} /> Modo Escuro
          </button>
        </div>
      </div>

      {/* ── Supabase ───────────────────────────────────────────────────────────── */}
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
        <p className="text-xs text-gray-500">Salva todos os seus dados no PostgreSQL. Acessível de qualquer dispositivo.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Project URL</label>
            <input type="text" value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} placeholder="https://xxxxxxxxxxxx.supabase.co" className="input w-full text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Anon Key</label>
            <div className="relative">
              <input type={showSbKey ? 'text' : 'password'} value={sbKey} onChange={(e) => setSbKey(e.target.value)} placeholder="eyJhbGci..." className="input w-full pr-10 text-sm font-mono" />
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
        {dbStatus === 'connected' && <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={12} /> Dados carregados do banco com sucesso</p>}
        {dbStatus === 'error'     && <p className="text-xs text-red-500 flex items-center gap-1.5"><XCircle size={12} /> {dbError}</p>}
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-500 space-y-1">
          <p className="font-semibold">SQL para criar a tabela (rode 1 vez no Supabase SQL Editor):</p>
          <pre className="mt-1 p-2 bg-gray-100 rounded text-[10px] overflow-x-auto">{`create table if not exists user_data (
  key text primary key,
  value jsonb not null default '[]',
  updated_at timestamptz default now()
);
alter table user_data disable row level security;`}</pre>
        </div>
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline">
          <ExternalLink size={11} /> Abrir Supabase Dashboard
        </a>
      </div>

      {/* ── Backup ─────────────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Download size={15} className="text-blue-500" /> Backup
        </h2>
        <p className="text-xs text-gray-500">Baixa um arquivo .json com todo o conteúdo (ideias, posts, métricas, tarefas e demais dados) para guardar como backup.</p>
        <button onClick={handleExportBackup} className="btn-primary text-xs">
          {backupDownloaded ? <><CheckCircle2 size={12} /> Baixado!</> : <><Download size={12} /> Baixar backup completo</>}
        </button>
      </div>

      {/* ── API Keys ───────────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Key size={15} className="text-violet-500" /> Chaves de API
        </h2>
        <div className="space-y-3">
          {[
            { label: 'OpenAI', placeholder: 'sk-...', value: openaiKey, set: setOpenaiKey, show: showOpenaiKey, setShow: setShowOpenaiKey },
            { label: 'Groq (gratuito — transcrição)', placeholder: 'gsk_...', value: groqKey, set: setGroqKey, show: showGroqKey, setShow: setShowGroqKey },
          ].map(({ label, placeholder, value, set, show, setShow }) => (
            <div key={label}>
              <label className="text-xs text-gray-500 font-medium mb-1.5 block">{label}</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className="input w-full pr-10 text-sm font-mono" />
                <button onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1.5">
              <Youtube size={12} className="text-red-500" /> YouTube Data API v3 — Video Swipe + Creator Insights
            </label>
            <div className="relative">
              <input type={showYoutubeKey ? 'text' : 'password'} value={youtubeKey} onChange={(e) => setYoutubeKey(e.target.value)} placeholder="AIza..." className="input w-full pr-10 text-sm font-mono" />
              <button onClick={() => setShowYoutubeKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                {showYoutubeKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Gratuito. Google Cloud Console → APIs → YouTube Data API v3 → Credentials.</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1.5">
              <Key size={12} className="text-sky-500" /> Vimeo access token (opcional — Video Swipe)
            </label>
            <div className="relative">
              <input type={showVimeoToken ? 'text' : 'password'} value={vimeoToken} onChange={(e) => setVimeoToken(e.target.value)} placeholder="Token pessoal do Vimeo" className="input w-full pr-10 text-sm font-mono" />
              <button onClick={() => setShowVimeoToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                {showVimeoToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">developer.vimeo.com → My Apps → Generate Access Token (scope public).</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1.5">
              <Key size={12} className="text-pink-500" /> RapidAPI key (opcional — TikTok no Video Swipe)
            </label>
            <div className="relative">
              <input type={showRapidKey ? 'text' : 'password'} value={rapidApiKey} onChange={(e) => setRapidApiKey(e.target.value)} placeholder="Chave RapidAPI" className="input w-full pr-10 text-sm font-mono" />
              <button onClick={() => setShowRapidKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                {showRapidKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <input type="text" value={rapidHost} onChange={(e) => setRapidHost(e.target.value)} placeholder="Host RapidAPI (ex.: tiktok-scraper7.p.rapidapi.com)" className="input w-full text-sm font-mono mt-2" />
            <p className="text-[10px] text-gray-400 mt-1">Assine um provedor TikTok no RapidAPI e informe a chave + host.</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1.5">
              <Key size={12} className="text-fuchsia-500" /> Apify API token (opcional — Instagram nos Vídeos Virais)
            </label>
            <div className="relative">
              <input type={showApifyToken ? 'text' : 'password'} value={apifyToken} onChange={(e) => setApifyToken(e.target.value)} placeholder="apify_api_..." className="input w-full pr-10 text-sm font-mono" />
              <button onClick={() => setShowApifyToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
                {showApifyToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <input type="text" value={apifyActor} onChange={(e) => setApifyActor(e.target.value)} placeholder="Ator do Apify (padrão: apify~instagram-scraper)" className="input w-full text-sm font-mono mt-2" />
            <p className="text-[10px] text-gray-400 mt-1">
              Crie uma conta em apify.com e gere um token em Settings → Integrations. Buscar/baixar conteúdo do Instagram por scraper viola os Termos de Serviço da Meta — use por sua conta e risco.
            </p>
          </div>

          <p className="text-[10px] text-gray-400 bg-gray-50 rounded-lg p-2 border border-gray-100">
            💡 Dailymotion é buscado automaticamente no Video Swipe sem necessidade de chave.
          </p>
        </div>

        <button onClick={handleSaveApiKeys} className="btn-primary text-xs">
          {saved ? <><CheckCircle2 size={12} /> Salvo!</> : 'Salvar chaves de API'}
        </button>

        <div className="flex gap-3 flex-wrap">
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline flex items-center gap-1"><ExternalLink size={11} /> OpenAI Platform</a>
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline flex items-center gap-1"><ExternalLink size={11} /> Groq (gratuito)</a>
          <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-xs text-red-500 hover:underline flex items-center gap-1"><ExternalLink size={11} /> YouTube API</a>
          <a href="https://developer.vimeo.com/apps" target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline flex items-center gap-1"><ExternalLink size={11} /> Vimeo Dev</a>
          <a href="https://console.apify.com/settings/integrations" target="_blank" rel="noopener noreferrer" className="text-xs text-fuchsia-600 hover:underline flex items-center gap-1"><ExternalLink size={11} /> Apify Console</a>
        </div>
      </div>

      {/* ── Google Calendar ───────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><CalendarDays size={15} className="text-blue-500" /> Google Calendar</h2>
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${googleConnection ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {googleConnection ? <><CheckCircle2 size={11} /> Conectado</> : 'Não conectado'}
          </span>
        </div>
        <p className="text-xs text-gray-500">Mostra os eventos da sua agenda dentro da visão de calendário em Tarefas. O acesso é somente leitura: o app não cria, altera ou apaga compromissos.</p>
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">URI de redirecionamento autorizada</label>
          <div className="flex gap-2">
            <input readOnly value={getGoogleCalendarRedirectUri()} onFocus={(e) => e.target.select()} className="input w-full text-sm font-mono bg-gray-50" />
            <button onClick={handleCopyGoogleUri} className="btn-secondary text-xs px-3 shrink-0">{copiedGoogleUri ? <CheckCircle2 size={14} /> : <Copy size={14} />}</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">ID do cliente OAuth do Google</label>
          <input value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)} placeholder="...apps.googleusercontent.com" className="input w-full text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">Chave secreta do cliente</label>
          <div className="relative">
            <input type={showGoogleSecret ? 'text' : 'password'} value={googleClientSecret} onChange={(e) => setGoogleClientSecret(e.target.value)} placeholder="GOCSPX-..." className="input w-full pr-10 text-sm font-mono" />
            <button onClick={() => setShowGoogleSecret((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">{showGoogleSecret ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleSaveGoogleCredentials} className="btn-secondary text-xs">{googleSaved ? <><CheckCircle2 size={12} /> Salvo!</> : 'Salvar credenciais'}</button>
          {!googleConnection ? (
            <button onClick={handleConnectGoogle} disabled={!googleClientId.trim() || !googleClientSecret.trim()} className="btn-primary text-xs">Conectar Google Calendar</button>
          ) : (
            <button onClick={handleDisconnectGoogle} className="btn-secondary text-xs text-red-600">Desconectar</button>
          )}
        </div>
        <div className="text-[10px] text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-2.5 space-y-1">
          <p>Ative a Google Calendar API, crie um cliente OAuth do tipo “Aplicativo da Web” e cole a URI acima em “URIs de redirecionamento autorizados”.</p>
          <p>Enquanto o app estiver em teste, inclua seu e-mail em “Usuários de teste” na tela de consentimento OAuth.</p>
        </div>
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><ExternalLink size={11} /> Abrir credenciais no Google Cloud</a>
      </div>

      {/* ── Instagram (API oficial da Meta) ───────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Instagram size={15} className="text-pink-500" /> Instagram (API oficial)
          </h2>
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
            igConnection ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}>
            {igConnection ? <><CheckCircle2 size={11} /> Conectado</> : 'Não conectado'}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Conexão oficial via Instagram Business Login — sem scraper, sem violar os Termos da Meta. Requer o caso de uso{' '}
          <strong>API do Instagram</strong> configurado no seu App em{' '}
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline">developers.facebook.com</a>{' '}
          (Casos de uso → API do Instagram → Configuração da API com login da empresa no Instagram) e uma conta Instagram Business/Creator.
        </p>

        {igJustConnected && (
          <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={12} /> Instagram conectado com sucesso!</p>
        )}

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">
            Redirect URI (cole em API do Instagram → Configuração da API com login da empresa → URI de redirecionamento OAuth)
          </label>
          <div className="flex gap-2">
            <input type="text" readOnly value={getRedirectUri()} onFocus={(e) => e.target.select()} className="input w-full text-sm font-mono bg-gray-50" />
            <button onClick={handleCopyRedirectUri} type="button" className="btn-secondary text-xs px-3 shrink-0">
              {copiedUri ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">ID do app do Instagram</label>
          <input type="text" value={igAppId} onChange={(e) => setIgAppId(e.target.value)} placeholder="3201261233418178" className="input w-full text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1.5 block">Chave secreta do app do Instagram</label>
          <div className="relative">
            <input type={showIgSecret ? 'text' : 'password'} value={igAppSecret} onChange={(e) => setIgAppSecret(e.target.value)} placeholder="Chave secreta do app do Instagram" className="input w-full pr-10 text-sm font-mono" />
            <button onClick={() => setShowIgSecret((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" type="button">
              {showIgSecret ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleSaveIgCredentials} className="btn-secondary text-xs">
            {igSaved ? <><CheckCircle2 size={12} /> Salvo!</> : 'Salvar credenciais'}
          </button>
          {!igConnection ? (
            <button onClick={handleConnectInstagram} disabled={!igAppId.trim() || !igAppSecret.trim()} className="btn-primary text-xs">
              Conectar Instagram
            </button>
          ) : (
            <button onClick={handleDisconnectInstagram} className="btn-secondary text-xs text-red-600">
              Desconectar
            </button>
          )}
        </div>

        {igConnection && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
            {igConnection.accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-2 text-xs text-gray-700">
                {acc.profilePictureUrl && <img src={acc.profilePictureUrl} alt="" className="w-6 h-6 rounded-full" />}
                <span className="font-medium">@{acc.username || acc.id}</span>
                {acc.accountType && <span className="text-gray-400">({acc.accountType})</span>}
              </div>
            ))}
            {igConnection.expiresAt && (
              <p className={`text-[11px] ${isExpiringSoon(igConnection) ? 'text-amber-600' : 'text-gray-400'}`}>
                Token válido até {new Date(igConnection.expiresAt).toLocaleDateString('pt-BR')}
                {isExpiringSoon(igConnection) && ' — expira em breve, reconecte para renovar.'}
              </p>
            )}
          </div>
        )}

        {!igConnection && (
          <p className="text-[10px] text-gray-400 bg-gray-50 rounded-lg p-2 border border-gray-100">
            💡 Antes de conectar: em "Gerar tokens de acesso" no seu App, adicione sua conta como <strong>Testador do Instagram</strong> (aba Funções) e aceite o convite dentro do app do Instagram (Configurações → Apps e sites → Convites de testador) — sem isso o login trava com "You don't have access".
          </p>
        )}

        <a href="https://developers.facebook.com/docs/instagram-platform" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-pink-600 hover:underline">
          <ExternalLink size={11} /> Documentação da Instagram Platform (Meta)
        </a>
      </div>
    </div>
  )
}
