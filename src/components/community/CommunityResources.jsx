import { useState } from 'react'
import {
  BookOpen, Play, FileText, Sparkles, Search, Loader2,
  AlertCircle, ExternalLink, Mic, GraduationCap, Wrench, Download,
} from 'lucide-react'
import useAIStore from '../../store/useAIStore'

const LS_KEY = 'cio-anthropic-key'

const CATEGORIES = [
  {
    key: 'livros',
    label: 'Livros',
    icon: BookOpen,
    color: 'violet',
    linkFn: (item) => `https://www.amazon.com.br/s?k=${encodeURIComponent('"' + item.titulo + '" ' + (item.autor || ''))}&i=stripbooks`,
    linkLabel: 'Amazon',
  },
  {
    key: 'videos',
    label: 'Vídeos',
    icon: Play,
    color: 'red',
    linkFn: (item) => `https://www.youtube.com/results?search_query=${encodeURIComponent(item.titulo + ' ' + (item.canal || ''))}`,
    linkLabel: 'YouTube',
  },
  {
    key: 'podcasts',
    label: 'Podcasts',
    icon: Mic,
    color: 'pink',
    linkFn: (item) => `https://open.spotify.com/search/${encodeURIComponent(item.titulo + ' podcast')}`,
    linkLabel: 'Spotify',
  },
  {
    key: 'cursos',
    label: 'Cursos',
    icon: GraduationCap,
    color: 'amber',
    linkFn: (item) => `https://www.google.com/search?q=${encodeURIComponent(item.titulo + ' ' + (item.plataforma || '') + ' curso')}`,
    linkLabel: 'Buscar',
  },
  {
    key: 'artigos',
    label: 'Artigos',
    icon: FileText,
    color: 'blue',
    linkFn: (item) => `https://www.google.com/search?q=${encodeURIComponent('"' + item.titulo + '" ' + (item.fonte || ''))}`,
    linkLabel: 'Google',
  },
  {
    key: 'ferramentas',
    label: 'Ferramentas',
    icon: Wrench,
    color: 'emerald',
    linkFn: (item) => `https://www.google.com/search?q=${encodeURIComponent(item.titulo)}`,
    linkLabel: 'Buscar',
  },
]

