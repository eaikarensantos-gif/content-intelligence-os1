import clsx from 'clsx'

const PLATFORM_COLORS = {
  linkedin: 'bg-blue-100 text-blue-700 border-blue-200',
  instagram: 'bg-pink-100 text-pink-700 border-pink-200',
  tiktok: 'bg-gray-100 text-gray-700 border-gray-200',
  youtube: 'bg-red-100 text-red-700 border-red-200',
  twitter: 'bg-sky-100 text-sky-700 border-sky-200',
}

const PRIORITY_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' }
const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

const STATUS_LABELS = { idea: 'Ideia', draft: 'Rascunho', ready: 'Pronto', published: 'Publicado' }
const STATUS_COLORS = {
  idea: 'bg-orange-100 text-orange-700 border-orange-200',
  draft: 'bg-blue-100 text-blue-700 border-blue-200',
  ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  published: 'bg-green-100 text-green-700 border-green-200',
}

const FORMAT_LABELS = {
  carousel: 'Carrossel', carrossel: 'Carrossel',
  thread: 'Thread', video: 'Vídeo',
  reel: 'Reel', article: 'Artigo', artigo: 'Artigo',
  story: 'Story', podcast: 'Podcast',
}
const FORMAT_COLORS = {
  carousel: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  carrossel: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  thread: 'bg-sky-100 text-sky-700 border-sky-200',
  video: 'bg-red-100 text-red-700 border-red-200',
  reel: 'bg-pink-100 text-pink-700 border-pink-200',
  article: 'bg-amber-100 text-amber-700 border-amber-200',
  artigo: 'bg-amber-100 text-amber-700 border-amber-200',
  story: 'bg-orange-100 text-orange-700 border-orange-200',
  podcast: 'bg-teal-100 text-teal-700 border-teal-200',
}

const INSIGHT_LABELS = { format: 'Formato', hook: 'Gancho', platform: 'Plataforma', summary: 'Resumo', topic: 'Tópico' }
const INSIGHT_COLORS = {
  format: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  hook: 'bg-amber-100 text-amber-700 border-amber-200',
  platform: 'bg-blue-100 text-blue-700 border-blue-200',
  summary: 'bg-orange-100 text-orange-700 border-orange-200',
  topic: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export function PlatformBadge({ platform }) {
  return (
    <span className={clsx('chip border', PLATFORM_COLORS[platform] || 'bg-gray-100 text-gray-600 border-gray-200')}>
      {platform}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  return (
    <span className={clsx('chip border', PRIORITY_COLORS[priority] || PRIORITY_COLORS.low)}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  )
}

export function StatusBadge({ status }) {
  return (
    <span className={clsx('chip border', STATUS_COLORS[status] || STATUS_COLORS.idea)}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export function FormatBadge({ format }) {
  return (
    <span className={clsx('chip border', FORMAT_COLORS[format] || 'bg-slate-500/15 text-slate-400 border-slate-500/25')}>
      {FORMAT_LABELS[format] || format}
    </span>
  )
}

export function InsightTypeBadge({ type }) {
  return (
    <span className={clsx('chip border capitalize', INSIGHT_COLORS[type] || INSIGHT_COLORS.summary)}>
      {INSIGHT_LABELS[type] || type}
    </span>
  )
}
