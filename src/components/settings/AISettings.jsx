import { useState } from 'react'
import {
  Settings, Key, Cpu, CheckCircle2, XCircle, Loader2,
  Eye, EyeOff, ExternalLink, Zap, ChevronDown,
} from 'lucide-react'
import useAIStore from '../../store/useAIStore'
import { PROVIDERS, testConnection } from '../../lib/aiService'

const PROVIDER_DOCS = {
  openai: { url: 'https://platform.openai.com/api-keys', label: 'Get OpenAI key' },
  groq: { url: 'https://console.groq.com/keys', label: 'Get Groq key (free)' },
  openrouter: { url: 'https://openrouter.ai/keys', label: 'Get OpenRouter key' },
  gemini: { url: 'https://aistudio.google.com/app/apikey', label: 'Get Gemini key (free)' },
  custom: { url: null, label: null },
}

export default function AISettings() {
  const {
    provider, apiKey, model, customBaseUrl,
    setProvider, setApiKey, setModel, setCustomBaseUrl,
    getSettings, isConfigured,
  } = useAIStore()

  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [testError, setTestError] = useState('')
  const [saved, setSaved] = useState(false)

  const providerDef = PROVIDERS[provider]
  const docs = PROVIDER_DOCS[provider]

  const handleProviderChange = (p) => {
    setProvider(p)
    setTestStatus(null)
  }

  const handleTest = async () => {
    setTestStatus('loading')
    setTestError('')
    try {
      await testConnection(getSettings())
      setTestStatus('ok')
    } catch (e) {
      setTestStatus('error')
      setTestError(e.message)
    }
  }

  const handleSave = () => {
    setSaved(true)
    setTestStatus(null)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-50 via-white to-white border border-violet-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-violet-100 shrink-0">
            <Settings size={20} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">AI Configuration</h2>
            <p className="text-sm text-gray-500">
              Configure your AI provider to enable real intelligence in Trend Radar, Insight Engine, and Idea Loop.
              Your key is saved locally and never sent to our servers.
            </p>
          </div>
        </div>

        {/* Status pill */}
        <div className="mt-4">
          {isConfigured() ? (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
              <CheckCircle2 size={12} /> AI connected — using {PROVIDERS[provider]?.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
              <XCircle size={12} /> No API key — running in simulation mode
            </span>
          )}
        </div>
      </div>

      {/* Provider selector */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Cpu size={15} className="text-gray-400" /> AI Provider
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(PROVIDERS).map(([key, def]) => (
            <button
              key={key}
              onClick={() => handleProviderChange(key)}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                provider === key
                  ? 'border-violet-400 bg-violet-50 text-violet-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-xs font-semibold leading-tight">{def.label}</span>
              {key !== 'custom' && (
                <span className="text-[10px] text-gray-400">{def.defaultModel}</span>
              )}
              {key === 'groq' && (
                <span className="text-[10px] text-emerald-600 font-medium">Free tier</span>
              )}
              {key === 'gemini' && (
                <span className="text-[10px] text-blue-600 font-medium">Free tier</span>
              )}
              {key === 'openrouter' && (
                <span className="text-[10px] text-purple-600 font-medium">100+ models</span>
              )}
            </button>
          ))}
        </div>

        {docs?.url && (
          <a
            href={docs.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 hover:underline"
          >
            <ExternalLink size={12} /> {docs.label}
          </a>
        )}
      </div>

      {/* API Key */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Key size={15} className="text-gray-400" /> API Key
        </h3>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestStatus(null) }}
            placeholder={`Paste your ${providerDef?.label} key here...`}
            className="input w-full pr-10 font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <p className="text-[11px] text-gray-400">
          Your key is stored only in this browser (localStorage). It is never sent to any server other than the AI provider you select.
        </p>
      </div>

      {/* Model selector */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Zap size={15} className="text-gray-400" /> Model
        </h3>

        {provider === 'custom' ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1.5 block">
                Base URL (OpenAI-compatible)
              </label>
              <input
                type="text"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="https://your-proxy.com/v1"
                className="input w-full text-sm"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Must implement the /chat/completions endpoint.
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1.5 block">Model name</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gpt-4o-mini, llama3, mistral"
                className="input w-full text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="relative">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="input w-full appearance-none pr-8 text-sm"
            >
              {(providerDef?.models || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Speed', value: ['groq', 'gemini'].includes(provider) ? '⚡⚡⚡' : '⚡⚡' },
            { label: 'Quality', value: model.includes('gpt-4o') || model.includes('sonnet') || model.includes('pro') ? '★★★' : '★★' },
            { label: 'Cost', value: ['groq', 'gemini'].includes(provider) ? 'Free' : 'Paid' },
          ].map(({ label, value }) => (
            <div key={label} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-sm font-medium text-gray-700">{value}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleTest}
          disabled={!apiKey?.trim() || testStatus === 'loading'}
          className="btn-secondary"
        >
          {testStatus === 'loading' ? (
            <><Loader2 size={14} className="animate-spin" /> Testing...</>
          ) : (
            'Test connection'
          )}
        </button>

        <button onClick={handleSave} className="btn-primary">
          {saved ? <><CheckCircle2 size={14} /> Saved!</> : 'Save settings'}
        </button>

        {/* Test result */}
        {testStatus === 'ok' && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <CheckCircle2 size={15} /> Connected successfully
          </span>
        )}
        {testStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
            <XCircle size={15} /> {testError || 'Connection failed'}
          </span>
        )}
      </div>

      {/* Tip */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
        <p className="text-xs text-amber-700 font-medium mb-1">Recommendation for beginners</p>
        <p className="text-xs text-amber-600">
          Use <strong>Groq</strong> or <strong>Gemini</strong> — both offer free API keys with generous limits.
          Groq's <code className="bg-amber-100 px-1 rounded">llama-3.1-8b-instant</code> is extremely fast and free.
        </p>
      </div>
    </div>
  )
}
