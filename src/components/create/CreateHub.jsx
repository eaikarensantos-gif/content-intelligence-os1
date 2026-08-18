import { lazy, Suspense, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PenTool, Brain, Sparkles, Wand2, Megaphone, Calendar, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import UnifiedCreator from './UnifiedCreator'

const ThoughtCapture = lazy(() => import('../thoughts/ThoughtCapture'))
const IdeaGenerator = lazy(() => import('../generate/IdeaGenerator'))
const TextStudio = lazy(() => import('../text/TextStudio'))
const BriefingStudio = lazy(() => import('../brand/BriefingStudio'))
const WeeklyPlanner = lazy(() => import('../analytics/WeeklyPlanner'))

// Cada ferramenta mantém a identidade visual (ícone/cor) já usada no seu
// próprio cabeçalho, pra reconhecimento consistente entre a aba e o conteúdo.
const TOOLS = [
  { id: 'criar', label: 'Criar', desc: 'Reels, carrossel, caption, thread, stories', icon: PenTool, accent: 'orange' },
  { id: 'thoughts', label: 'Captura de Pensamento', desc: 'Um pensamento → 7 formatos de uma vez', icon: Brain, accent: 'indigo' },
  { id: 'generate', label: 'Explorador de Ideias', desc: 'Ideias com estrutura narrativa e controle criativo', icon: Sparkles, accent: 'amber' },
  { id: 'text', label: 'Adaptador Multi-plataforma', desc: 'Um texto → versões para cada rede', icon: Wand2, accent: 'violet' },
  { id: 'briefing', label: 'Briefing Studio', desc: 'PDF/briefing → roteiros estratégicos', icon: Megaphone, accent: 'red' },
  { id: 'planner', label: 'Planejador Semanal', desc: 'Plano de conteúdo baseado em dados reais', icon: Calendar, accent: 'pink' },
]

const TOOL_IDS = new Set(TOOLS.map((t) => t.id))

const ACCENT = {
  orange: { active: 'bg-orange-50 border-orange-300 text-orange-700', icon: 'text-orange-500' },
  indigo: { active: 'bg-indigo-50 border-indigo-300 text-indigo-700', icon: 'text-indigo-500' },
  amber:  { active: 'bg-amber-50 border-amber-300 text-amber-700', icon: 'text-amber-500' },
  violet: { active: 'bg-violet-50 border-violet-300 text-violet-700', icon: 'text-violet-500' },
  red:    { active: 'bg-red-50 border-red-300 text-red-700', icon: 'text-red-500' },
  pink:   { active: 'bg-pink-50 border-pink-300 text-pink-700', icon: 'text-pink-500' },
}

function ToolLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="animate-spin text-gray-300" size={24} />
    </div>
  )
}

export default function CreateHub({ persona = 'trabalho' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tool')
  const active = TOOL_IDS.has(requested) ? requested : 'criar'
  // Cada aba só monta na primeira visita, mas depois fica montada (display:none
  // quando inativa) — trocar de aba não perde rascunho nem histórico da sessão.
  const [visited, setVisited] = useState(() => new Set([active]))

  const goTo = (id) => {
    if (!visited.has(id)) setVisited((prev) => new Set(prev).add(id))
    const next = new URLSearchParams(searchParams)
    if (id === 'criar') next.delete('tool')
    else next.set('tool', id)
    setSearchParams(next)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-3">
          <div className="flex gap-2 overflow-x-auto sm:grid sm:grid-cols-6 sm:overflow-visible -mx-1 px-1 pb-1 sm:pb-0 sm:mx-0 sm:px-0">
            {TOOLS.map((t) => {
              const Icon = t.icon
              const a = ACCENT[t.accent]
              const isActive = active === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => goTo(t.id)}
                  className={clsx(
                    'flex items-start gap-2 text-left p-2.5 rounded-xl border transition-all shrink-0 min-w-[168px] sm:min-w-0',
                    isActive ? a.active : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <Icon size={16} className={clsx('shrink-0 mt-0.5', isActive ? a.icon : 'text-gray-400')} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{t.label}</div>
                    <div className="text-[10px] text-gray-400 truncate">{t.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {visited.has('criar') && (
          <div className="h-full" hidden={active !== 'criar'}>
            <UnifiedCreator persona={persona} />
          </div>
        )}
        {visited.has('thoughts') && (
          <div className="h-full" hidden={active !== 'thoughts'}>
            <Suspense fallback={<ToolLoader />}><ThoughtCapture /></Suspense>
          </div>
        )}
        {visited.has('generate') && (
          <div className="h-full" hidden={active !== 'generate'}>
            <Suspense fallback={<ToolLoader />}><IdeaGenerator /></Suspense>
          </div>
        )}
        {visited.has('text') && (
          <div className="h-full" hidden={active !== 'text'}>
            <Suspense fallback={<ToolLoader />}><TextStudio /></Suspense>
          </div>
        )}
        {visited.has('briefing') && (
          <div className="h-full" hidden={active !== 'briefing'}>
            <Suspense fallback={<ToolLoader />}><BriefingStudio /></Suspense>
          </div>
        )}
        {visited.has('planner') && (
          <div className="h-full p-4 sm:p-6" hidden={active !== 'planner'}>
            <Suspense fallback={<ToolLoader />}><WeeklyPlanner /></Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
