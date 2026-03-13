import { useState } from 'react'
import {
  Video, Link2, Upload, Search, ChevronRight, BookOpen,
  Lightbulb, Layers, Clock, Eye, Copy, Check,
  Sparkles, Trash2, RotateCcw, ExternalLink,
  Mic, Film, Zap, Target, TrendingUp, Star,
  Plus, Loader2, FileVideo, AlertCircle,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { analyzeVideo, extractYouTubeId, getYouTubeThumbnail } from '../../utils/videoAnalyzer'

const TABS = [
  { id: 'estrutura', label: 'Estrutura', icon: Layers },
  { id: 'tom', label: 'Tom & Padrões', icon: Mic },
  { id: 'retencao', label: 'Retenção', icon: Eye },
  { id: 'template', label: 'Template', icon: BookOpen },
  { id: 'ideias', label: 'Ideias', icon: Lightbulb },
]

const TYPE_OPTIONS = [
  { value: 'auto', label: 'Detectar automaticamente' },
  { value: 'educational', label: 'Educacional / Tutorial' },
  { value: 'storytelling', label: 'Storytelling / Pessoal' },
  { value: 'contrarian', label: 'Contrário / Opinião' },
  { value: 'listicle', label: 'Lista / Breakdown' },
]

const ARCHETYPE_COLORS = {
  educational: 'bg-blue-100 text-blue-700 border-blue-200',
  storytelling: 'bg-purple-100 text-purple-700 border-purple-200',
  contrarian: 'bg-red-100 text-red-700 border-red-200',
  listicle: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const ARCHETYPE_LABELS = {
  educational: 'Educacional',
  storytelling: 'Storytelling',
  contrarian: 'Contrário',
  listicle: 'Lista',
}

function Section({ title, icon: Icon, color = 'orange', children }) {
  const colors = {
    orange: 'text-orange-500 bg-orange-50',
    blue: 'text-blue-500 bg-blue-50',
    purple: 'text-purple-500 bg-purple-50',
    emerald: 'text-emerald-500 bg-emerald-50',
    amber: 'text-amber-500 bg-amber-50',
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${colors[color]}`}>
          <Icon size={14} />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function VideoAnalyzer() {
  const addVideoAnalysis = useStore((s) => s.addVideoAnalysis)
  const deleteVideoAnalysis = useStore((s) => s.deleteVideoAnalysis)
  const videoAnalyses = useStore((s) => s.videoAnalyses)
  const addIdea = useStore((s) => s.addIdea)

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [videoType, setVideoType] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [activeTab, setActiveTab] = useState('estrutura')
  const [copied, setCopied] = useState(false)
  const [savedIdeas, setSavedIdeas] = useState(new Set())
  const [showHistory, setShowHistory] = useState(false)
  const [savedAnalysis, setSavedAnalysis] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const ytId = extractYouTubeId(url)
  const thumbnail = ytId ? getYouTubeThumbnail(ytId) : null

  const handleAnalyze = async () => {
    if (!url.trim() && !title.trim()) return
    setLoading(true)
    setAnalysis(null)
    setSavedIdeas(new Set())
    setSavedAnalysis(false)
    await new Promise((r) => setTimeout(r, 2200))
    const result = analyzeVideo({ url, title, topic, videoType })
    setAnalysis(result)
    setActiveTab('estrutura')
    setLoading(false)
  }

  const handleReset = () => {
    setUrl('')
    setTitle('')
    setTopic('')
    setVideoType('auto')
    setAnalysis(null)
    setSavedIdeas(new Set())
    setSavedAnalysis(false)
  }

  const handleSaveAnalysis = () => {
    if (!analysis) return
    addVideoAnalysis({ url, title, topic, videoType, result: analysis, analyzed_at: new Date().toISOString() })
    setSavedAnalysis(true)
  }

  const handleSaveIdea = (idea) => {
    addIdea({
      title: idea.title,
      description: `Inspirado em análise de vídeo de referência${topic ? ` sobre "${topic}"` : ''}.`,
      format: idea.format,
      platform: idea.platform,
      hook_type: idea.hook_type,
      topic: topic || '',
      priority: 'medium',
      status: 'idea',
      tags: ['video-referencia', idea.angle?.toLowerCase().split(' ')[0]].filter(Boolean),
    })
    setSavedIdeas((s) => new Set([...s, idea.title]))
  }

  const handleCopyTemplate = () => {
    if (!analysis) return
    const t = analysis.template
    const text = [
      `# ${t.name}`,
      '',
      `## Fórmula do Gancho`,
      t.hook_formula,
      `Exemplo: ${t.hook_example}`,
      '',
      `## Abertura`,
      t.opening_formula,
      '',
      `## Estrutura de Seções`,
      ...t.sections.map((s) => `- **${s.name}** (${s.duration}): ${s.goal}`),
      '',
      `## Fechamento`,
      t.closing_formula,
      '',
      `## Dicas`,
      ...t.tips.map((tip) => `• ${tip}`),
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const loadSavedAnalysis = (saved) => {
    setUrl(saved.url || '')
    setTitle(saved.title || '')
    setTopic(saved.topic || '')
    setVideoType(saved.videoType || 'auto')
    setAnalysis(saved.result)
    setActiveTab('estrutura')
    setSavedIdeas(new Set())
    setSavedAnalysis(true)
    setShowHistory(false)
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-200">
            <Video size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Analisador de Vídeos de Referência</h1>
            <p className="text-xs text-gray-400">Desconstrua qualquer vídeo em estrutura, tom, padrões e um template reutilizável</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {videoAnalyses.length > 0 && (
            <button
              onClick={() => setShowHistory((x) => !x)}
              className="btn-secondary text-xs"
            >
              <Clock size={13} /> Histórico ({videoAnalyses.length})
            </button>
          )}
          {analysis && (
            <button onClick={handleReset} className="btn-secondary text-xs">
              <RotateCcw size={13} /> Nova Análise
            </button>
          )}
        </div>
      </div>

      {/* History panel */}
      {showHistory && videoAnalyses.length > 0 && (
        <div className="card p-4 space-y-2 animate-slide-up border border-violet-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Análises Salvas</h3>
          {videoAnalyses.map((saved) => (
            <div key={saved.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-violet-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <Video size={14} className="text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{saved.title || saved.url || 'Análise sem título'}</p>
                <p className="text-[10px] text-gray-400">{new Date(saved.analyzed_at).toLocaleDateString('pt-BR')} · {ARCHETYPE_LABELS[saved.result?.archetype] || 'Auto'}</p>
              </div>
              <button onClick={() => loadSavedAnalysis(saved)} className="text-xs text-violet-600 hover:text-violet-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Abrir
              </button>
              <button
                onClick={() => deleteVideoAnalysis(saved.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input card */}
      {!analysis && !loading && (
        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* URL input */}
            <div className="space-y-4">
              <div>
                <label className="label flex items-center gap-1.5">
                  <Link2 size={12} className="text-gray-400" /> URL do Vídeo
                </label>
                <input
                  className="input"
                  placeholder="https://youtube.com/watch?v=... ou qualquer URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                />
              </div>

              {/* YouTube thumbnail preview */}
              {thumbnail && (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100">
                  <img src={thumbnail} alt="Thumbnail do vídeo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-white ml-1" />
                    </div>
                  </div>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors">
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* File upload */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setTitle(f.name.replace(/\.[^/.]+$/, '')) }}
                onClick={() => document.getElementById('video-file-input').click()}
              >
                <input id="video-file-input" type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setTitle(f.name.replace(/\.[^/.]+$/, '')) }} />
                <FileVideo size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400 font-medium">Arraste um arquivo de vídeo ou clique para selecionar</p>
                <p className="text-[10px] text-gray-300 mt-1">MP4, MOV, AVI — o nome do arquivo será usado como contexto</p>
              </div>
            </div>

            {/* Context fields */}
            <div className="space-y-4">
              <div>
                <label className="label">Título do Vídeo <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input
                  className="input"
                  placeholder="Ex: Como Construir uma Audiência do Zero"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Tópico Principal <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input
                  className="input"
                  placeholder="Ex: marca pessoal, produtividade, vendas..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Tipo de Vídeo</label>
                <select className="select" value={videoType} onChange={(e) => setVideoType(e.target.value)}>
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-violet-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-500">
                    Quanto mais contexto você fornecer (título, tópico), mais precisa será a análise. Para YouTube, o thumbnail é carregado automaticamente.
                  </p>
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!url.trim() && !title.trim()}
                className="btn-primary w-full"
                style={{ background: (!url.trim() && !title.trim()) ? undefined : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                <Sparkles size={14} /> Analisar Vídeo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-16 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
            <Video size={20} className="absolute inset-0 m-auto text-violet-500" />
          </div>
          <div className="text-center space-y-1">
            {['Extraindo estrutura narrativa...', 'Detectando tom de voz...', 'Identificando padrões de retenção...', 'Gerando template reutilizável...'].map((step, i) => (
              <p key={i} className={`text-sm ${i === 0 ? 'font-medium text-gray-800' : 'text-gray-400'}`}
                style={{ animationDelay: `${i * 400}ms` }}>
                {step}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Analysis result */}
      {analysis && !loading && (
        <div className="space-y-4 animate-slide-up">
          {/* Result header */}
          <div className="card p-4 flex items-center gap-4 flex-wrap border border-violet-100">
            {thumbnail && (
              <img src={thumbnail} alt="thumb" className="w-20 h-12 object-cover rounded-lg shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`chip border text-[10px] ${ARCHETYPE_COLORS[analysis.archetype] || ''}`}>
                  {ARCHETYPE_LABELS[analysis.archetype]}
                </span>
                <span className="chip bg-gray-100 text-gray-500 border border-gray-200 text-[10px]">
                  {analysis.structure.main_points.length} pontos principais
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate">{title || url || 'Vídeo analisado'}</p>
              {topic && <p className="text-xs text-gray-400">Tópico: {topic}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!savedAnalysis ? (
                <button onClick={handleSaveAnalysis} className="btn-secondary text-xs">
                  <Star size={12} /> Salvar
                </button>
              ) : (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <Check size={12} /> Salvo
                </span>
              )}
              <button onClick={handleReset} className="btn-secondary text-xs">
                <RotateCcw size={12} /> Nova
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-700'}`}
              >
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          {/* ── ESTRUTURA TAB ─────────────────────────── */}
          {activeTab === 'estrutura' && (
            <div className="space-y-4">
              {/* Hook */}
              <div className="card p-5 border border-orange-200 bg-orange-50/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-orange-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Gancho — {analysis.structure.hook.type}</h3>
                  <span className="chip bg-orange-100 text-orange-700 border border-orange-200 text-[10px] ml-auto">{analysis.structure.hook.duration}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{analysis.structure.hook.description}</p>
                <div className="bg-white rounded-lg p-3 border border-orange-100">
                  <p className="text-[10px] text-orange-500 font-medium mb-1">EXEMPLO:</p>
                  <p className="text-xs text-gray-700 italic">{analysis.structure.hook.example}</p>
                </div>
                <p className="text-[11px] text-emerald-600 font-medium">✓ {analysis.structure.hook.effectiveness}</p>
              </div>

              {/* Context */}
              <div className="card p-4 space-y-2 border border-blue-100 bg-blue-50/30">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">C</div>
                  <h3 className="text-xs font-semibold text-gray-800">Contexto / Credencial</h3>
                </div>
                <p className="text-xs text-gray-500">{analysis.structure.context.description}</p>
                <p className="text-xs text-gray-600 italic bg-white/60 rounded p-2">"{analysis.structure.context.example}"</p>
              </div>

              {/* Main points */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pontos Principais</h3>
                {analysis.structure.main_points.map((pt, i) => (
                  <div key={i} className="card p-4 flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-800">{pt.point}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">{pt.duration}</span>
                      </div>
                      <p className="text-xs text-gray-500">{pt.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Closing + CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="card p-4 space-y-2 border border-emerald-100 bg-emerald-50/30">
                  <div className="flex items-center gap-2">
                    <Target size={13} className="text-emerald-500" />
                    <h3 className="text-xs font-semibold text-gray-800">Fechamento</h3>
                    <span className="text-[10px] text-gray-400 ml-auto">{analysis.structure.closing.duration}</span>
                  </div>
                  <p className="text-xs text-gray-500">{analysis.structure.closing.description}</p>
                  <p className="text-xs text-gray-600 italic bg-white/60 rounded p-2">"{analysis.structure.closing.example}"</p>
                </div>
                <div className="card p-4 space-y-2 border border-violet-100 bg-violet-50/30">
                  <div className="flex items-center gap-2">
                    <ChevronRight size={13} className="text-violet-500" />
                    <h3 className="text-xs font-semibold text-gray-800">CTA</h3>
                    <span className="chip bg-violet-100 text-violet-700 border border-violet-200 text-[10px] ml-auto">{analysis.structure.cta.type}</span>
                  </div>
                  <p className="text-xs text-gray-500">{analysis.structure.cta.description}</p>
                  <p className="text-xs text-gray-600 italic bg-white/60 rounded p-2">"{analysis.structure.cta.example}"</p>
                </div>
              </div>
            </div>
          )}

          {/* ── TOM & PADRÕES TAB ─────────────────────── */}
          {activeTab === 'tom' && (
            <div className="space-y-5">
              {/* Tone */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Mic size={15} className="text-purple-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Análise de Tom de Voz</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                    <p className="text-[10px] text-purple-400 font-medium mb-1 uppercase tracking-wide">Tom Primário</p>
                    <p className="text-sm font-bold text-purple-700">{analysis.tone.primary}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                    <p className="text-[10px] text-indigo-400 font-medium mb-1 uppercase tracking-wide">Tom Secundário</p>
                    <p className="text-sm font-bold text-indigo-700">{analysis.tone.secondary}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{analysis.tone.description}</p>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Características da Voz</p>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100 italic">{analysis.tone.voice_characteristics}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Marcadores de Tom</p>
                  <div className="space-y-1.5">
                    {analysis.tone.markers.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-purple-400 mt-0.5 shrink-0">•</span>
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patterns */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp size={15} className="text-amber-500" />
                  Padrões de Conteúdo Identificados
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {analysis.patterns.map((p, i) => (
                    <div key={i} className="card p-4 space-y-2 border border-amber-100 bg-amber-50/30">
                      <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.description}</p>
                      <div className="flex items-start gap-1.5 bg-white/70 rounded-lg p-2.5 border border-amber-100/50">
                        <Sparkles size={11} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-gray-600">{p.why_effective}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Why it works */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Star size={15} className="text-orange-500" />
                  Por Que Esse Vídeo Funciona
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {analysis.why_it_works.map((w, i) => (
                    <div key={i} className="card p-4 space-y-1.5 border border-orange-100 bg-orange-50/20">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">{i + 1}</div>
                        <p className="text-xs font-semibold text-gray-800">{w.reason}</p>
                      </div>
                      <p className="text-xs text-gray-500 pl-7">{w.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── RETENÇÃO TAB ──────────────────────────── */}
          {activeTab === 'retencao' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Eye size={15} className="text-sky-500" />
                  Técnicas de Retenção de Audiência
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {analysis.retention.map((r, i) => (
                    <div key={i} className="card p-4 space-y-2 border border-sky-100 bg-sky-50/30">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[10px] font-bold text-sky-600 shrink-0">{i + 1}</div>
                        <p className="text-xs font-semibold text-gray-800">{r.technique}</p>
                      </div>
                      <p className="text-xs text-gray-500">{r.description}</p>
                      <div className="bg-white/70 rounded-lg p-2.5 border border-sky-100/50">
                        <p className="text-[11px] text-gray-600 italic">{r.example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual elements */}
              <div className="card p-5 space-y-4 border border-gray-200">
                <div className="flex items-center gap-2">
                  <Film size={15} className="text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Elementos Visuais e Estilo de Edição</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-medium mb-1 uppercase tracking-wide">Texto na Tela</p>
                    <p className="text-xs text-gray-600">{analysis.visual.text_style}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-medium mb-1 uppercase tracking-wide">Estilo de Edição</p>
                    <p className="text-xs text-gray-600">{analysis.visual.editing_style}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-medium mb-1 uppercase tracking-wide">Ritmo (Pacing)</p>
                    <p className="text-xs text-gray-600">{analysis.visual.pacing}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Técnicas Visuais Identificadas</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.visual.key_techniques.map((t, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TEMPLATE TAB ──────────────────────────── */}
          {activeTab === 'template' && analysis.template && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{analysis.template.name}</h3>
                <button onClick={handleCopyTemplate} className="btn-secondary text-xs">
                  {copied ? <><Check size={12} className="text-emerald-500" /> Copiado!</> : <><Copy size={12} /> Copiar Template</>}
                </button>
              </div>

              {/* Hook formula */}
              <div className="card p-4 space-y-3 border border-orange-200 bg-orange-50/30">
                <p className="text-[11px] text-orange-500 font-semibold uppercase tracking-wide">Fórmula do Gancho</p>
                <p className="text-sm font-medium text-gray-800">{analysis.template.hook_formula}</p>
                <div className="bg-white/70 rounded-lg p-3 border border-orange-100">
                  <p className="text-[10px] text-gray-400 mb-1">EXEMPLO:</p>
                  <p className="text-xs text-gray-700 italic">{analysis.template.hook_example}</p>
                </div>
              </div>

              {/* Opening */}
              <div className="card p-4 space-y-2 border border-blue-100 bg-blue-50/30">
                <p className="text-[11px] text-blue-500 font-semibold uppercase tracking-wide">Estrutura de Abertura</p>
                <p className="text-xs text-gray-700">{analysis.template.opening_formula}</p>
              </div>

              {/* Sections */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seções do Vídeo</p>
                {analysis.template.sections.map((s, i) => (
                  <div key={i} className="card p-4 flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-600 shrink-0 mt-0.5">{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">{s.duration}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{s.goal}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Closing formula */}
              <div className="card p-4 space-y-2 border border-emerald-100 bg-emerald-50/30">
                <p className="text-[11px] text-emerald-500 font-semibold uppercase tracking-wide">Fórmula de Fechamento</p>
                <p className="text-xs text-gray-700">{analysis.template.closing_formula}</p>
              </div>

              {/* Tips */}
              <div className="card p-4 space-y-3">
                <p className="text-[11px] text-amber-500 font-semibold uppercase tracking-wide">Dicas para Replicar</p>
                {analysis.template.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight size={13} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-600">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── IDEIAS TAB ────────────────────────────── */}
          {activeTab === 'ideias' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">6 ideias de conteúdo inspiradas neste vídeo — clique em "Salvar no Hub" para enviá-las direto para seu Hub de Ideias.</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {analysis.content_ideas.map((idea, i) => (
                  <div key={i} className="card p-4 space-y-3 hover:border-orange-300 transition-colors relative overflow-hidden">
                    {savedIdeas.has(idea.title) && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-600/90 rounded-xl backdrop-blur-sm">
                        <span className="text-white font-semibold text-sm flex items-center gap-2"><Check size={16} /> Salvo no Hub</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-800 flex-1 leading-snug">{idea.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="chip bg-gray-100 text-gray-600 border border-gray-200 text-[10px]">{idea.platform}</span>
                      <span className="chip bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px]">{idea.format}</span>
                      <span className="chip bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">{idea.hook_type}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 italic">{idea.angle}</p>
                    <button
                      onClick={() => handleSaveIdea(idea)}
                      className="btn-primary text-xs py-1.5 w-full"
                    >
                      <Plus size={12} /> Salvar no Hub de Ideias
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
