import { useLocation, Link } from 'react-router-dom'
import { Heart, Search, Menu, ChevronRight, Sun, Moon } from 'lucide-react'
import useStore from '../../store/useStore'

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
  '/reports': { title: 'Relatórios de Performance', sub: 'Analise dados exportados do Instagram, LinkedIn e TikTok' },
  '/security': { title: 'Registro de Acessos', sub: 'Histórico completo de logins e tentativas' },
  '/create': { title: 'Studio de Criação', sub: 'Escolha como quer começar sua criação' },
  '/carousel': { title: 'Carousel Studio', sub: 'Roteiros de carrossel com potencial viral', parent: '/create' },
  '/thoughts': { title: 'Thought Capture', sub: 'Transforme pensamentos em conteúdo estruturado', parent: '/create' },
  '/text': { title: 'Text Studio', sub: 'Adapte qualquer texto para cada plataforma com IA', parent: '/create' },
  '/generate': { title: 'Gerador de Ideias', sub: 'Ideias autênticas com estrutura narrativa e controle criativo', parent: '/create' },
  '/presentation': { title: 'Modo Apresentação', sub: 'Transforme ideias em talks com roteiro em linguagem falada', parent: '/create' },
  '/brand-voice': { title: 'Minha Voz', sub: 'Configure seu tom, estilo e identidade de conteúdo' },
}

const CREATE_ROUTES = new Set(['/thoughts', '/text', '/generate', '/presentation', '/carousel'])

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation()
  const info = TITLES[pathname] || TITLES['/']
  const isCreateChild = CREATE_ROUTES.has(pathname)
  const favorites = useStore((s) => s.favorites)
  const unseenFavorites = useStore((s) => s.unseenFavorites)
  const toggleFavorites = useStore((s) => s.toggleFavorites)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  return (
    <header className="h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-20 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
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
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-orange-500 transition-colors"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          onClick={toggleFavorites}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors relative"
          aria-label="Abrir favoritos"
        >
          <Heart size={15} className={favorites.length > 0 ? 'fill-red-500 text-red-500' : ''} />
          {unseenFavorites > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center px-1 text-[9px] font-bold bg-red-500 text-white rounded-full">
              {unseenFavorites}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
