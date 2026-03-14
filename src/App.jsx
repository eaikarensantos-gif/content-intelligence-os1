import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import Dashboard from './components/dashboard/Dashboard'
import IdeasHub from './components/ideas/IdeasHub'
import TrendRadar from './components/trends/TrendRadar'
import Analytics from './components/analytics/Analytics'
import VideoAnalyzer from './components/video/VideoAnalyzer'
import ThoughtCapture from './components/thoughts/ThoughtCapture'
import TextStudio from './components/text/TextStudio'

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
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ideas" element={<IdeasHub />} />
          <Route path="/trends" element={<TrendRadar />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/video" element={<VideoAnalyzer />} />
          <Route path="/thoughts" element={<ThoughtCapture />} />
          <Route path="/text" element={<TextStudio />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
