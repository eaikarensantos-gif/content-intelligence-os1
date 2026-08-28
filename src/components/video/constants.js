import { Link2, BookOpen, Lightbulb, Layers, Eye, Mic, Target, Star, FileVideo, FileText, Upload, AlignLeft } from 'lucide-react'

export const CDN = '/ffmpeg'

export const LS_KEY = 'cio-openai-key'
export const LS_KEY_GROQ = 'cio-groq-key'

export const INPUT_MODES = [
  { id: 'url', label: 'URL do Vídeo', icon: Link2 },
  { id: 'file', label: 'Upload de Arquivo', icon: FileVideo },
  { id: 'transcript', label: 'Colar Transcrição', icon: FileText },
]

export const TABS = [
  { id: 'resumo', label: 'Resumo', icon: AlignLeft },
  { id: 'estrutura', label: 'Estrutura', icon: Layers },
  { id: 'tom', label: 'Tom & Padrões', icon: Mic },
  { id: 'retencao', label: 'Retenção', icon: Eye },
  { id: 'porque', label: 'Por Que Funciona', icon: Star },
  { id: 'template', label: 'Template', icon: BookOpen },
  { id: 'ideias', label: 'Ideias', icon: Lightbulb },
  { id: 'transcricao', label: 'Transcrição', icon: FileText },
]

export const MY_VIDEO_TABS = [
  { id: 'resumo', label: 'Resumo', icon: AlignLeft },
  { id: 'estrutura', label: 'Estrutura', icon: Layers },
  { id: 'tom', label: 'Tom & Padrões', icon: Mic },
  { id: 'retencao', label: 'Retenção', icon: Eye },
  { id: 'porque', label: 'Por Que Funciona', icon: Star },
  { id: 'template', label: 'Template', icon: BookOpen },
  { id: 'ideias', label: 'Ideias', icon: Lightbulb },
  { id: 'transcricao', label: 'Transcrição', icon: FileText },
  { id: 'melhorar', label: 'O que Melhorar', icon: Target },
]

export const TYPE_OPTIONS = [
  { value: 'auto', label: 'Detectar automaticamente' },
  { value: 'educational', label: 'Educacional / Tutorial' },
  { value: 'storytelling', label: 'Storytelling / Pessoal' },
  { value: 'contrarian', label: 'Contrário / Opinião' },
  { value: 'listicle', label: 'Lista / Breakdown' },
  { value: 'motivational', label: 'Motivacional' },
  { value: 'humorous', label: 'Humor / Entretenimento' },
]

export const ARCHETYPE_COLORS = {
  educational: 'bg-blue-100 text-blue-700 border-blue-200',
  storytelling: 'bg-purple-100 text-purple-700 border-purple-200',
  contrarian: 'bg-red-100 text-red-700 border-red-200',
  listicle: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  tutorial: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  motivational: 'bg-orange-100 text-orange-700 border-orange-200',
  humorous: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}
export const ARCHETYPE_LABELS = {
  educational: 'Educacional', storytelling: 'Storytelling', contrarian: 'Contrário',
  listicle: 'Lista', tutorial: 'Tutorial', motivational: 'Motivacional', humorous: 'Humor',
}
