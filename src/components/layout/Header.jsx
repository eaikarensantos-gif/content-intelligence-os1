import { useLocation } from 'react-router-dom'
import { Bell, Search, Menu } from 'lucide-react'

const TITLES = {
  '/': { title: 'Dashboard', sub: 'Visão geral da sua inteligência de conteúdo' },
  '/ideas': { title: 'Hub de Ideias', sub: 'Capture e organize suas ideias de conteúdo' },
  '/trends': { title: 'Creator Insights', sub: 'Tendências e criadores em alta no seu nicho' },
  '/analytics': { title: 'Analytics', sub: 'Acompanhe o desempenho dos seus posts' },
  '/video': { title: 'Analisador de Vídeo', sub: 'Analise e aprenda com vídeos de referência' },
  '/thoughts': { title: 'Thought Capture', sub: 'Transforme pensamentos em conteúdo estruturado' },
  '/text': { title: 'Text Studio', sub: 'Adapte qualquer texto para cada plataforma com IA' },
}

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation()
  const info = TITLES[pathname] || TITLES['/']

  return (
    <header className="h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-20 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-gray-900 leading-none truncate">{info.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5 hidden sm:block truncate">{info.sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
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
