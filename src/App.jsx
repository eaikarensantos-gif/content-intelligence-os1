import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginGate from './components/auth/LoginGate'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import IdeasHub from './components/ideas/IdeasHub'
import TrendRadar from './components/trends/TrendRadar'
import SocialDashboard from './components/analytics/SocialDashboard'
import AudienceAnalytics from './components/analytics/AudienceAnalytics'
import VideoAnalyzer from './components/video/VideoAnalyzer'
import ThoughtCapture from './components/thoughts/ThoughtCapture'
import TextStudio from './components/text/TextStudio'
import IdeaGenerator from './components/generate/IdeaGenerator'
import CreateContent from './components/create/CreateContent'
import UnifiedCreator from './components/create/UnifiedCreator'
import PresentationMode from './components/presentation/PresentationMode'
import ContentDNA from './components/dna/ContentDNA'
import AccessLog from './components/auth/AccessLog'
import AdManager from './components/ads/AdManager'
import PerformanceReport from './components/reports/PerformanceReport'
import CarouselStudio from './components/trends/CarouselStudio'
import FavoritesDrawer from './components/favorites/FavoritesPanel'
import FloatingActions from './components/global/FloatingActions'
import CommandPalette from './components/common/CommandPalette'
import NaomiStudio from './components/naomi/NaomiStudio'
import WebClipper from './components/clipper/WebClipper'
import NewsGenerator from './components/news/NewsGenerator'
import PDFContentGenerator from './components/pdf/PDFContentGenerator'
import CommunityStudio from './components/community/CommunityStudio'
import VideoSwipe from './components/video-swipe/VideoSwipe'
import SupabaseSettings from './components/settings/SupabaseSettings'
import TaskBoard from './components/tasks/TaskBoard'
import ContentBrain from './components/brain/ContentBrain'
import useStore from './store/useStore'
import { isSupabaseConfigured } from './lib/supabase'

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
          <Routes>
            <Route path="/" element={<Navigate to="/social" replace />} />
            <Route path="/dashboard" element={<Navigate to="/social" replace />} />
            <Route path="/ideas" element={<IdeasHub />} />
            <Route path="/trends" element={<TrendRadar />} />
            <Route path="/analytics" element={<Navigate to="/social" replace />} />
            <Route path="/social" element={<SocialDashboard />} />
            <Route path="/audience" element={<div className="p-6 animate-fade-in"><AudienceAnalytics /></div>} />
            <Route path="/video" element={<VideoAnalyzer />} />
            <Route path="/create" element={<UnifiedCreator />} />
            <Route path="/create-legacy" element={<CreateContent />} />
            <Route path="/thoughts" element={<ThoughtCapture />} />
            <Route path="/text" element={<TextStudio />} />
            <Route path="/generate" element={<IdeaGenerator />} />
            <Route path="/presentation" element={<PresentationMode />} />
            <Route path="/dna" element={<ContentDNA />} />
            <Route path="/ads" element={<AdManager />} />
            <Route path="/reports" element={<PerformanceReport />} />
            <Route path="/carousel" element={<div className="p-6 animate-fade-in"><CarouselStudio /></div>} />
            <Route path="/security" element={<AccessLog />} />
            <Route path="/settings" element={<SupabaseSettings />} />
            <Route path="/naomi" element={<NaomiStudio />} />
            <Route path="/clipper" element={<WebClipper />} />
            <Route path="/news" element={<NewsGenerator />} />
            <Route path="/pdf-studio" element={<div className="p-0 animate-fade-in"><PDFContentGenerator /></div>} />
            <Route path="/tasks" element={<div className="p-6 animate-fade-in"><TaskBoard /></div>} />
            <Route path="/brain" element={<ContentBrain />} />
            <Route path="/community" element={<CommunityStudio />} />
            <Route path="/swipe" element={<VideoSwipe />} />
            {/* Rotas desconhecidas voltam à home em vez de tela em branco */}
            <Route path="*" element={<Navigate to="/social" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LoginGate>
  )
}
