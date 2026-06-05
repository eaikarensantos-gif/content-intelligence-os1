import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileText, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  Loader2, X, RefreshCw, BookOpen, Instagram, Film, LayoutGrid, MessageCircle,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import useAIStore from '../../store/useAIStore'
import { callAI } from '../../lib/aiService'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()

// ── Helpers ────────────────────────────────────────────────────────────────────

async function extractTextFromPDF(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pages = []
  for (let i = 1; i <= Math.min(pdf.numPages, 80); i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => item.str).join(' '))
  }
  return { text: pages.join('\n\n'), pageCount: pdf.numPages }
}

function chunkText(text, maxChars = 12000) {
  return text.length > maxChars ? text.slice(0, maxChars) + '\n[...conteúdo truncado para análise inicial]' : text
}

// ── Format config ──────────────────────────────────────────────────────────────

const FORMATS = [
  {
    id: 'carousel',
    label: 'Carrossel',
    icon: LayoutGrid,
    description: 'Slides sequenciais para Instagram/LinkedIn',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
    count: 3,
  },
  {
    id: 'reel',
    label: 'Roteiro de Reel',
    icon: Film,
    description: 'Script narrado para vídeo curto (30–60s)',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/30',
    count: 2,
  },
  {
    id: 'stories',
    label: 'Stories',
    icon: Instagram,
    description: 'Sequência de stories com CTAs',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    count: 3,
  },
  {
    id: 'post',
    label: 'Post de Feed',
    icon: MessageCircle,
    description: 'Post longo com legenda e hashtags',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    count: 3,
  },
]

// ── AI generation ──────────────────────────────────────────────────────────────

