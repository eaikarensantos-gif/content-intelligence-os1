import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import Dashboard from './components/dashboard/Dashboard'
import IdeasHub from './components/ideas/IdeasHub'
import KanbanBoard from './components/kanban/KanbanBoard'
import TrendRadar from './components/trends/TrendRadar'
import Analytics from './components/analytics/Analytics'
import InsightEngine from './components/insights/InsightEngine'
import IdeaLoop from './components/idealoop/IdeaLoop'
import AISettings from './components/settings/AISettings'

function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
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
          <Route path="/kanban" element={<KanbanBoard />} />
          <Route path="/trends" element={<TrendRadar />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/insights" element={<InsightEngine />} />
          <Route path="/loop" element={<IdeaLoop />} />
          <Route path="/settings" element={<AISettings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
