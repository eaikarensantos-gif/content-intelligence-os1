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
import CarouselStudio from './components/trends/CarouselStudio'
import FavoritesDrawer from './components/favorites/FavoritesPanel'
import FloatingActions from './components/global/FloatingActions'
import TaskBoard from './components/tasks/TaskBoard'
import NaomiStudio from './components/naomi/NaomiStudio'
import WebClipper from './components/clipper/WebClipper'
import SupabaseSettings from './components/settings/SupabaseSettings'
import CourseBuilder from './components/courses/CourseBuilder'
import CourseDetail from './components/courses/CourseDetail'
import LessonEditor from './components/courses/LessonEditor'
import GenerateLesson from './components/courses/GenerateLesson'
import useStore from './store/useStore'
import { isSupabaseConfigured } from './lib/supabase'

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
            <Route path="/carousel" element={<div className="p-6 animate-fade-in"><CarouselStudio /></div>} />
            <Route path="/security" element={<AccessLog />} />
            <Route path="/settings" element={<SupabaseSettings />} />
            <Route path="/tasks" element={<div className="p-6 animate-fade-in"><TaskBoard /></div>} />
            <Route path="/naomi" element={<NaomiStudio />} />
            <Route path="/clipper" element={<WebClipper />} />
            <Route path="/courses" element={<CourseBuilder />} />
            <Route path="/courses/:courseId" element={<CourseDetail />} />
            <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonEditor />} />
            <Route path="/gerar-aula" element={<div className="p-6 animate-fade-in"><GenerateLesson /></div>} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LoginGate>
  )
}
