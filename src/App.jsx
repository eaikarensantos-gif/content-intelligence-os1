import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginGate from './components/auth/LoginGate'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import Dashboard from './components/dashboard/Dashboard'
import IdeasHub from './components/ideas/IdeasHub'
import TrendRadar from './components/trends/TrendRadar'
import Analytics from './components/analytics/Analytics'
import SocialDashboard from './components/analytics/SocialDashboard'
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
import TaskBoard from './components/tasks/TaskBoard'
import NaomiStudio from './components/naomi/NaomiStudio'
import SupabaseSettings from './components/settings/SupabaseSettings'
import useStore from './store/useStore'
import { isSupabaseConfigured } from './lib/supabase'

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
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
    if (isSupabaseConfigured()) loadFromDB()
  }, [])

  return (
    <LoginGate>
      <BrowserRouter>
        <FavoritesDrawer />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ideas" element={<IdeasHub />} />
            <Route path="/trends" element={<TrendRadar />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/social" element={<SocialDashboard />} />
            <Route path="/video" element={<VideoAnalyzer />} />
            <Route path="/create" element={<UnifiedCreator />} />
            <Route path="/create-legacy" element={<CreateContent />} />
            <Route path="/thoughts" element={<ThoughtCapture />} />
            <Route path="/text" element={<TextStudio />} />
            <Route path="/generate" element={<IdeaGenerator />} />
            <Route path="/presentation" element={<PresentationMode />} />
            <Route path="/dna" element={<ContentDNA />} />
            <Route path="/ads" element={<AdManager />} />
            {/* /archetypes, /briefing, /post-analyzer — arquivados */}
            <Route path="/carousel" element={<div className="p-6 animate-fade-in"><CarouselStudio /></div>} />
            <Route path="/reports" element={<PerformanceReport />} />
            <Route path="/security" element={<AccessLog />} />
            <Route path="/settings" element={<SupabaseSettings />} />
            <Route path="/tasks" element={<div className="p-6 animate-fade-in"><TaskBoard /></div>} />
            <Route path="/naomi" element={<NaomiStudio />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LoginGate>
  )
}