async function generateContent(aiSettings, pdfText, format, count) {
  const truncated = chunkText(pdfText)

  const formatInstructions = {
    carousel: `Crie ${count} carrosseis distintos. Cada um deve ter: título impactante, 5 a 7 slides (cada slide com um título curto e 2 a 3 bullet points), e uma chamada para ação final. Foque em ensinar um conceito do curso por carrossel.`,
    reel: `Crie ${count} roteiros de Reel (vídeo curto 30-60s). Cada um deve ter: gancho de abertura (primeiros 3 segundos), desenvolvimento (pontos principais narrados), e fechamento com CTA. Inclua indicações de corte e tom.`,
    stories: `Crie ${count} sequências de Stories. Cada sequência tem 5 a 8 stories com: texto principal, sugestão de sticker/interação (enquete, pergunta, contagem), e CTA no último story.`,
    post: `Crie ${count} posts de feed completos. Cada um com: frase de abertura (hook), desenvolvimento em parágrafos curtos, encerramento com reflexão, e 10 a 15 hashtags relevantes.`,
  }

  const messages = [
    {
      role: 'system',
      content:
        'Você é um especialista em criação de conteúdo para redes sociais, com expertise em transformar conteúdo educacional em posts virais. Responda APENAS com JSON válido, sem markdown.',
    },
    {
      role: 'user',
      content: `A seguir está o conteúdo de um curso em PDF. Baseado nesse material, crie conteúdo para redes sociais.

${formatInstructions[format.id]}

IMPORTANTE: Extraia ensinamentos reais do PDF. Use linguagem próxima, direta e educativa. Não invente conteúdo que não esteja no material.

CONTEÚDO DO PDF:
${truncated}

Retorne um array JSON com exatamente ${count} itens, no formato:
${format.id === 'carousel' ? `[{"title": "...", "slides": [{"heading": "...", "bullets": ["...", "..."]}], "cta": "..."}]` : ''}
${format.id === 'reel' ? `[{"title": "...", "hook": "...", "script": "...", "cta": "...", "duration": "30s"}]` : ''}
${format.id === 'stories' ? `[{"title": "...", "stories": [{"text": "...", "interaction": "...", "type": "text|poll|question"}], "cta": "..."}]` : ''}
${format.id === 'post' ? `[{"title": "...", "hook": "...", "body": "...", "closing": "...", "hashtags": ["..."]}]` : ''}

Retorne APENAS o array JSON.`,
    },
  ]

  const text = await callAI(aiSettings, messages, { temperature: 0.8, maxTokens: 4000 })
  const cleaned = text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
  return JSON.parse(cleaned)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CarouselCard({ item, index }) {
  const [open, setOpen] = useState(index === 0)
  const [copied, setCopied] = useState(false)

  function copyText() {
    const text = [
      `📌 ${item.title}`,
      '',
      ...(item.slides || []).map(
        (s, i) => `Slide ${i + 1}: ${s.heading}\n${(s.bullets || []).map((b) => `• ${b}`).join('\n')}`,
      ),
      '',
      `👉 ${item.cta}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/8 transition-colors text-left"
      >
        <span className="font-medium text-sm text-white">{item.title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{item.slides?.length || 0} slides</span>
          {open ? <ChevronUp size={14} className="text-white/50" /> : <ChevronDown size={14} className="text-white/50" />}
        </div>
      </button>
      {open && (
        <div className="p-4 space-y-3">
          {(item.slides || []).map((slide, i) => (
            <div key={i} className="bg-white/5 rounded-lg p-3">
              <p className="text-xs font-semibold text-purple-300 mb-1">Slide {i + 1}</p>
              <p className="text-sm font-medium text-white mb-2">{slide.heading}</p>
              <ul className="space-y-1">
                {(slide.bullets || []).map((b, j) => (
                  <li key={j} className="text-xs text-white/70 flex gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {item.cta && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <p className="text-xs text-purple-300 font-medium">CTA</p>
              <p className="text-sm text-white/80 mt-1">{item.cta}</p>
            </div>
          )}
          <button
            onClick={copyText}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copiado!' : 'Copiar tudo'}
          </button>
        </div>
      )}
    </div>
  )
}

function ReelCard({ item, index }) {
  const [copied, setCopied] = useState(false)

  function copyText() {
    const text = [`🎬 ${item.title}`, '', `GANCHO: ${item.hook}`, '', item.script, '', `👉 ${item.cta}`].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-pink-500/20 rounded-xl p-4 space-y-3 bg-pink-500/5">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-white">{item.title}</h4>
        <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full shrink-0">{item.duration}</span>
      </div>
      <div className="bg-white/5 rounded-lg p-3">
        <p className="text-xs font-semibold text-pink-300 mb-1">⚡ Gancho (0–3s)</p>
        <p className="text-sm text-white/80">{item.hook}</p>
      </div>
      <div className="bg-white/5 rounded-lg p-3">
        <p className="text-xs font-semibold text-pink-300 mb-1">📝 Roteiro</p>
        <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{item.script}</p>
      </div>
      {item.cta && (
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-3">
          <p className="text-xs text-pink-300 font-medium">CTA</p>
          <p className="text-sm text-white/80 mt-1">{item.cta}</p>
        </div>
      )}
      <button
        onClick={copyText}
        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
      >
        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        {copied ? 'Copiado!' : 'Copiar roteiro'}
      </button>
    </div>
  )
}

function StoriesCard({ item }) {
  const [copied, setCopied] = useState(false)

  function copyText() {
    const text = [
      `📱 ${item.title}`,
      '',
      ...(item.stories || []).map((s, i) => `Story ${i + 1}: ${s.text}${s.interaction ? `\n[${s.interaction}]` : ''}`),
      '',
      `👉 ${item.cta}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-orange-500/20 rounded-xl p-4 space-y-3 bg-orange-500/5">
      <h4 className="font-medium text-sm text-white">{item.title}</h4>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(item.stories || []).map((s, i) => (
          <div
            key={i}
            className="shrink-0 w-36 bg-white/5 border border-white/10 rounded-xl p-3 space-y-2"
          >
            <span className="text-xs text-orange-300 font-medium">#{i + 1}</span>
            <p className="text-xs text-white/80 leading-relaxed">{s.text}</p>
            {s.interaction && (
              <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full block text-center">
                {s.interaction}
              </span>
            )}
          </div>
        ))}
      </div>
      {item.cta && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
          <p className="text-xs text-orange-300 font-medium">CTA final</p>
          <p className="text-sm text-white/80 mt-1">{item.cta}</p>
        </div>
      )}
      <button
        onClick={copyText}
        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
      >
        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        {copied ? 'Copiado!' : 'Copiar stories'}
      </button>
    </div>
  )
}

