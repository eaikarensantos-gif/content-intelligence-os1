import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Lightbulb, Radar, BarChart2,
  Zap, ChevronRight, Video, Brain,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/ideas', icon: Lightbulb, label: 'Hub de Ideias' },
  { to: '/trends', icon: Radar, label: 'Creator Insights' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/video', icon: Video, label: 'Analisador de Vídeo' },
  { to: '/thoughts', icon: Brain, label: 'Thought Capture' },
]

export default function Sidebar() {
  const ideas = useStore((s) => s.ideas)
  const readyCount = ideas.filter((i) => i.status === 'ready').length

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-orange-50 border-r border-orange-100 flex flex-col">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-orange-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-none">Content</div>
            <div className="text-xs text-orange-600 font-medium mt-0.5">Intelligence OS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                isActive
                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="flex-1">{label}</span>
                {label === 'Hub de Ideias' && readyCount > 0 && (
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    {readyCount}
                  </span>
                )}
                {isActive && <ChevronRight size={12} className="text-orange-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-5 pt-3 border-t border-orange-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white">
            CU
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-800 truncate">Usuário Criador</div>
            <div className="text-[10px] text-gray-400">Plano Pro</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
