import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import LoginGate from './components/auth/LoginGate'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import FavoritesDrawer from './components/favorites/FavoritesPanel'
import FloatingActions from './components/global/FloatingActions'
import CommandPalette from './components/common/CommandPalette'
import useStore from './store/useStore'
import { isSupabaseConfigured } from './lib/supabase'

// Route pages are code-split so the initial bundle stays small; each loads on
// demand when its route is first visited.
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'))
const IdeasHub = lazy(() => import('./components/ideas/IdeasHub'))
const TrendRadar = lazy(() => import('./components/trends/TrendRadar'))
const Analytics = lazy(() => import('./components/analytics/Analytics'))
const SocialDashboard = lazy(() => import('./components/analytics/SocialDashboard'))
const AudienceAnalytics = lazy(() => import('./components/analytics/AudienceAnalytics'))
const VideoAnalyzer = lazy(() => import('./components/video/VideoAnalyzer'))
const CreateHub = lazy(() => import('./components/create/CreateHub'))
const PresentationMode = lazy(() => import('./components/presentation/PresentationMode'))
const ContentDNA = lazy(() => import('./components/dna/ContentDNA'))
const AccessLog = lazy(() => import('./components/auth/AccessLog'))
const AdManager = lazy(() => import('./components/ads/AdManager'))
const CarouselStudio = lazy(() => import('./components/trends/CarouselStudio'))
const TaskBoard = lazy(() => import('./components/tasks/TaskBoard'))
const NaomiStudio = lazy(() => import('./components/naomi/NaomiStudio'))
const SupabaseSettings = lazy(() => import('./components/settings/SupabaseSettings'))
const InstagramCallback = lazy(() => import('./components/settings/InstagramCallback'))
const GoogleCalendarCallback = lazy(() => import('./components/settings/GoogleCalendarCallback'))
const InstagramStudio = lazy(() => import('./components/instagram/InstagramStudio'))
const DmAutomation = lazy(() => import('./components/instagram/DmAutomation'))
const VideoSwipe = lazy(() => import('./components/video-swipe/VideoSwipe'))
const ReportsPage = lazy(() => import('./components/reports/ReportsPage'))
const BrandVoiceSetup = lazy(() => import('./components/brand/BrandVoiceSetup'))
const PositioningStudio = lazy(() => import('./components/positioning/PositioningStudio'))
const DesafioSorteador = lazy(() => import('./components/desafio/DesafioSorteador'))
const WebClipper = lazy(() => import('./components/clipper/WebClipper'))
const NewsGenerator = lazy(() => import('./components/news/NewsGenerator'))
const PDFContentGenerator = lazy(() => import('./components/pdf/PDFContentGenerator'))
const CommunityStudio = lazy(() => import('./components/community/CommunityStudio'))

// As antigas rotas soltas (/thoughts, /generate, /text, /briefing) agora vivem
// como abas dentro do Studio de Criação — isso preserva links e favoritos
// existentes (inclusive com querystring, ex. /generate?context=...) em vez de
// quebrá-los.
function ToolRedirect({ tool }) {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set('tool', tool)
  return <Navigate to={`/create?${params.toString()}`} replace />
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full py-20">
      <Loader2 className="animate-spin text-violet-500" size={28} />
    </div>
  )
}

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Atalho global Cmd/Ctrl+K para a busca
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} onSearchClick={() => setSearchOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

export default function App() {
  const loadFromDB = useStore((s) => s.loadFromDB)
  const theme = useStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    const resize = (el) => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
    const onInput = (e) => { if (e.target.tagName === 'TEXTAREA') resize(e.target) }
    const init = () => document.querySelectorAll('textarea').forEach(resize)
    if (!CSS.supports('field-sizing', 'content')) {
      document.addEventListener('input', onInput)
      const obs = new MutationObserver(init)
      obs.observe(document.body, { childList: true, subtree: true })
      init()
      return () => { document.removeEventListener('input', onInput); obs.disconnect() }
    }
  }, [])

  useEffect(() => {
    if (isSupabaseConfigured()) loadFromDB()
  }, [])

  return (
    <LoginGate>
      <BrowserRouter>
        <FavoritesDrawer />
        <FloatingActions />
        <Layout>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ideas" element={<IdeasHub />} />
            <Route path="/trends" element={<TrendRadar />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/social" element={<SocialDashboard />} />
            <Route path="/audience" element={<div className="p-6 animate-fade-in"><AudienceAnalytics /></div>} />
            <Route path="/video" element={<VideoAnalyzer />} />
            {/* key força remount ao trocar de rota — sem ele o React reaproveita a
                instância e o estado de um estúdio vaza pro outro */}
            <Route path="/create" element={<CreateHub key="trabalho" />} />
            <Route path="/create-pessoal" element={<CreateHub key="pessoal" persona="pessoal" />} />
            <Route path="/thoughts" element={<ToolRedirect tool="thoughts" />} />
            <Route path="/text" element={<ToolRedirect tool="text" />} />
            <Route path="/generate" element={<ToolRedirect tool="generate" />} />
            <Route path="/briefing" element={<ToolRedirect tool="briefing" />} />
            <Route path="/presentation" element={<PresentationMode />} />
            <Route path="/dna" element={<ContentDNA />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/brand-voice" element={<BrandVoiceSetup />} />
            <Route path="/posicionamento" element={<PositioningStudio />} />
            <Route path="/ads" element={<AdManager />} />
            <Route path="/carousel" element={<div className="p-6 animate-fade-in"><CarouselStudio /></div>} />
            <Route path="/security" element={<AccessLog />} />
            <Route path="/settings" element={<SupabaseSettings />} />
            <Route path="/instagram-callback" element={<InstagramCallback />} />
            <Route path="/google-calendar-callback" element={<GoogleCalendarCallback />} />
            <Route path="/instagram" element={<InstagramStudio />} />
            <Route path="/dm-automation" element={<DmAutomation />} />
            <Route path="/tasks" element={<div className="p-6 animate-fade-in"><TaskBoard /></div>} />
            <Route path="/naomi" element={<NaomiStudio />} />
            <Route path="/clipper" element={<WebClipper />} />
            <Route path="/news" element={<NewsGenerator />} />
            <Route path="/pdf-studio" element={<div className="p-0 animate-fade-in"><PDFContentGenerator /></div>} />
            <Route path="/community" element={<CommunityStudio />} />
            <Route path="/swipe" element={<VideoSwipe />} />
            <Route path="/desafio" element={<DesafioSorteador />} />
            {/* Rotas desconhecidas voltam ao Dashboard em vez de tela em branco */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </LoginGate>
  )
}