function PostCard({ item }) {
  const [copied, setCopied] = useState(false)

  function copyText() {
    const text = [
      item.hook,
      '',
      item.body,
      '',
      item.closing,
      '',
      (item.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '),
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-blue-500/20 rounded-xl p-4 space-y-3 bg-blue-500/5">
      <h4 className="font-medium text-sm text-white">{item.title}</h4>
      <div className="space-y-2">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-300 mb-1">🎣 Hook</p>
          <p className="text-sm text-white/90 font-medium">{item.hook}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-300 mb-1">📝 Legenda</p>
          <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{item.body}</p>
        </div>
        {item.closing && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-300 mb-1">✨ Fechamento</p>
            <p className="text-sm text-white/70">{item.closing}</p>
          </div>
        )}
        {item.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.hashtags.map((h, i) => (
              <span key={i} className="text-xs bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full">
                {h.startsWith('#') ? h : `#${h}`}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={copyText}
        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
      >
        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        {copied ? 'Copiado!' : 'Copiar post'}
      </button>
    </div>
  )
}

function ResultCard({ format, item, index }) {
  if (format.id === 'carousel') return <CarouselCard item={item} index={index} />
  if (format.id === 'reel') return <ReelCard item={item} index={index} />
  if (format.id === 'stories') return <StoriesCard item={item} />
  if (format.id === 'post') return <PostCard item={item} />
  return null
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PDFContentGenerator() {
  const aiSettings = useAIStore((s) => s.settings)

  const [pdfFile, setPdfFile] = useState(null)
  const [pdfInfo, setPdfInfo] = useState(null) // { text, pageCount, name }
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState(null)

  const [selectedFormats, setSelectedFormats] = useState(['carousel'])
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState({}) // { formatId: [...items] }
  const [genError, setGenError] = useState(null)
  const [activeTab, setActiveTab] = useState(null)

  const dropRef = useRef(null)
  const inputRef = useRef(null)

  // ── File handling ────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setExtractError('Por favor, envie um arquivo PDF.')
      return
    }
    setExtractError(null)
    setExtracting(true)
    setPdfFile(file)
    setPdfInfo(null)
    setResults({})
    setActiveTab(null)

    try {
      const { text, pageCount } = await extractTextFromPDF(file)
      if (!text.trim()) throw new Error('Não foi possível extrair texto deste PDF. Verifique se o arquivo não é uma imagem escaneada.')
      setPdfInfo({ text, pageCount, name: file.name, size: file.size })
    } catch (err) {
      setExtractError(err.message || 'Erro ao processar o PDF.')
      setPdfFile(null)
    } finally {
      setExtracting(false)
    }
  }, [])

  function onDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onDragOver(e) {
    e.preventDefault()
  }

  // ── Generate ─────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!pdfInfo || selectedFormats.length === 0) return
    setGenError(null)
    setGenerating(true)
    setResults({})

    const newResults = {}
    for (const fmtId of selectedFormats) {
      const fmt = FORMATS.find((f) => f.id === fmtId)
      try {
        const items = await generateContent(aiSettings, pdfInfo.text, fmt, fmt.count)
        newResults[fmtId] = Array.isArray(items) ? items : []
      } catch (err) {
        newResults[fmtId] = { error: err.message || 'Erro ao gerar conteúdo.' }
      }
    }

    setResults(newResults)
    setActiveTab(selectedFormats[0])
    setGenerating(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const hasResults = Object.keys(results).length > 0

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen size={24} className="text-orange-400" />
          PDF → Conteúdo
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Faça upload do PDF do seu curso e gere posts, reels, carrosseis e stories automaticamente.
        </p>
      </div>

      {/* Upload area */}
      <div
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => !extracting && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
          ${pdfInfo
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-white/20 bg-white/3 hover:border-orange-400/50 hover:bg-orange-500/5'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {extracting ? (
          <div className="space-y-2">
            <Loader2 size={32} className="animate-spin text-orange-400 mx-auto" />
            <p className="text-sm text-white/60">Extraindo texto do PDF…</p>
          </div>
        ) : pdfInfo ? (
          <div className="space-y-2">
            <FileText size={32} className="text-green-400 mx-auto" />
            <p className="font-medium text-white">{pdfInfo.name}</p>
            <p className="text-xs text-white/50">
              {pdfInfo.pageCount} páginas · {Math.round(pdfInfo.size / 1024)} KB ·{' '}
              {pdfInfo.text.length.toLocaleString()} caracteres extraídos
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setPdfFile(null); setPdfInfo(null); setResults({}); setActiveTab(null) }}
              className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 mx-auto transition-colors"
            >
              <X size={12} /> Trocar arquivo
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={32} className="text-white/30 mx-auto" />
            <p className="text-sm font-medium text-white/70">Arraste o PDF aqui ou clique para selecionar</p>
            <p className="text-xs text-white/40">Suporte a PDFs com texto selecionável (não escaneados)</p>
          </div>
        )}
      </div>

      {extractError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{extractError}</p>
      )}

      {/* Format selection */}
      {pdfInfo && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-white/70">Selecione os formatos a gerar:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FORMATS.map((fmt) => {
              const Icon = fmt.icon
              const selected = selectedFormats.includes(fmt.id)
              return (
                <button
                  key={fmt.id}
                  onClick={() =>
                    setSelectedFormats((prev) =>
                      selected ? prev.filter((f) => f !== fmt.id) : [...prev, fmt.id],
                    )
                  }
                  className={`
                    border rounded-xl p-3 text-left transition-all space-y-1.5
                    ${selected ? fmt.bg + ' ring-1 ring-white/20' : 'border-white/10 bg-white/3 hover:bg-white/6'}
                  `}
                >
                  <Icon size={18} className={selected ? fmt.color : 'text-white/40'} />
                  <p className={`text-sm font-medium ${selected ? 'text-white' : 'text-white/60'}`}>{fmt.label}</p>
                  <p className={`text-[11px] leading-tight ${selected ? 'text-white/60' : 'text-white/30'}`}>{fmt.description}</p>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || selectedFormats.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Gerando conteúdo…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Gerar {selectedFormats.length} formato{selectedFormats.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}

      {genError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{genError}</p>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-orange-400" />
              Conteúdo gerado
            </h2>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              <RefreshCw size={12} /> Regenerar
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {selectedFormats
              .filter((fmtId) => results[fmtId])
              .map((fmtId) => {
                const fmt = FORMATS.find((f) => f.id === fmtId)
                const Icon = fmt.icon
                const isActive = activeTab === fmtId
                return (
                  <button
                    key={fmtId}
                    onClick={() => setActiveTab(fmtId)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                      ${isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'}
                    `}
                  >
                    <Icon size={14} className={isActive ? fmt.color : ''} />
                    {fmt.label}
                    {Array.isArray(results[fmtId]) && (
                      <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
                        {results[fmtId].length}
                      </span>
                    )}
                  </button>
                )
              })}
          </div>

          {/* Tab content */}
          {activeTab && results[activeTab] && (
            <div className="space-y-3">
              {results[activeTab].error ? (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {results[activeTab].error}
                </p>
              ) : (
                (results[activeTab] || []).map((item, i) => {
                  const fmt = FORMATS.find((f) => f.id === activeTab)
                  return <ResultCard key={i} format={fmt} item={item} index={i} />
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
