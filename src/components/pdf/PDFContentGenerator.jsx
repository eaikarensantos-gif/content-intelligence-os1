import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileText, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  Loader2, X, RefreshCw, BookOpen, Instagram, Film, LayoutGrid, MessageCircle,
  ListChecks, PenLine,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

const LS_KEY = 'cio-anthropic-key'

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

async function callAnthropic(prompt, system, maxTokens = 2000) {
  const apiKey = localStorage.getItem(LS_KEY) || ''
  if (!apiKey) throw new Error('Chave de API Anthropic não configurada. Vá em Configurações para adicionar.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Erro na API: ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  return text.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim()
}

// ── Extract lesson titles from PDF ────────────────────────────────────────────

async function extractLessonTitles(pdfText) {
  const truncated = chunkText(pdfText, 8000)
  const text = await callAnthropic(
    `Analise o índice ou estrutura deste material de curso e extraia todos os títulos de aulas, módulos ou capítulos.

CONTEÚDO:
${truncated}

Retorne APENAS um array JSON com os títulos encontrados, do mais geral ao mais específico. Exemplo:
["Módulo 1: Introdução", "Aula 1 - O que é...", "Aula 2 - Como fazer..."]

Se não encontrar uma estrutura clara, crie títulos baseados nos principais temas abordados no conteúdo.
Retorne entre 5 e 20 títulos. APENAS o array JSON.`,
    'Você é um especialista em análise de material didático. Responda APENAS com JSON válido.',
    1000,
  )
  return JSON.parse(text)
}

// ── Generate content for a specific topic ────────────────────────────────────

async function generateContent(pdfText, lessonTitle, format, count) {
  const truncated = chunkText(pdfText)

  const formatInstructions = {
    carousel: `Crie ${count} carrosseis distintos sobre o tema "${lessonTitle}". Cada um deve ter: título impactante, 5 a 7 slides (cada slide com um título curto e 2 a 3 bullet points), e uma chamada para ação final.`,
    reel: `Crie ${count} roteiros de Reel (30-60s) sobre o tema "${lessonTitle}". Cada um deve ter: gancho de abertura (primeiros 3 segundos), desenvolvimento (pontos principais narrados), e fechamento com CTA.`,
    stories: `Crie ${count} sequências de Stories sobre o tema "${lessonTitle}". Cada sequência tem 5 a 8 stories com texto principal, sugestão de interação (enquete, pergunta), e CTA no último story.`,
    post: `Crie ${count} posts de feed completos sobre o tema "${lessonTitle}". Cada um com: hook de abertura, desenvolvimento em parágrafos curtos, encerramento com reflexão, e 10 a 15 hashtags relevantes.`,
  }

  const jsonFormat = {
    carousel: `[{"title": "...", "slides": [{"heading": "...", "bullets": ["...", "..."]}], "cta": "..."}]`,
    reel: `[{"title": "...", "hook": "...", "script": "...", "cta": "...", "duration": "30s"}]`,
    stories: `[{"title": "...", "stories": [{"text": "...", "interaction": "...", "type": "text|poll|question"}], "cta": "..."}]`,
    post: `[{"title": "...", "hook": "...", "body": "...", "closing": "...", "hashtags": ["..."]}]`,
  }

  const prompt = `Baseado no conteúdo do curso abaixo, crie conteúdo para redes sociais focado no tema: "${lessonTitle}".

${formatInstructions[format.id]}

IMPORTANTE: Use apenas ensinamentos reais do material. Linguagem próxima, direta e educativa.

CONTEÚDO DO CURSO:
${truncated}

Retorne um array JSON com exatamente ${count} itens:
${jsonFormat[format.id]}

Retorne APENAS o array JSON, sem markdown.`

  const text = await callAnthropic(
    prompt,
    'Você é um especialista em criação de conteúdo para redes sociais. Responda APENAS com JSON válido.',
    4000,
  )
  return JSON.parse(text)
}

// ── Format config ──────────────────────────────────────────────────────────────

const FORMATS = [
  {
    id: 'carousel',
    label: 'Carrossel',
    icon: LayoutGrid,
    description: 'Slides sequenciais para Instagram/LinkedIn',
    iconColor: 'text-purple-600',
    selectedBg: 'bg-purple-50 border-purple-300',
    labelColor: 'text-purple-700',
    count: 3,
  },
  {
    id: 'reel',
    label: 'Roteiro de Reel',
    icon: Film,
    description: 'Script narrado para vídeo curto (30–60s)',
    iconColor: 'text-pink-600',
    selectedBg: 'bg-pink-50 border-pink-300',
    labelColor: 'text-pink-700',
    count: 2,
  },
  {
    id: 'stories',
    label: 'Stories',
    icon: Instagram,
    description: 'Sequência de stories com CTAs',
    iconColor: 'text-orange-600',
    selectedBg: 'bg-orange-50 border-orange-300',
    labelColor: 'text-orange-700',
    count: 3,
  },
  {
    id: 'post',
    label: 'Post de Feed',
    icon: MessageCircle,
    description: 'Post longo com legenda e hashtags',
    iconColor: 'text-blue-600',
    selectedBg: 'bg-blue-50 border-blue-300',
    labelColor: 'text-blue-700',
    count: 3,
  },
]

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
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="font-medium text-sm text-gray-900">{item.title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{item.slides?.length || 0} slides</span>
          {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>
      {open && (
        <div className="p-4 space-y-3">
          {(item.slides || []).map((slide, i) => (
            <div key={i} className="bg-purple-50 border border-purple-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-purple-600 mb-1">Slide {i + 1}</p>
              <p className="text-sm font-medium text-gray-900 mb-2">{slide.heading}</p>
              <ul className="space-y-1">
                {(slide.bullets || []).map((b, j) => (
                  <li key={j} className="text-xs text-gray-700 flex gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {item.cta && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs text-purple-600 font-semibold mb-1">CTA</p>
              <p className="text-sm text-gray-800">{item.cta}</p>
            </div>
          )}
          <button onClick={copyText} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? 'Copiado!' : 'Copiar tudo'}
          </button>
        </div>
      )}
    </div>
  )
}

function ReelCard({ item }) {
  const [copied, setCopied] = useState(false)
  function copyText() {
    const text = [`🎬 ${item.title}`, '', `GANCHO: ${item.hook}`, '', item.script, '', `👉 ${item.cta}`].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="border border-pink-200 rounded-xl p-4 space-y-3 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-gray-900">{item.title}</h4>
        <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full shrink-0 font-medium">{item.duration}</span>
      </div>
      <div className="bg-pink-50 border border-pink-100 rounded-lg p-3">
        <p className="text-xs font-semibold text-pink-600 mb-1">⚡ Gancho (0–3s)</p>
        <p className="text-sm text-gray-800">{item.hook}</p>
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-500 mb-1">📝 Roteiro</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.script}</p>
      </div>
      {item.cta && (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
          <p className="text-xs text-pink-600 font-semibold mb-1">CTA</p>
          <p className="text-sm text-gray-800">{item.cta}</p>
        </div>
      )}
      <button onClick={copyText} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
        {copied ? 'Copiado!' : 'Copiar roteiro'}
      </button>
    </div>
  )
}

function StoriesCard({ item }) {
  const [copied, setCopied] = useState(false)
  function copyText() {
    const text = [
      `📱 ${item.title}`, '',
      ...(item.stories || []).map((s, i) => `Story ${i + 1}: ${s.text}${s.interaction ? `\n[${s.interaction}]` : ''}`),
      '', `👉 ${item.cta}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="border border-orange-200 rounded-xl p-4 space-y-3 bg-white shadow-sm">
      <h4 className="font-medium text-sm text-gray-900">{item.title}</h4>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(item.stories || []).map((s, i) => (
          <div key={i} className="shrink-0 w-36 bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-2">
            <span className="text-xs text-orange-600 font-semibold">#{i + 1}</span>
            <p className="text-xs text-gray-800 leading-relaxed">{s.text}</p>
            {s.interaction && (
              <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full block text-center font-medium">
                {s.interaction}
              </span>
            )}
          </div>
        ))}
      </div>
      {item.cta && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs text-orange-600 font-semibold mb-1">CTA final</p>
          <p className="text-sm text-gray-800">{item.cta}</p>
        </div>
      )}
      <button onClick={copyText} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
        {copied ? 'Copiado!' : 'Copiar stories'}
      </button>
    </div>
  )
}

function PostCard({ item }) {
  const [copied, setCopied] = useState(false)
  function copyText() {
    const text = [
      item.hook, '', item.body, '', item.closing, '',
      (item.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' '),
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="border border-blue-200 rounded-xl p-4 space-y-3 bg-white shadow-sm">
      <h4 className="font-medium text-sm text-gray-900">{item.title}</h4>
      <div className="space-y-2">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-600 mb-1">🎣 Hook</p>
          <p className="text-sm text-gray-900 font-medium">{item.hook}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">📝 Legenda</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.body}</p>
        </div>
        {item.closing && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">✨ Fechamento</p>
            <p className="text-sm text-gray-700">{item.closing}</p>
          </div>
        )}
        {item.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.hashtags.map((h, i) => (
              <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {h.startsWith('#') ? h : `#${h}`}
              </span>
            ))}
          </div>
        )}
      </div>
      <button onClick={copyText} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
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
  const [pdfInfo, setPdfInfo] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState(null)

  // Lesson titles
  const [lessons, setLessons] = useState([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [customTopic, setCustomTopic] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  // Generation
  const [selectedFormats, setSelectedFormats] = useState(['carousel'])
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState({})
  const [genError, setGenError] = useState(null)
  const [activeTab, setActiveTab] = useState(null)

  const dropRef = useRef(null)
  const inputRef = useRef(null)

  const handleFile = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setExtractError('Por favor, envie um arquivo PDF.')
      return
    }
    setExtractError(null)
    setExtracting(true)
    setPdfInfo(null)
    setLessons([])
    setSelectedLesson(null)
    setResults({})
    setActiveTab(null)
    setUseCustom(false)
    setCustomTopic('')

    try {
      const { text, pageCount } = await extractTextFromPDF(file)
      if (!text.trim()) throw new Error('Não foi possível extrair texto deste PDF. Verifique se o arquivo não é uma imagem escaneada.')
      const info = { text, pageCount, name: file.name, size: file.size }
      setPdfInfo(info)
      setExtracting(false)

      // Extract lesson titles
      setLoadingLessons(true)
      try {
        const titles = await extractLessonTitles(text)
        setLessons(Array.isArray(titles) ? titles : [])
        if (titles.length > 0) setSelectedLesson(titles[0])
      } catch {
        setLessons([])
      } finally {
        setLoadingLessons(false)
      }
    } catch (err) {
      setExtractError(err.message || 'Erro ao processar o PDF.')
      setPdfInfo(null)
      setExtracting(false)
    }
  }, [])

  function onDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }
  function onDragOver(e) { e.preventDefault() }

  const activeTopic = useCustom ? customTopic.trim() : selectedLesson

  async function handleGenerate() {
    if (!pdfInfo || selectedFormats.length === 0 || !activeTopic) return
    setGenError(null)
    setGenerating(true)
    setResults({})

    const newResults = {}
    for (const fmtId of selectedFormats) {
      const fmt = FORMATS.find((f) => f.id === fmtId)
      try {
        const items = await generateContent(pdfInfo.text, activeTopic, fmt, fmt.count)
        newResults[fmtId] = Array.isArray(items) ? items : []
      } catch (err) {
        newResults[fmtId] = { error: err.message || 'Erro ao gerar conteúdo.' }
      }
    }

    setResults(newResults)
    setActiveTab(selectedFormats[0])
    setGenerating(false)
  }

  const hasResults = Object.keys(results).length > 0
  const canGenerate = pdfInfo && selectedFormats.length > 0 && activeTopic && !loadingLessons

  return (
    <div className="min-h-screen bg-gray-50 p-6">
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen size={24} className="text-orange-500" />
          PDF → Conteúdo
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Faça upload do PDF do seu curso, escolha a aula e gere posts, reels, carrosseis e stories.
        </p>
      </div>

      {/* Upload area */}
      <div
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => !extracting && !pdfInfo && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all
          ${pdfInfo
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 bg-white hover:border-orange-400 hover:bg-orange-50 cursor-pointer'}
        `}
      >
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => handleFile(e.target.files[0])} />

        {extracting ? (
          <div className="space-y-2">
            <Loader2 size={32} className="animate-spin text-orange-500 mx-auto" />
            <p className="text-sm text-gray-600">Extraindo texto do PDF…</p>
          </div>
        ) : pdfInfo ? (
          <div className="space-y-2">
            <FileText size={32} className="text-green-500 mx-auto" />
            <p className="font-semibold text-gray-900">{pdfInfo.name}</p>
            <p className="text-xs text-gray-500">
              {pdfInfo.pageCount} páginas · {Math.round(pdfInfo.size / 1024)} KB
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setPdfInfo(null); setLessons([]); setSelectedLesson(null); setResults({}); setActiveTab(null) }}
              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 mx-auto transition-colors"
            >
              <X size={12} /> Trocar arquivo
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={32} className="text-gray-400 mx-auto" />
            <p className="text-sm font-medium text-gray-700">Arraste o PDF aqui ou clique para selecionar</p>
            <p className="text-xs text-gray-400">Suporte a PDFs com texto selecionável (não escaneados)</p>
          </div>
        )}
      </div>

      {extractError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{extractError}</p>
      )}

      {/* Lesson selector */}
      {pdfInfo && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ListChecks size={16} className="text-orange-500" />
              Escolha a aula ou tema
            </h2>
            {loadingLessons && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2 size={12} className="animate-spin" /> Detectando aulas…
              </span>
            )}
          </div>

          {/* Toggle: list vs custom */}
          <div className="flex gap-2">
            <button
              onClick={() => setUseCustom(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                ${!useCustom ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <ListChecks size={13} /> Selecionar da lista
            </button>
            <button
              onClick={() => setUseCustom(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                ${useCustom ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <PenLine size={13} /> Digitar tema livre
            </button>
          </div>

          {useCustom ? (
            <div>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Ex: Como lidar com objeções de clientes, O poder da comunicação não-verbal…"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1.5">Digite qualquer tema — o conteúdo será gerado com base no PDF e neste tema.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {loadingLessons ? (
                <div className="flex flex-wrap gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-8 w-32 bg-gray-100 rounded-full animate-pulse" />
                  ))}
                </div>
              ) : lessons.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {lessons.map((lesson, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedLesson(lesson)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border text-left
                        ${selectedLesson === lesson
                          ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'}`}
                    >
                      {lesson}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Nenhum título detectado — use "Digitar tema livre" acima.</p>
              )}
              {selectedLesson && !useCustom && (
                <p className="text-xs text-gray-500 pt-1">
                  Selecionado: <span className="font-semibold text-gray-800">{selectedLesson}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Format selection */}
      {pdfInfo && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Selecione os formatos a gerar:</p>
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
                  className={`border rounded-xl p-3 text-left transition-all space-y-1.5
                    ${selected ? fmt.selectedBg : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                  <Icon size={18} className={selected ? fmt.iconColor : 'text-gray-400'} />
                  <p className={`text-sm font-semibold ${selected ? fmt.labelColor : 'text-gray-600'}`}>{fmt.label}</p>
                  <p className={`text-[11px] leading-tight ${selected ? 'text-gray-600' : 'text-gray-400'}`}>{fmt.description}</p>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Gerando conteúdo…</>
            ) : (
              <><Sparkles size={16} /> Gerar para "{activeTopic ? (activeTopic.length > 40 ? activeTopic.slice(0, 40) + '…' : activeTopic) : '…'}"</>
            )}
          </button>
        </div>
      )}

      {genError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{genError}</p>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={18} className="text-orange-500" />
              Conteúdo gerado
            </h2>
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
              <RefreshCw size={12} /> Regenerar
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-gray-200">
            {selectedFormats.filter((fmtId) => results[fmtId]).map((fmtId) => {
              const fmt = FORMATS.find((f) => f.id === fmtId)
              const Icon = fmt.icon
              const isActive = activeTab === fmtId
              return (
                <button key={fmtId} onClick={() => setActiveTab(fmtId)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all whitespace-nowrap border-b-2 -mb-px
                    ${isActive ? `border-orange-500 ${fmt.labelColor}` : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
                >
                  <Icon size={14} className={isActive ? fmt.iconColor : 'text-gray-400'} />
                  {fmt.label}
                  {Array.isArray(results[fmtId]) && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                      {results[fmtId].length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {activeTab && results[activeTab] && (
            <div className="space-y-3">
              {results[activeTab].error ? (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
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
    </div>
  )
}
