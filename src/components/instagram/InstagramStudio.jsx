import { useEffect, useMemo, useState } from 'react'
import {
  Instagram, RefreshCw, Loader2, ExternalLink, Heart, MessageCircle, Bookmark, Repeat2, Eye, Users, Clock,
  LayoutGrid, List, Search, Download, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getConnection } from '../../lib/instagramAuth'
import { instagramFetchPosts, instagramFetchComments } from '../../lib/aiService'
import Modal from '../common/Modal'
import AccountOverview from './AccountOverview'
import StoriesGrid from './StoriesGrid'
import WeeklyPlanner from '../analytics/WeeklyPlanner'

const POST_TYPE_LABEL = { reel: 'Reel', carousel: 'Carrossel', image: 'Foto', video: 'Vídeo' }

function StatChip({ icon: Icon, value, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500" title={label}>
      <Icon size={11} /> {value.toLocaleString('pt-BR')}
    </span>
  )
}

const engagementOf = (p) => (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0)
const impressionsOf = (p) => p.views || p.reach || 0
const engagementRateOf = (p) => {
  const imp = impressionsOf(p)
  return imp ? engagementOf(p) / imp : 0
}

const SORT_COLS = [
  { key: 'date', label: 'Data' },
  { key: 'postType', label: 'Tipo' },
  { key: 'description', label: 'Descrição', sortable: false },
  { key: 'views', label: 'Visualizações' },
  { key: 'reach', label: 'Alcance' },
  { key: 'likes', label: 'Curtidas' },
  { key: 'comments', label: 'Coment.' },
  { key: 'shares', label: 'Compart.' },
  { key: 'saves', label: 'Salvam.' },
  { key: 'engagement', label: 'Eng.' },
  { key: 'engagementRate', label: 'Taxa Eng.' },
]

function sortValue(post, key) {
  if (key === 'date') return post.timestamp || ''
  if (key === 'views') return impressionsOf(post)
  if (key === 'engagement') return engagementOf(post)
  if (key === 'engagementRate') return engagementRateOf(post)
  return post[key] ?? 0
}

