import { useState, useEffect, useCallback } from 'react'
import {
  Newspaper, RefreshCw, Loader2, Sparkles, Copy, Check,
  ExternalLink, ChevronRight, X, LayoutGrid, FileText, Video, MessageSquare, Languages, Heart,
} from 'lucide-react'
import clsx from 'clsx'
import { withAntiAIFilter } from '../../lib/antiAIFilter'
import { withManualOperacional } from '../../lib/manualOperacional'
import { assertNotTruncated } from '../../utils/aiJson.js'
import useStore from '../../store/useStore'

async function callAI(apiKey, body) {
  const res = await fetch('/api/ai?action=gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Erro na API: ${res.status}`)
  }
  return res.json()
}

const LS_KEY = 'cio-anthropic-key'
const LS_FEEDS_KEY = 'cio-news-feeds'

const DEFAULT_FEEDS = [
  { id: 'tc', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', color: 'bg-orange-500' },
  { id: 'hbr', name: 'HBR', url: 'https://hbr.org/rss/topic/technology', color: 'bg-red-600' },
  { id: 'mit', name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', color: 'bg-blue-600' },
]
const loadFeeds = () => {
  try {
    const saved = localStorage.getItem(LS_FEEDS_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_FEEDS
  } catch {
    return DEFAULT_FEEDS
  }
}
const saveFeeds = (feeds) => {
  localStorage.setItem(LS_FEEDS_KEY, JSON.stringify(feeds))
}
const FEED_COLORS = [
  'bg-orange-500', 'bg-red-600', 'bg-blue-600', 'bg-emerald-600',
  'bg-purple-600', 'bg-pink-600', 'bg-amber-500', 'bg-cyan-600',
]

const CREATOR_PROFILE = `Perfil da criadora:
Consultora de UX e Estratégia de Produto, sênior independente, brasileira.
Histórico: Nubank, QuintoAndar, PicPay. Fundadora da UX para Minas Pretas.
Nicho: maturidade profissional na era da IA.
Público: profissionais de tech, produto e design, nível pleno a sênior.
Parceria ativa: Samsung (tech, IA aplicada, conteúdo de produto).
Tom: direto, analítico, sem motivacional, sem coach.
Ângulo: situações reais, decisões concretas, dados quando disponível.`

const FORMATS = [
  { id: 'post', label: 'Post LinkedIn', icon: FileText, desc: 'Post direto, analítico, sem motivacional' },
  { id: 'carousel', label: 'Carrossel', icon: LayoutGrid, desc: '5 slides com gancho + desenvolvimento' },
  { id: 'reels', label: 'Roteiro Reels', icon: Video, desc: 'Script de 60s para vídeo vertical' },
  { id: 'thread', label: 'Thread', icon: MessageSquare, desc: 'Sequência de 5 tweets/posts curtos' },
]

function stripHtml(html) {
  return html?.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() || ''
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'agora'
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

function articleKey(article) {
  return article.guid || article.link
}

export default function NewsGenerator() {
  const apiKey = localStorage.getItem(LS_KEY) || ''

  const favorites = useStore((s) => s.favorites)
  const addFavorite = useStore((s) => s.addFavorite)
  const removeFavorite = useStore((s) => s.removeFavorite)
  const newsFavorites = favorites.filter((f) => f.type === 'news')

  const isFavorited = (article) => newsFavorites.some((f) => f.newsKey === articleKey(article))

  const toggleFavorite = (article, e) => {
    e?.stopPropagation()
    const key = articleKey(article)
    const existing = newsFavorites.find((f) => f.newsKey === key)
    if (existing) {
      removeFavorite(existing.id)
    } else {
      addFavorite({
        type: 'news',
        title: article.title,
        content: stripHtml(article.description || ''),
        source: article.source,
        url: article.link,
        newsKey: key,
        pubDate: article.pubDate,
        categories: article.categories,
        sourceColor: article.sourceColor,
        guid: article.guid,
      })
    }
  }

  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [format, setFormat] = useState('post')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState('')
  const [genError, setGenError] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('')
  const [feeds, setFeeds] = useState(loadFeeds)
  const [activeFeeds, setActiveFeeds] = useState(() => loadFeeds().map(f => f.id))
  const [showFeedManager, setShowFeedManager] = useState(false)
  const [newFeedName, setNewFeedName] = useState('')
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [themes, setThemes] = useState([])
  const [activeTheme, setActiveTheme] = useState(null)
  const [analyzingThemes, setAnalyzingThemes] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translated, setTranslated] = useState(null)
  const [showTranslated, setShowTranslated] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const fetchNews = useCallback(async () => {
    setLoading(true)
    setError('')
    setThemes([])
    setActiveTheme(null)
    const enabledFeeds = feeds.filter(f => activeFeeds.includes(f.id))
    if (enabledFeeds.length === 0) {
      setArticles([])
      setLoading(false)
      return
    }
    try {
      const results = await Promise.allSettled(
        enabledFeeds.map(async (feed) => {
          const url = '/api/rss?url=' + encodeURIComponent(feed.url)
          const res = await fetch(url)
          if (!res.ok) throw new Error(`${feed.name}: feed indisponível`)
          const xml = await res.text()
          const doc = new DOMParser().parseFromString(xml, 'text/xml')
          return Array.from(doc.querySelectorAll('item')).slice(0, 20).map(item => ({
            title: item.querySelector('title')?.textContent || '',
            link: item.querySelector('link')?.nextSibling?.textContent?.trim() || item.querySelector('link')?.textContent || '',
            description: item.querySelector('description')?.textContent || '',
            pubDate: item.querySelector('pubDate')?.textContent || '',
            categories: Array.from(item.querySelectorAll('category')).map(c => c.textContent).filter(Boolean),
            guid: item.querySelector('guid')?.textContent || '',
            source: feed.name,
            sourceId: feed.id,
            sourceColor: feed.color,
          }))
        })
      )
      const fetchedArticles = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)

      // Favoritos ficam sempre visíveis na lista, mesmo depois que o feed
      // ao vivo os rotaciona pra fora da janela de itens recentes.
      const fetchedKeys = new Set(fetchedArticles.map(articleKey))
      const pinnedFavorites = favorites
        .filter((f) => f.type === 'news' && !fetchedKeys.has(f.newsKey))
        .map((f) => ({
          title: f.title,
          description: f.content,
          link: f.url,
          guid: f.guid,
          pubDate: f.pubDate,
          categories: f.categories || [],
          source: f.source,
          sourceColor: f.sourceColor,
        }))

      const allArticles = [...fetchedArticles, ...pinnedFavorites]
        .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.message)
      setArticles(allArticles)
      if (errors.length > 0 && allArticles.length === 0) {
        setError(errors.join(' · '))
      }
    } catch {
      setError('Não foi possível carregar os feeds. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [feeds, activeFeeds, favorites])

  useEffect(() => { fetchNews() }, [fetchNews])

  const analyzeThemes = async () => {
    if (!apiKey || articles.length === 0) return
    setAnalyzingThemes(true)
    setThemes([])
    setActiveTheme(null)
    try {
      const headlines = articles
        .slice(0, 40)
        .map((a, i) => `${i}. ${a.title}`)
        .join('\n')
      const prompt = `Você recebeu ${articles.slice(0, 40).length} manchetes de tech desta semana.
Agrupe-as nos 4 ou 5 temas mais recorrentes e relevantes para profissionais brasileiros de tech, produto e design.
Manchetes (número = índice):
${headlines}
Retorne JSON no formato:
{"themes": [{"label": "IA no trabalho", "indexes": [0, 3, 7, 12], "relevance": "alto"}, ...]}
Regras:
- Máx 5 temas
- label em português, curto (2-4 palavras)
- indexes: array com os números das manchetes que pertencem ao tema
- relevance: "alto", "médio" ou "baixo" (baseado em volume e impacto pro público)
- Ordene por relevance (alto primeiro)
- Retorne APENAS o JSON, sem texto antes ou depois`
      const res = await callAI(apiKey, {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = res.content?.find(b => b.type === 'text')?.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
        const mapped = parsed.themes.map(t => ({
          label: t.label,
          relevance: t.relevance,
          count: t.indexes.length,
          articleIndexes: t.indexes,
        }))
        setThemes(mapped)
      }
    } catch {
      // silently fail
    } finally {
      setAnalyzingThemes(false)
    }
  }

  const addFeed = () => {
    if (!newFeedName.trim() || !newFeedUrl.trim()) return
    const url = newFeedUrl.trim().startsWith('http') ? newFeedUrl.trim() : `https://${newFeedUrl.trim()}`
    const id = Date.now().toString()
    const color = FEED_COLORS[feeds.length % FEED_COLORS.length]
    const newFeed = { id, name: newFeedName.trim(), url, color }
    const updated = [...feeds, newFeed]
    setFeeds(updated)
    setActiveFeeds(prev => [...prev, id])
    saveFeeds(updated)
    setNewFeedName('')
    setNewFeedUrl('')
  }
  const removeFeed = (id) => {
    const updated = feeds.filter(f => f.id !== id)
    setFeeds(updated)
    setActiveFeeds(prev => prev.filter(fid => fid !== id))
    saveFeeds(updated)
  }
  const toggleFeed = (id) => {
    setActiveFeeds(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    )
  }

  const filtered = (() => {
    let base = articles
    if (activeTheme !== null && themes[activeTheme]) {
      const indexes = themes[activeTheme].articleIndexes
      base = indexes.map(i => articles[i]).filter(Boolean)
    }
    if (showFavoritesOnly) {
      base = base.filter(a => isFavorited(a))
    }
    if (filter.trim()) {
      base = base.filter(a =>
        a.title?.toLowerCase().includes(filter.toLowerCase()) ||
        a.categories?.some(c => c.toLowerCase().includes(filter.toLowerCase()))
      )
    }
    return base
  })()

  const buildPrompt = (article, fmt) => {
    const title = article.title || ''
    const summary = stripHtml(article.description || '').slice(0, 600)
    const url = article.link || ''
    const sourceName = article.source || 'TechCrunch'

    const base = `Manchete original (${sourceName}): "${title}"
Resumo: ${summary}
Fonte: ${url}

${CREATOR_PROFILE}

Ângulo: filtre o que é relevante para profissionais brasileiros de tech, produto e design. Traga a perspectiva de quem trabalha no mercado, não de quem só lê notícias. Dados concretos quando disponível. Sem reproduzir a manchete — adicione análise, contexto ou implicação real.`

    const noNarration = `\n\nIMPORTANTE: qualquer verificação, checklist ou rascunho interno é um processo mental — não escreva isso na resposta. Nada de comentários entre parênteses, notas de validação ou texto fora do conteúdo pedido. A resposta é só o conteúdo final, começando direto no gancho.`

    if (fmt === 'post') {
      return `${base}

Gere um post COMPLETO para LinkedIn com base nessa notícia. Estrutura:
- Primeira linha: gancho direto (declaração, dado ou observação — nunca pergunta retórica)
- Desenvolvimento: 2-3 parágrafos curtos com análise concreta
- Encerramento: implicação direta para o público (sem CTA genérico)
150-200 palavras (o post inteiro, não um resumo). Linguagem de conversa profissional, não de artigo.${noNarration}`
    }

    if (fmt === 'carousel') {
      return `${base}

Gere um carrossel COMPLETO de exatamente 5 slides com base nessa notícia. Cada slide precisa de título E corpo preenchidos — nunca deixe um campo vazio ou genérico.
Slide 1: gancho direto (1 frase, declaração ou dado)
Slides 2-4: desenvolvimento com análise concreta, um ponto por slide
Slide 5: implicação ou conclusão direta
Máx 40 palavras por slide, corpo com pelo menos 1 frase completa. Sem linguagem motivacional.${noNarration}
Retorne EXCLUSIVAMENTE JSON, sem texto antes ou depois, começando direto com "{":
{"slides": [{"numero": 1, "titulo": "...", "corpo": "..."}, {"numero": 2, "titulo": "...", "corpo": "..."}, {"numero": 3, "titulo": "...", "corpo": "..."}, {"numero": 4, "titulo": "...", "corpo": "..."}, {"numero": 5, "titulo": "...", "corpo": "..."}]}`
    }

    if (fmt === 'reels') {
      return `${base}

Gere um roteiro COMPLETO de Reels de 60 segundos com base nessa notícia — as três seções abaixo, cada uma preenchida por inteiro, não apenas um parágrafo de abertura:
- 0-5s: gancho visual (o que acontece na tela + fala de abertura exata)
- 5-45s: desenvolvimento em 3 blocos curtos, cada bloco com [tempo] fala / [tempo] legenda sugerida
- 45-60s: encerramento com implicação concreta, fala exata
Tom: conversa direta, sem voz de narrador de documentário.${noNarration}`
    }

    if (fmt === 'thread') {
      return `${base}

Gere uma thread COMPLETA de exatamente 5 posts com base nessa notícia. Cada post: máx 280 caracteres, todos os 5 preenchidos por inteiro.
Post 1: gancho (declaração direta com o fato principal)
Posts 2-4: desenvolvimento — um ângulo por post
Post 5: implicação concreta ou pergunta de análise (não retórica)
Retorne numerado: "1. ... / 2. ... / 3. ... / 4. ... / 5. ..."${noNarration}`
    }
    return base
  }

  const translate = async () => {
    if (!selected || !apiKey) return
    if (translated) { setShowTranslated(v => !v); return }
    setTranslating(true)
    try {
      const title = selected.title || ''
      const desc = stripHtml(selected.description || '').slice(0, 600)
      const prompt = `Traduza do inglês para o português brasileiro de forma natural e fluida, preservando o sentido técnico:

Título: ${title}
Resumo: ${desc}

Retorne JSON: {"titulo": "...", "resumo": "..."}`
      const res = await callAI(apiKey, {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = res.content?.find(b => b.type === 'text')?.text || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
        setTranslated({ title: parsed.titulo, description: parsed.resumo })
        setShowTranslated(true)
      }
    } catch {
      // silently fail, keep original
    } finally {
      setTranslating(false)
    }
  }

  const MAX_TOKENS_BY_FORMAT = { post: 2000, carousel: 4000, reels: 3000, thread: 2000 }

  const generate = async () => {
    if (!selected || !apiKey) return
    setGenerating(true)
    setResult('')
    setGenError('')
    try {
      const prompt = buildPrompt(selected, format)
      const res = await callAI(apiKey, {
        model: 'claude-sonnet-5',
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        max_tokens: MAX_TOKENS_BY_FORMAT[format] || 2000,
        system: withManualOperacional(withAntiAIFilter('Você é um estrategista de conteúdo para criadores digitais brasileiros de tech e produto. Gere conteúdo autêntico, específico e analítico — nunca genérico.')),
        messages: [{ role: 'user', content: prompt }],
      })
      assertNotTruncated(res, 'A resposta ficou grande demais e foi cortada antes de terminar. Tente novamente.')
      const text = res.content?.find(b => b.type === 'text')?.text || ''
      if (format === 'carousel') {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('Resposta inválida da IA')
        const parsed = JSON.parse(match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'))
        setResult(parsed.slides?.map(s => `**Slide ${s.numero}**\n${s.titulo}\n${s.corpo}`).join('\n\n') || text)
      } else {
        setResult(text)
      }
    } catch (e) {
      setGenError(e.message || 'Erro ao gerar. Verifique sua API key.')
    } finally {
      setGenerating(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Article list ── */}
      <div className="w-96 shrink-0 flex flex-col border-r border-gray-200 bg-white">
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                <Newspaper size={14} className="text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900">News Feed</span>
              <span className="text-[10px] text-gray-400">{articles.length} manchetes</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowFavoritesOnly(v => !v)}
                className={clsx(
                  'p-1.5 rounded-lg text-xs transition-colors',
                  showFavoritesOnly ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                )}
                title={showFavoritesOnly ? 'Ver todas as manchetes' : `Ver só favoritas (${newsFavorites.length})`}
              >
                <Heart size={14} className={showFavoritesOnly ? 'fill-current' : ''} />
              </button>
              <button
                onClick={() => setShowFeedManager(v => !v)}
                className={clsx(
                  'p-1.5 rounded-lg text-xs transition-colors',
                  showFeedManager ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                )}
                title="Gerenciar fontes"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={fetchNews}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                title="Atualizar feeds"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          {/* Gerenciador de fontes */}
          {showFeedManager && (
            <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fontes ativas</p>
              {feeds.map(feed => (
                <div key={feed.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFeed(feed.id)}
                    className={clsx(
                      'w-3 h-3 rounded-full shrink-0 transition-all',
                      activeFeeds.includes(feed.id) ? feed.color : 'bg-gray-300'
                    )}
                  />
                  <span className="text-xs text-gray-700 flex-1 truncate">{feed.name}</span>
                  {!DEFAULT_FEEDS.find(d => d.id === feed.id) && (
                    <button
                      onClick={() => removeFeed(feed.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
              {/* Adicionar fonte */}
              <div className="pt-2 border-t border-gray-200 space-y-1.5">
                <input
                  type="text"
                  placeholder="Nome (ex: Wired)"
                  value={newFeedName}
                  onChange={e => setNewFeedName(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-orange-300"
                />
                <input
                  type="text"
                  placeholder="URL do RSS"
                  value={newFeedUrl}
                  onChange={e => setNewFeedUrl(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-orange-300"
                />
                <button
                  onClick={addFeed}
                  disabled={!newFeedName.trim() || !newFeedUrl.trim()}
                  className="w-full text-xs py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg font-medium transition-colors"
                >
                  Adicionar fonte
                </button>
              </div>
            </div>
          )}
          {/* Badges de fontes ativas */}
          {!showFeedManager && (
            <div className="flex flex-wrap gap-1 mb-2">
              {feeds.filter(f => activeFeeds.includes(f.id)).map(feed => (
                <span key={feed.id} className={clsx('text-[10px] text-white px-1.5 py-0.5 rounded-full font-medium', feed.color)}>
                  {feed.name}
                </span>
              ))}
            </div>
          )}
          {/* Temas da semana */}
          {themes.length > 0 && (
            <div className="mb-2 space-y-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Temas da semana</p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveTheme(null)}
                  className={clsx(
                    'text-[10px] px-2 py-1 rounded-full border transition-all',
                    activeTheme === null ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  )}
                >
                  Todos
                </button>
                {themes.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTheme(activeTheme === i ? null : i)}
                    className={clsx(
                      'text-[10px] px-2 py-1 rounded-full border transition-all',
                      activeTheme === i
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    )}
                  >
                    {t.label} <span className="opacity-70">({t.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Botão analisar temas */}
          {articles.length > 0 && themes.length === 0 && (
            <button
              onClick={analyzeThemes}
              disabled={analyzingThemes || !apiKey}
              className="w-full mb-2 flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-40 transition-colors"
            >
              {analyzingThemes
                ? <><Loader2 size={11} className="animate-spin" /> Analisando temas...</>
                : <><Sparkles size={11} /> Identificar temas da semana</>}
            </button>
          )}
          {/* Busca */}
          <input
            type="text"
            placeholder="Filtrar manchetes..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-sm">Carregando feeds...</span>
            </div>
          )}
          {error && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>
          )}
          {!loading && !error && filtered.map((article, i) => {
            const isSelected = (selected?.guid || selected?.link) === (article.guid || article.link)
            const favorited = isFavorited(article)
            return (
              <div
                key={article.link || i}
                role="button"
                tabIndex={0}
                onClick={() => { setSelected(article); setResult(''); setGenError(''); setTranslated(null); setShowTranslated(false) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setSelected(article); setResult(''); setGenError(''); setTranslated(null); setShowTranslated(false) } }}
                className={clsx(
                  'w-full text-left px-4 py-3 border-b border-gray-50 transition-colors cursor-pointer',
                  isSelected ? 'bg-orange-50 border-l-2 border-l-orange-400' : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={clsx('text-xs font-medium leading-snug line-clamp-2', isSelected ? 'text-orange-800' : 'text-gray-800')}>
                    {article.title}
                  </p>
                  <button
                    onClick={(e) => toggleFavorite(article, e)}
                    className={clsx(
                      'shrink-0 p-0.5 transition-colors',
                      favorited ? 'text-red-500' : 'text-gray-200 hover:text-red-300'
                    )}
                    title={favorited ? 'Remover dos favoritos' : 'Favoritar — não some do feed'}
                  >
                    <Heart size={12} className={favorited ? 'fill-current' : ''} />
                  </button>
                  {isSelected && <ChevronRight size={12} className="text-orange-500 shrink-0 mt-0.5" />}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  {article.source && (
                    <span className={clsx('text-[10px] text-white px-1.5 py-0.5 rounded-full font-medium', article.sourceColor || 'bg-gray-400')}>
                      {article.source}
                    </span>
                  )}
                  {article.categories?.slice(0, 1).map(cat => (
                    <span key={cat} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{cat}</span>
                  ))}
                  <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(article.pubDate)}</span>
                </div>
              </div>
            )
          })}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">Nenhuma manchete encontrada</p>
          )}
        </div>
      </div>

      {/* ── Content panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-4">
              <Newspaper size={22} className="text-orange-500" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Selecione uma manchete</p>
            <p className="text-xs text-gray-400 max-w-xs">Escolha um artigo à esquerda para gerar conteúdo adaptado ao seu perfil e público</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Article header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">
                      {showTranslated && translated ? translated.title : selected.title}
                    </p>
                    {showTranslated && (
                      <span className="shrink-0 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">PT</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {showTranslated && translated
                      ? translated.description.slice(0, 160)
                      : stripHtml(selected.description || '').slice(0, 160)}...
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={translate}
                    disabled={translating || !apiKey}
                    className={clsx(
                      'flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                      showTranslated
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                    )}
                    title={showTranslated ? 'Ver original (EN)' : 'Traduzir para português'}
                  >
                    {translating
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Languages size={13} />}
                    {showTranslated ? 'EN' : 'PT'}
                  </button>
                  <a
                    href={selected.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Abrir artigo original"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => { setSelected(null); setResult(''); setGenError('') }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Format selector */}
              <div className="flex gap-2 mt-3">
                {FORMATS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setFormat(f.id); setResult(''); setGenError('') }}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      format === f.id
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-700'
                    )}
                  >
                    <f.icon size={12} />
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={generate}
                disabled={generating || !apiKey}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-orange-200"
              >
                {generating
                  ? <><Loader2 size={13} className="animate-spin" /> Gerando...</>
                  : <><Sparkles size={13} /> Gerar {FORMATS.find(f => f.id === format)?.label}</>}
              </button>
              {!apiKey && (
                <p className="text-[11px] text-red-500 mt-1">Configure sua API key em Configurações.</p>
              )}
            </div>

            {/* Result */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {genError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{genError}</div>
              )}
              {result && (
                <div className="relative">
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {FORMATS.find(f => f.id === format)?.label}
                      </span>
                      <button
                        onClick={copy}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-600 transition-colors"
                      >
                        {copied ? <><Check size={12} className="text-emerald-500" /> Copiado</> : <><Copy size={12} /> Copiar</>}
                      </button>
                    </div>
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{result}</div>
                  </div>
                  <button
                    onClick={generate}
                    disabled={generating}
                    className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-600 transition-colors"
                  >
                    <RefreshCw size={11} /> Gerar novamente
                  </button>
                </div>
              )}
              {!result && !genError && !generating && (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-400">
                    Escolha um formato e clique em Gerar para criar conteúdo baseado nessa manchete
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
