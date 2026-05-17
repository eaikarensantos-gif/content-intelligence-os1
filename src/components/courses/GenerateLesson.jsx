import { useState } from 'react'
import {
  Wand2, Loader2, BookOpen, Target, Users, Copy, Check,
  FileText, Dumbbell, ChevronDown, ChevronUp,
} from 'lucide-react'
import useAIStore from '../../store/useAIStore'
import { aiGenerateStandaloneLesson } from '../../lib/courseAI'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 transition-colors"
    >
      {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
    </button>
  )
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
          <Icon size={15} className="text-orange-500" />
        </div>
        <span className="flex-1 font-semibold text-sm text-gray-800">{title}</span>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
    </div>
  )
}

export default function GenerateLesson() {
  const getSettings = useAIStore((s) => s.getSettings)
  const isConfigured = useAIStore((s) => s.isConfigured)

  const [form, setForm] = useState({ topic: '', audience: '', objectives: '' })
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!form.topic.trim()) return
    if (!isConfigured()) { setError('Configure a IA em Configurações primeiro.'); return }
    setGenerating(true)
    setError('')
    setResult(null)
    try {
      const lesson = await aiGenerateStandaloneLesson(getSettings(), form)
      setResult(lesson)
    } catch (err) {
      setError(err.message || 'Erro ao gerar aula. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
          <Wand2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gerador de Aula</h1>
          <p className="text-xs text-gray-500">Gere uma aula completa com roteiro e exercícios usando IA</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            <BookOpen size={11} className="inline mr-1" /> Tema da aula *
          </label>
          <input
            type="text"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Ex: Como criar um funil de vendas no Instagram"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              <Users size={11} className="inline mr-1" /> Público-alvo
            </label>
            <input
              type="text"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              placeholder="Ex: Empreendedores iniciantes"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              <Target size={11} className="inline mr-1" /> Objetivo da aula
            </label>
            <input
              type="text"
              value={form.objectives}
              onChange={(e) => setForm({ ...form, objectives: e.target.value })}
              placeholder="Ex: Aprender a criar stories de vendas"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        </div>

        {error && (
          <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating || !form.topic.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-medium text-sm rounded-xl transition-colors"
        >
          {generating ? (
            <><Loader2 size={16} className="animate-spin" /> Gerando aula...</>
          ) : (
            <><Wand2 size={16} /> Gerar Aula Completa</>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-3 animate-fade-in">
          {/* Header card */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold">{result.title}</h2>
              <CopyButton text={result.title} />
            </div>
            <p className="text-orange-100 text-sm leading-relaxed">{result.summary}</p>
            <div className="flex gap-4 mt-3 text-xs text-orange-200">
              {result.duration && <span>⏱ {result.duration} min estimados</span>}
              <span>📝 {result.type || 'video'}</span>
            </div>
          </div>

          {/* Key points */}
          {result.keyPoints?.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Pontos-chave</h3>
              <ul className="space-y-2">
                {result.keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Script */}
          {result.script && (
            <CollapsibleSection title="Roteiro completo" icon={FileText} defaultOpen>
              <div className="pt-4">
                <div className="flex justify-end mb-2">
                  <CopyButton text={result.script} />
                </div>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {result.script}
                </pre>
              </div>
            </CollapsibleSection>
          )}

          {/* Exercises */}
          {result.exercises?.length > 0 && (
            <CollapsibleSection title={`Exercícios (${result.exercises.length})`} icon={Dumbbell} defaultOpen>
              <div className="pt-4 space-y-3">
                {result.exercises.map((ex, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                        {ex.type}
                      </span>
                      <span className="text-sm font-medium text-gray-800">{ex.title}</span>
                    </div>
                    <p className="text-sm text-gray-600">{ex.content}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Regenerate */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-colors"
          >
            <Wand2 size={14} /> Regenerar
          </button>
        </div>
      )}
    </div>
  )
}
