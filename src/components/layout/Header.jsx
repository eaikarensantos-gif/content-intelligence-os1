import { useLocation, Link } from 'react-router-dom'
import { Bell, Search, Menu, ChevronRight } from 'lucide-react'

const TITLES = {
  '/': { title: 'Dashboard', sub: 'Visão geral da sua inteligência de conteúdo' },
  '/ideas': { title: 'Hub de Ideias', sub: 'Capture e organize suas ideias de conteúdo' },
  '/trends': { title: 'Creator Insights', sub: 'Tendências e criadores em alta no seu nicho' },
  '/analytics': { title: 'Analytics', sub: 'Acompanhe o desempenho dos seus posts' },
  '/video': { title: 'Analisador de Vídeo', sub: 'Analise e aprenda com vídeos de referência' },
  '/dna': { title: 'Content DNA', sub: 'Descubra os padrões que fazem seu conteúdo funcionar' },
  '/tasks': { title: 'Tarefas', sub: 'Organize suas tarefas do dia e acompanhe o progresso' },
  '/ads': { title: 'Publicidade', sub: 'Gerencie campanhas, orçamentos e acompanhe resultados' },
  '/archetypes': { title: 'Arquétipos de Conteúdo', sub: 'Extraia padrões de criadores e gere conteúdo baseado em arquétipos' },
  '/security': { title: 'Registro de Acessos', sub: 'Histórico completo de logins e tentativas' },
  '/create': { title: 'Criar Conteúdo', sub: 'Escolha como quer começar sua criação' },
  '/thoughts': { title: 'Thought Capture', sub: 'Transforme pensamentos em conteúdo estruturado', parent: '/create' },
  '/text': { title: 'Text Studio', sub: 'Adapte qualquer texto para cada plataforma com IA', parent: '/create' },
  '/generate': { title: 'Gerador de Ideias', sub: 'Ideias autênticas com estrutura narrativa e controle criativo', parent: '/create' },
  '/presentation': { title: 'Modo Apresentação', sub: 'Transforme ideias em talks com roteiro em linguagem falada', parent: '/create' },
}

const CREATE_ROUTES = new Set(['/thoughts', '/text', '/generate', '/presentation'])

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation()
  const info = TITLES[pathname] || TITLES['/']
  const isCreateChild = CREATE_ROUTES.has(pathname)

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
          {isCreateChild ? (
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-semibold leading-none truncate">
              <Link to="/create" className="text-orange-500 hover:text-orange-600 transition-colors">Criar</Link>
              <ChevronRight size={12} className="text-gray-300 shrink-0" />
              <span className="text-gray-900 truncate">{info.title}</span>
            </div>
          ) : (
            <h1 className="text-sm sm:text-base font-semibold text-gray-900 leading-none truncate">{info.title}</h1>
          )}
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