const COLOR = {
  violet:  { header: 'bg-violet-50 border-violet-200',  icon: 'text-violet-600 bg-violet-100',  badge: 'bg-violet-100 text-violet-700'  },
  red:     { header: 'bg-red-50 border-red-200',         icon: 'text-red-600 bg-red-100',         badge: 'bg-red-100 text-red-700'         },
  pink:    { header: 'bg-pink-50 border-pink-200',       icon: 'text-pink-600 bg-pink-100',       badge: 'bg-pink-100 text-pink-700'       },
  amber:   { header: 'bg-amber-50 border-amber-200',     icon: 'text-amber-600 bg-amber-100',     badge: 'bg-amber-100 text-amber-700'     },
  blue:    { header: 'bg-blue-50 border-blue-200',       icon: 'text-blue-600 bg-blue-100',       badge: 'bg-blue-100 text-blue-700'       },
  emerald: { header: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600 bg-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
}

function parseJSON(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Resposta inválida da API')
  return JSON.parse(match[0])
}

// ── Exportar indicações como documento Word (.doc) ───────────────────────────
const escHTML = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function buildDoc(topic, results) {
  const sections = CATEGORIES.map(({ key, label, linkFn }) => {
    const items = results[key] ?? []
    if (items.length === 0) return ''
    const lis = items.map((item) => {
      const href = item.url || linkFn(item)
      const titulo = item.tituloReal || item.titulo
      const subtitle = item.autorReal || item.canalReal || item.autor || item.canal || item.programa || item.plataforma || item.fonte || item.tipo
      return `<li style="margin-bottom:10pt">
        <b><a href="${escHTML(href)}">${escHTML(titulo)}</a></b>${item.idioma ? ` <span style="color:#888">[${escHTML(item.idioma)}]</span>` : ''}
        ${subtitle ? `<br/><span style="color:#c2540a">${escHTML(subtitle)}</span>` : ''}
        ${item.descricao ? `<br/><i style="color:#555">${escHTML(item.descricao)}</i>` : ''}
        <br/><span style="font-size:9pt;color:#888">${escHTML(href)}</span>
      </li>`
    }).join('')
    return `<h2 style="color:#1a1a1a">${escHTML(label)}</h2><ul>${lis}</ul>`
  }).join('')

  return `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Indicações — ${escHTML(topic)}</title></head>
<body style="font-family:Calibri,Arial,sans-serif">
<h1 style="color:#1a1a1a">Indicações sobre "${escHTML(topic)}"</h1>
<p style="color:#888;font-size:10pt">Gerado em ${new Date().toLocaleDateString('pt-BR')} — Community Studio</p>
${sections}
</body></html>`
}

function baixarDoc(topic, results) {
  const slug = topic.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'indicacoes'
  const blob = new Blob(['﻿', buildDoc(topic, results)], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `indicacoes-${slug}.doc`
  a.click()
  URL.revokeObjectURL(url)
}

// Compara dois textos por sobreposição de palavras (0–1). Usado para validar
// se o resultado retornado pelas APIs é realmente o item indicado pela IA,
// evitando links para produtos/vídeos sem relação com o tema.
function similarity(a = '', b = '') {
  const tokens = (s) => new Set(
    String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/\W+/).filter((w) => w.length > 2)
  )
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let hits = 0
  ta.forEach((w) => { if (tb.has(w)) hits++ })
  return hits / Math.min(ta.size, tb.size)
}

async function enrichBooks(items) {
  return Promise.all(items.map(async (item) => {
    try {
      const q = encodeURIComponent(`${item.titulo} ${item.autor || ''}`)
      const lang = item.idioma === 'PT' ? '&langRestrict=pt' : ''
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3${lang}`)
      const data = await res.json()
      // Aceita só um volume cujo título realmente corresponde ao indicado —
      // o 1º resultado de busca fuzzy pode ser um livro sem relação nenhuma.
      const vol = (data.items || []).find((v) => similarity(item.titulo, v.volumeInfo?.title) >= 0.5)
      // Link real confirmado pela IA via busca na web tem prioridade;
      // o Google Books só complementa com a capa.
      if (item.url) {
        return {
          ...item,
          capa: vol?.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
          verified: true,
        }
      }
      if (!vol) return item
      const tituloReal = vol.volumeInfo?.title || item.titulo
      const autorReal = vol.volumeInfo?.authors?.join(', ') || item.autor
      return {
        ...item,
        capa: vol.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        autorReal,
        tituloReal,
        // Busca na Amazon com o título real entre aspas + autor confirmado,
        // para não cair em produtos aleatórios quando o termo é genérico.
        url: `https://www.amazon.com.br/s?k=${encodeURIComponent(`"${tituloReal}" ${autorReal || ''}`)}&i=stripbooks`,
        verified: true,
      }
    } catch {
      return item
    }
  }))
}

async function enrichVideos(items, youtubeApiKey) {
  return Promise.all(items.map(async (item) => {
    // Link direto do vídeo confirmado pela IA via busca na web — não precisa
    // da YouTube API.
    if (item.url && /youtube\.com\/watch|youtu\.be\//.test(item.url)) {
      return { ...item, verified: true }
    }
    if (!youtubeApiKey) return item
    try {
      const q = encodeURIComponent(`${item.titulo} ${item.canal || ''}`)
      const lang = item.idioma === 'PT' ? '&relevanceLanguage=pt&regionCode=BR' : ''
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&maxResults=1&type=video${lang}&key=${youtubeApiKey}`)
      const data = await res.json()
      const vid = data.items?.[0]
      if (!vid) return item
      // Só usa o link direto se o vídeo encontrado corresponde ao indicado;
      // senão mantém o link de busca, que sempre mostra resultados do tema.
      const match = similarity(
        `${item.titulo} ${item.canal || ''}`,
        `${vid.snippet?.title || ''} ${vid.snippet?.channelTitle || ''}`
      )
      if (match < 0.4) return item
      return {
        ...item,
        url: `https://www.youtube.com/watch?v=${vid.id.videoId}`,
        thumb: vid.snippet?.thumbnails?.default?.url || null,
        tituloReal: vid.snippet?.title || item.titulo,
        canalReal: vid.snippet?.channelTitle || item.canal,
        verified: true,
      }
    } catch {
      return item
    }
  }))
}

