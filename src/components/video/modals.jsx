import { useState } from 'react'
import { Copy, Check, ExternalLink, Mic, Key, X, ShieldCheck } from 'lucide-react'

export function GroqKeyModal({ onClose, onSave }) {
  const [val, setVal] = useState('')
  const [show, setShow] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic size={16} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-900">Chave Groq — Transcrição Gratuita</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2">
          <p className="text-xs font-semibold text-emerald-800">Como obter sua chave gratuita:</p>
          {[
            { n: '1', text: 'Acesse console.groq.com e crie uma conta gratuita' },
            { n: '2', text: 'Vá em "API Keys" → clique em "Create API Key"' },
            { n: '3', text: 'Copie a chave e cole abaixo' },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
              <p className="text-xs text-gray-600">{text}</p>
            </div>
          ))}
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold hover:underline mt-1">
            <ExternalLink size={11} /> Abrir console.groq.com
          </a>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start gap-2">
          <ShieldCheck size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-500">
            Plano gratuito: 7.200 minutos/dia de transcrição. Chave salva <strong>apenas no seu navegador</strong>.
          </p>
        </div>

        <div>
          <label className="label">Cole sua Groq API Key</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              className="input pr-16"
              placeholder="gsk_..."
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
            <button onClick={() => setShow((x) => !x)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              {show ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={() => { if (val.trim()) { onSave(val.trim()); onClose() } }}
            disabled={!val.trim()}
            className="btn-primary flex-1"
            style={{ background: val.trim() ? 'linear-gradient(135deg, #059669, #047857)' : undefined }}
          >
            <Mic size={13} /> Salvar e Ativar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── API Key Modal ─────────────────────────────────────────────────────────────
export function ApiKeyModal({ onClose, onSave }) {
  const [val, setVal] = useState('')
  const [show, setShow] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-violet-500" />
            <h2 className="text-sm font-bold text-gray-900">API Key do Gemini</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 flex items-start gap-2">
          <ShieldCheck size={14} className="text-violet-500 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600">
            Sua chave fica salva <strong>apenas no seu navegador</strong> (localStorage). Nunca é enviada para outros servidores além da API do Gemini.
          </p>
        </div>
        <div>
          <label className="label">Cole sua API Key</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              className="input pr-16"
              placeholder="sk-ant-api03-..."
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
            <button onClick={() => setShow((x) => !x)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              {show ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Obtenha em{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
              console.anthropic.com
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={() => { if (val.trim()) { onSave(val.trim()); onClose() } }}
            disabled={!val.trim()}
            className="btn-primary flex-1"
            style={{ background: val.trim() ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : undefined }}
          >
            <Key size={13} /> Salvar Chave
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Script Modal ──────────────────────────────────────────────────────────────
export function ScriptModal({ script, onClose }) {
  const [copied, setCopied] = useState(false)
  const fullText = (script.script || []).map((s) =>
    `[${s.section.toUpperCase()}]\n${s.text}${s.notes ? `\n(${s.notes})` : ''}`
  ).join('\n\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const sectionColor = (sec) => {
    if (sec === 'Hook') return 'border-orange-200 bg-orange-50/50'
    if (sec === 'CTA') return 'border-violet-200 bg-violet-50/50'
    if (sec === 'Promessa') return 'border-blue-200 bg-blue-50/50'
    if (sec === 'Fechamento') return 'border-emerald-200 bg-emerald-50/50'
    return 'border-gray-200 bg-gray-50/40'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{script.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">{script.platform}</span>
              <span className="text-[10px] text-gray-400">{script.estimated_duration}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="btn-secondary text-xs">
              {copied ? <><Check size={12} className="text-emerald-500" /> Copiado!</> : <><Copy size={12} /> Copiar Roteiro</>}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {(script.script || []).map((section, i) => (
            <div key={i} className={`p-4 rounded-xl border space-y-2 ${sectionColor(section.section)}`}>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide inline-block ${
                section.section === 'Hook' ? 'bg-orange-100 text-orange-700' :
                section.section === 'CTA' ? 'bg-violet-100 text-violet-700' :
                'bg-gray-100 text-gray-600'
              }`}>{section.section}</span>
              <p className="text-sm text-gray-800 leading-relaxed">{section.text}</p>
              {section.notes && (
                <p className="text-[11px] text-gray-400 italic border-t border-gray-100 pt-2">💡 {section.notes}</p>
              )}
            </div>
          ))}
          {(script.b_roll_suggestions?.length > 0 || script.thumbnail_ideas?.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {script.b_roll_suggestions?.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">B-roll sugerido</p>
                  {script.b_roll_suggestions.map((s, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-gray-300">•</span>{s}</p>
                  ))}
                </div>
              )}
              {script.thumbnail_ideas?.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Thumbnails</p>
                  {script.thumbnail_ideas.map((t, i) => (
                    <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-gray-300">•</span>{t}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
