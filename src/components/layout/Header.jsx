import { useLocation, Link } from 'react-router-dom'
import { Bell, Search, FileText } from 'lucide-react'

const TITLES = {
  '/': { title: 'Dashboard', sub: 'Your content intelligence overview' },
  '/ideas': { title: 'Ideas Hub', sub: 'Capture and organize content ideas' },
  '/kanban': { title: 'Content Board', sub: 'Plan and manage your content pipeline' },
  '/trends': { title: 'Trend Radar', sub: 'Discover what\'s working in your niche' },
  '/analytics': { title: 'Analytics', sub: 'Track and analyze post performance' },
  '/reports': { title: 'Relatórios Dinâmicos', sub: 'Análise completa e interativa de métricas do Instagram' },
  '/insights': { title: 'Insight Engine', sub: 'AI-generated insights from your data' },
  '/loop': { title: 'Idea Loop', sub: 'Generate new ideas powered by your analytics' },
}

export default function Header() {
  const { pathname } = useLocation()
  const info = TITLES[pathname] || TITLES['/']

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-gray-200 bg-white/90 backdrop-blur-sm sticky top-0 z-20">
      <div>
        <h1 className="text-base font-semibold text-gray-900 leading-none">{info.title}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{info.sub}</p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/reports"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
            pathname === '/reports'
              ? 'bg-orange-500 text-white'
              : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
          }`}
        >
          <FileText size={16} />
          <span className="hidden sm:inline">Relatórios</span>
        </Link>
        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <Search size={15} />
        </button>
        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors relative">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