const PROMPT = (t, depth, comBusca) => `Você é um curador de conteúdo educacional com foco em profundidade real.

Tema: "${t}"
Nível: ${depth === 'avancado' ? 'avançado — a pessoa já conhece o básico' : 'intermediário — conhece o tema mas quer aprofundar'}

REGRAS:
1. IDIOMA (prioridade máxima): a maioria das indicações deve ser em português do Brasil. Em cada categoria, no mínimo 3 dos 4 itens em português — produzidos no Brasil ou com edição/tradução brasileira. No máximo 1 item em inglês por categoria, e só se for realmente excepcional.
2. PROIBIDO incluir os títulos mais famosos/citados do tema.
3. Prefira conteúdo dos últimos 3 anos ou clássicos pouco conhecidos no Brasil.
4. Livros: priorize autores brasileiros ou obras com edição publicada no Brasil (use o título da edição brasileira).
5. Vídeos: priorize canais brasileiros; prefira canais com menos de 500k inscritos mas alta densidade técnica.
6. Podcasts: priorize podcasts brasileiros e indique episódios específicos, não só o nome do podcast.
7. Cursos: priorize cursos em português (Alura, Sebrae, FGV, Conquer, Hotmart, Udemy em português etc.).
8. Artigos: priorize fontes em português (HBR Brasil, MIT Sloan Review Brasil, Exame, Na Prática, newsletters brasileiras no Substack).
9. Só inclua o que você tem certeza que existe, com título e autor/canal EXATOS — nunca invente nem aproxime nomes, pois eles geram os links.
10. Exatamente 4 itens por categoria.
11. Descrições sempre em português e curtas: máximo 12 palavras cada.
12. Em cada item, preencha "idioma" com "PT" (conteúdo em português) ou "EN" (inglês).${comBusca ? `
13. LINKS REAIS (obrigatório): use a busca na web para confirmar que cada item existe e preencha "url" com o link real e específico:
   - livros: página do produto na amazon.com.br (contendo /dp/); se não achar, a página da editora
   - vídeos: URL exata do vídeo (https://www.youtube.com/watch?v=...)
   - podcasts: link do episódio no Spotify ou YouTube
   - cursos: página oficial do curso na plataforma
   - artigos: URL do próprio artigo
   - ferramentas: site oficial da ferramenta
   NUNCA invente uma URL nem use link de página de busca. Se não conseguir confirmar o link exato, troque o item por outro que você consiga confirmar, ou deixe "url" como "".` : ''}

Retorne APENAS JSON válido sem texto adicional:
{
  "livros": [
    { "titulo": "string", "autor": "string", "descricao": "string", "idioma": "PT", "url": "" }
  ],
  "videos": [
    { "titulo": "string", "canal": "string", "descricao": "string", "idioma": "PT", "url": "" }
  ],
  "podcasts": [
    { "titulo": "string", "programa": "string", "descricao": "string", "idioma": "PT", "url": "" }
  ],
  "cursos": [
    { "titulo": "string", "plataforma": "string", "descricao": "string", "idioma": "PT", "url": "" }
  ],
  "artigos": [
    { "titulo": "string", "fonte": "string", "descricao": "string", "idioma": "PT", "url": "" }
  ],
  "ferramentas": [
    { "titulo": "string", "tipo": "string", "descricao": "string", "idioma": "PT", "url": "" }
  ]
}`

// Chama a API da Anthropic em streaming; com useWebSearch, habilita a
// ferramenta de busca na web para a IA confirmar cada indicação e obter o
// link real. Streaming evita a conexão ficar muda por minutos (e travar)
// enquanto as buscas rodam, e permite mostrar progresso na tela.
async function callClaude(apiKey, messages, useWebSearch, onSearch, signal) {
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    stream: true,
    messages,
  }
  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }]
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const e = new Error(err.error?.message || `Erro ${res.status}`)
    e.status = res.status
    throw e
  }

  // Reconstrói os blocos de conteúdo a partir dos eventos SSE.
  const content = []
  let stopReason = null
  const handleEvent = (evt) => {
    if (evt.type === 'error') {
      throw new Error(evt.error?.message || 'Erro no stream da API')
    } else if (evt.type === 'content_block_start') {
      content[evt.index] = { ...evt.content_block }
      if (evt.content_block.type === 'server_tool_use') {
        content[evt.index]._json = ''
        onSearch?.()
      }
    } else if (evt.type === 'content_block_delta') {
      const block = content[evt.index]
      if (!block) return
      if (evt.delta.type === 'text_delta') block.text = (block.text || '') + evt.delta.text
      else if (evt.delta.type === 'input_json_delta') block._json = (block._json || '') + evt.delta.partial_json
      else if (evt.delta.type === 'thinking_delta') block.thinking = (block.thinking || '') + evt.delta.thinking
    } else if (evt.type === 'content_block_stop') {
      const block = content[evt.index]
      if (block && block._json !== undefined) {
        try { block.input = JSON.parse(block._json || '{}') } catch { block.input = {} }
        delete block._json
      }
    } else if (evt.type === 'message_delta') {
      stopReason = evt.delta?.stop_reason || stopReason
    }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop()
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const payload = line.slice(5).trim()
      if (!payload) continue
      let evt
      try { evt = JSON.parse(payload) } catch { continue }
      handleEvent(evt)
    }
  }
  return { content, stop_reason: stopReason }
}