export default function InstagramStudio() {
  const connection = getConnection()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [posts, setPosts] = useState(null)
  const [insightsAvailable, setInsightsAvailable] = useState(true)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('posts')
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  const availableTypes = useMemo(
    () => Array.from(new Set((posts || []).map((p) => p.postType).filter(Boolean))),
    [posts]
  )

  const filteredSorted = useMemo(() => {
    if (!posts) return []
    const q = search.trim().toLowerCase()
    const filtered = posts.filter((p) => {
      if (filterType && p.postType !== filterType) return false
      if (!q) return true
      return (
        (p.caption || '').toLowerCase().includes(q) ||
        (p.postType || '').toLowerCase().includes(q) ||
        (p.timestamp || '').toLowerCase().includes(q)
      )
    })
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortBy)
      const bv = sortValue(b, sortBy)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [posts, search, filterType, sortBy, sortDir])

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('desc') }
  }

  const exportCSV = () => {
    const headers = ['Data', 'Tipo', 'Descrição', 'Visualizações', 'Alcance', 'Curtidas', 'Comentários', 'Compartilhamentos', 'Salvamentos', 'Engajamento', 'Taxa Eng.%', 'Link']
    const rows = filteredSorted.map((p) => [
      p.timestamp ? new Date(p.timestamp).toLocaleString('pt-BR') : '',
      POST_TYPE_LABEL[p.postType] || p.postType || '',
      (p.caption || '').replace(/"/g, '""'),
      impressionsOf(p),
      p.reach || 0,
      p.likes || 0,
      p.comments || 0,
      p.shares || 0,
      p.saves || 0,
      engagementOf(p),
      (engagementRateOf(p) * 100).toFixed(2),
      p.permalink || '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `instagram_posts_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fetchPosts = async () => {
    if (!connection) return
    setLoading(true)
    setError(null)
    try {
      const { posts: fetched, insightsAvailable: ia } = await instagramFetchPosts(connection.accessToken)
      setPosts(fetched)
      setInsightsAvailable(ia)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!connection) {
    return (
      <div className="p-6 max-w-2xl animate-fade-in">
        <div className="card p-8 text-center space-y-3">
          <Instagram size={32} className="text-pink-400 mx-auto" />
          <p className="text-sm text-gray-700">Nenhuma conta do Instagram conectada ainda.</p>
          <Link to="/settings" className="btn-primary inline-flex">Conectar Instagram</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Instagram size={18} className="text-pink-500" /> Posts do Instagram
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            @{connection.accounts?.[0]?.username || connection.accounts?.[0]?.id}
          </p>
        </div>
        {tab === 'posts' && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setView('grid')}
                className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Visão em grade"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Visão em lista"
              >
                <List size={14} />
              </button>
            </div>
            <button onClick={fetchPosts} disabled={loading} className="btn-secondary text-xs">
              {loading ? <><Loader2 size={13} className="animate-spin" /> Atualizando...</> : <><RefreshCw size={13} /> Atualizar</>}
            </button>
          </div>
        )}
      </div>

      <AccountOverview accessToken={connection.accessToken} />

      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-5 w-fit">
        {[['posts', 'Posts'], ['stories', 'Stories'], ['planner', 'Planejamento']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`text-xs px-4 py-1.5 rounded-md font-medium transition-all ${
              tab === id ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'stories' && <StoriesGrid accessToken={connection.accessToken} />}

      {tab === 'planner' && <WeeklyPlanner />}

      {tab === 'posts' && (
      <>
      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      {!insightsAvailable && posts && (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg p-2.5 border border-amber-200 mb-4">
          ⚠️ Conexão sem permissão de Insights — alcance, visualizações, salvamentos e compartilhamentos não disponíveis. <Link to="/settings" className="underline">Reconecte o Instagram</Link> pra liberar esses números.
        </p>
      )}

      {loading && !posts && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-pink-400" />
        </div>
      )}

      {posts && posts.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">Nenhum post encontrado nessa conta.</p>
      )}

      {posts && posts.length > 0 && (
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por data, tipo, descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 px-2 py-1.5 rounded hover:bg-emerald-50 transition-colors"
              title={`Exportar ${filteredSorted.length} posts como CSV`}
            >
              <Download size={12} /> Exportar CSV
            </button>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterType('')}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                filterType === '' ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-500 border-gray-200 hover:border-pink-300 hover:text-pink-600'
              }`}
            >
              Todos
            </button>
            {availableTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  filterType === t ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-500 border-gray-200 hover:border-pink-300 hover:text-pink-600'
                }`}
              >
                {POST_TYPE_LABEL[t] || t}
              </button>
            ))}
            <span className="text-xs text-gray-400 self-center ml-1">
              {filteredSorted.length} {filteredSorted.length === 1 ? 'post' : 'posts'}{search || filterType ? ` (de ${posts.length})` : ''}
            </span>
          </div>
        </div>
      )}

      {posts && posts.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredSorted.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelected(post)}
              className="card p-0 overflow-hidden text-left hover:shadow-lg transition-shadow group"
            >
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {post.thumbnailUrl ? (
                  <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Instagram size={28} />
                  </div>
                )}
                <span className="absolute top-2 left-2 chip border text-[10px] bg-white/90 text-gray-700 border-gray-200 capitalize">
                  {POST_TYPE_LABEL[post.postType] || post.postType || 'Post'}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-[11px] text-gray-400">
                  {post.timestamp ? new Date(post.timestamp).toLocaleDateString('pt-BR') : ''}
                </p>
                {post.caption && (
                  <p className="text-xs text-gray-600 line-clamp-2">{post.caption}</p>
                )}
                <div className="flex flex-wrap gap-x-2.5 gap-y-1 pt-1 border-t border-gray-100">
                  <StatChip icon={Eye} value={post.views || post.reach} label="Visualizações" />
                  <StatChip icon={Users} value={post.reach} label="Alcance" />
                  <StatChip icon={Heart} value={post.likes} label="Curtidas" />
                  <StatChip icon={MessageCircle} value={post.comments} label="Comentários" />
                  <StatChip icon={Bookmark} value={post.saves} label="Salvamentos" />
                  <StatChip icon={Repeat2} value={post.shares} label="Compartilhamentos" />
                  {post.avgWatchTimeSec > 0 && (
                    <StatChip icon={Clock} value={post.avgWatchTimeSec} label="Tempo médio assistido (s)" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {posts && posts.length > 0 && view === 'list' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  {SORT_COLS.map((col) => (
                    <th
                      key={col.key}
                      className={`text-left py-2 px-2.5 text-gray-400 font-medium whitespace-nowrap select-none ${col.sortable === false ? '' : 'cursor-pointer hover:text-pink-600 transition-colors'}`}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                    >
                      <span className="inline-flex items-center">
                        {col.label}
                        {col.sortable !== false && (
                          sortBy !== col.key
                            ? <ChevronsUpDown size={10} className="text-gray-300 ml-0.5" />
                            : sortDir === 'asc'
                              ? <ChevronUp size={10} className="text-pink-500 ml-0.5" />
                              : <ChevronDown size={10} className="text-pink-500 ml-0.5" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((post) => (
                  <tr
                    key={post.id}
                    onClick={() => setSelected(post)}
                    className="border-b border-gray-100 hover:bg-pink-50/50 cursor-pointer group"
                  >
                    <td className="py-2 px-2.5 text-gray-400 whitespace-nowrap">
                      {post.timestamp ? new Date(post.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="py-2 px-2.5">
                      <span className="chip border text-[10px] bg-pink-50 text-pink-600 border-pink-200 capitalize">
                        {POST_TYPE_LABEL[post.postType] || post.postType || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 max-w-[240px]">
                      <div className="flex items-center gap-1.5">
                        {post.caption ? (
                          <span className="text-gray-500 truncate block" title={post.caption}>
                            {post.caption.slice(0, 60)}{post.caption.length > 60 ? '…' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                        {post.permalink && (
                          <a href={post.permalink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-600">
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2.5 text-gray-700">{impressionsOf(post).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-2.5 text-gray-500">{(post.reach || 0).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-2.5 text-gray-500">{(post.likes || 0).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-2.5 text-gray-500">{(post.comments || 0).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-2.5 text-gray-500">{(post.shares || 0).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-2.5 text-gray-500">{(post.saves || 0).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-2.5 text-gray-700 font-medium">{engagementOf(post).toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-2.5">
                      <span className={`font-semibold ${engagementRateOf(post) > 0.04 ? 'text-emerald-600' : engagementRateOf(post) > 0.02 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {(engagementRateOf(post) * 100).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}

      <PostDetailModal post={selected} accessToken={connection.accessToken} onClose={() => setSelected(null)} />
    </div>
  )
}

function PostDetailModal({ post, accessToken, onClose }) {
  const [comments, setComments] = useState(null)
  const [commentsError, setCommentsError] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)

  useEffect(() => {
    if (!post) { setComments(null); setCommentsError(null); return }
    setCommentsLoading(true)
    setCommentsError(null)
    instagramFetchComments(accessToken, post.id)
      .then(setComments)
      .catch((err) => setCommentsError(err.message))
      .finally(() => setCommentsLoading(false))
  }, [post, accessToken])

  if (!post) return null

  return (
    <Modal open={!!post} onClose={onClose} title={POST_TYPE_LABEL[post.postType] || 'Post'} maxWidth="max-w-xl">
      <div className="space-y-4">
        {post.thumbnailUrl && (
          <img src={post.thumbnailUrl} alt="" className="w-full max-h-64 object-cover rounded-xl" />
        )}
        {post.caption && <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.caption}</p>}

        <div className="flex flex-wrap gap-3 py-2 border-y border-gray-100">
          <StatChip icon={Eye} value={post.views || post.reach} label="Visualizações" />
          <StatChip icon={Users} value={post.reach} label="Alcance" />
          <StatChip icon={Heart} value={post.likes} label="Curtidas" />
          <StatChip icon={MessageCircle} value={post.comments} label="Comentários" />
          <StatChip icon={Bookmark} value={post.saves} label="Salvamentos" />
          <StatChip icon={Repeat2} value={post.shares} label="Compartilhamentos" />
          {post.avgWatchTimeSec > 0 && (
            <StatChip icon={Clock} value={post.avgWatchTimeSec} label="Tempo médio assistido (s)" />
          )}
        </div>

        {post.permalink && (
          <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-pink-600 hover:underline">
            <ExternalLink size={11} /> Ver no Instagram
          </a>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Comentários</p>
          {commentsLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
              <Loader2 size={13} className="animate-spin" /> Carregando comentários...
            </div>
          )}
          {commentsError && <p className="text-xs text-red-500">{commentsError}</p>}
          {comments && comments.length === 0 && (
            <p className="text-xs text-gray-400">Nenhum comentário ainda.</p>
          )}
          {comments && comments.length > 0 && (
            <div className="space-y-2.5 max-h-56 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="text-xs bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-gray-700">@{c.username || 'usuário'}</span>
                    <span className="text-gray-400">{c.timestamp ? new Date(c.timestamp).toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                  <p className="text-gray-600">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