// Com busca na web, a resposta vem em vários blocos (buscas + texto);
// o JSON final é a junção de todos os blocos de texto.
function extractText(data) {
  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}

export default function CommunityResources() {
  const apiKey = localStorage.getItem(LS_KEY) || ''
  const youtubeApiKey = useAIStore((s) => s.youtubeApiKey)

  const [topic, setTopic]     = useState('')
  const [depth, setDepth]     = useState('avancado')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [results, setResults] = useState(null)
  const [lastTopic, setLastTopic] = useState('')
  const [searchCount, setSearchCount] = useState(0)

  async function buscar() {
    const t = topic.trim()
    if (!t || loading) return
    if (!apiKey) { setError('Configure sua API key da Anthropic em Configurações'); return }
    setLoading(true)
    setError(null)
    setResults(null)
    setSearchCount(0)

    // Tempo-limite duro: melhor falhar com mensagem clara do que carregar
    // para sempre.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 240_000)
    const onSearch = () => setSearchCount((n) => n + 1)

    try {
      let useWebSearch = true
      let messages = [{ role: 'user', content: PROMPT(t, depth, true) }]
      let data
      try {
        data = await callClaude(apiKey, messages, true, onSearch, controller.signal)
      } catch (e) {
        // Chave sem acesso à busca na web → refaz sem a ferramenta
        // (os links caem nos fallbacks de busca por categoria).
        if (e.status !== 400) throw e
        useWebSearch = false
        messages = [{ role: 'user', content: PROMPT(t, depth, false) }]
        data = await callClaude(apiKey, messages, false, onSearch, controller.signal)
      }
      // O servidor pausa o loop de buscas após várias rodadas; reenviar a
      // conversa continua de onde parou.
      let guard = 0
      while (data.stop_reason === 'pause_turn' && guard++ < 3) {
        messages = [...messages, { role: 'assistant', content: data.content }]
        data = await callClaude(apiKey, messages, useWebSearch, onSearch, controller.signal)
      }
      const parsed = parseJSON(extractText(data))

      // Sanitiza as URLs confirmadas pela IA: só aceita http(s) sem espaços;
      // item com link real válido já conta como verificado.
      Object.keys(parsed).forEach((k) => {
        if (!Array.isArray(parsed[k])) return
        parsed[k] = parsed[k].map((it) => {
          const url = typeof it.url === 'string' && /^https?:\/\/\S+$/.test(it.url.trim())
            ? it.url.trim()
            : undefined
          return { ...it, url, verified: !!url }
        })
      })

      const [livros, videos] = await Promise.all([
        enrichBooks(parsed.livros || []),
        enrichVideos(parsed.videos || [], youtubeApiKey),
      ])

      setResults({ ...parsed, livros, videos })
      setLastTopic(t)
    } catch (e) {
      if (e.name === 'AbortError') {
        setError('A busca demorou demais e foi cancelada. Tente novamente — se persistir, refaça com um tema mais específico.')
      } else {
        setError(e.message)
      }
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Ex: Empreender na era da IA, Precificação como PJ..."
              className="input w-full pl-9 text-sm"
            />
          </div>
          <button
            onClick={buscar}
            disabled={!topic.trim() || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-900 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Nível */}
        <div className="flex gap-2 items-center">
          {[{ id: 'intermediario', label: 'Intermediário' }, { id: 'avancado', label: 'Avançado' }].map((d) => (
            <button
              key={d.id}
              onClick={() => setDepth(d.id)}
              className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all ${
                depth === d.id
                  ? 'bg-zinc-800 text-white border-zinc-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {d.label}
            </button>
          ))}
          <span className="text-[10px] text-gray-400 ml-1">
            {depth === 'avancado' ? 'Exclui os títulos mais óbvios do tema' : 'Inclui boas introduções aprofundadas'}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <>
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <Loader2 size={12} className="animate-spin text-violet-500" />
            {searchCount > 0
              ? `Verificando indicações na web — ${searchCount} pesquisa${searchCount !== 1 ? 's' : ''} feita${searchCount !== 1 ? 's' : ''}... (leva ~1 min)`
              : 'Gerando indicações... a verificação de links na web pode levar ~1 minuto'}
          </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden animate-pulse">
              <div className="h-11 bg-gray-100" />
              <div className="p-3 space-y-3">
                {[1,2,3,4].map((j) => (
                  <div key={j} className="space-y-1">
                    <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                    <div className="h-2 bg-gray-50 rounded w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {results && !loading && (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-gray-400">
              Indicações sobre <strong className="text-gray-600">"{lastTopic}"</strong>
              {CATEGORIES.some(({ key }) => (results[key] || []).some((it) => !it.url)) && (
                <span className="ml-2 text-amber-500">· itens sem link confirmado abrem na busca</span>
              )}
            </p>
            <button
              onClick={() => baixarDoc(lastTopic, results)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
            >
              <Download size={12} /> Baixar doc
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map(({ key, label, icon: Icon, color, linkFn, linkLabel }) => {
              const items = results[key] ?? []
              if (items.length === 0) return null
              const c = COLOR[color]
              return (
                <div key={key} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  <div className={`flex items-center gap-2.5 px-3 py-2.5 border-b ${c.header}`}>
                    <span className={`p-1.5 rounded-lg ${c.icon}`}><Icon size={13} /></span>
                    <span className="text-sm font-semibold text-gray-800">{label}</span>
                    <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>{items.length}</span>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {items.map((item, i) => {
                      const href = item.url || linkFn(item)
                      const subtitle = item.autorReal || item.canalReal || item.autor || item.canal || item.programa || item.plataforma || item.fonte || item.tipo
                      return (
                        <li key={i}>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors group"
                          >
                            {(item.capa || item.thumb) && (
                              <img src={item.capa || item.thumb} alt="" className="w-7 h-9 object-cover rounded shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-orange-700 transition-colors">
                                {item.tituloReal || item.titulo}
                                {item.idioma && (
                                  <span className={`ml-1.5 align-middle text-[9px] font-semibold px-1 py-0.5 rounded ${
                                    item.idioma === 'PT' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    {item.idioma}
                                  </span>
                                )}
                              </p>
                              {subtitle && (
                                <p className="text-xs text-orange-600 font-medium mt-0.5">{subtitle}</p>
                              )}
                              {item.descricao && (
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.descricao}</p>
                              )}
                              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 group-hover:text-orange-500 transition-colors">
                                {item.verified
                                  ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> {linkLabel}</>
                                  : <><ExternalLink size={9} /> {linkLabel}</>
                                }
                              </span>
                            </div>
                          </a>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        </>
      )}

      {!results && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
          <BookOpen size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">O que você quer aprender?</p>
          <p className="text-xs mt-1 opacity-70">Livros, vídeos, podcasts, cursos, artigos e ferramentas — sem os óbvios</p>
        </div>
      )}
    </div>
  )
}
