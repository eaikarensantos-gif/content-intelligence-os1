import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Lightbulb, Radar, BarChart2,
  Zap, ChevronRight, ChevronDown, Video, Wand2, X, PenTool, Mic,
  Download, Upload, Check, AlertCircle, Dna, FileText, Shield, ClipboardList, DollarSign, Shapes, FileBarChart, Megaphone,
} from 'lucide-react'
import clsx from 'clsx'
import useStore from '../../store/useStore'

// ── Grouped navigation structure ─────────────────────────────────────────────
const TOP_NAV = [
  { to: '/tasks', icon: ClipboardList, label: 'Tarefas' },
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/create', icon: PenTool, label: 'Studio de Criação' },
  { to: '/ideas', icon: Lightbulb, label: 'Hub de Ideias' },
]

const NAV_GROUPS = [
  {
    id: 'inteligencia',
    label: 'Inteligência',
    children: [
      { to: '/analytics', icon: BarChart2, label: 'Analytics' },
      { to: '/dna', icon: Dna, label: 'Content DNA' },
      { to: '/trends', icon: Radar, label: 'Creator Insights' },
    ],
  },
  {
    id: 'ferramentas',
    label: 'Ferramentas',
    children: [
      { to: '/video', icon: Video, label: 'Analisador de Vídeo' },
      { to: '/ads', icon: DollarSign, label: 'Publicidade' },
      { to: '/archetypes', icon: Shapes, label: 'Arquétipos' },
      { to: '/briefing', icon: Megaphone, label: 'Briefing Studio' },
      { to: '/post-analyzer', icon: BarChart2, label: 'Análise de Posts' },
    ],
  },
]

const BOTTOM_NAV = [
  { to: '/brand-voice', icon: Mic, label: 'Minha Voz' },
  { to: '/security', icon: Shield, label: 'Registro de Acessos' },
]

// Helper: find which group contains a given path
function findGroupForPath(pathname) {
  for (const g of NAV_GROUPS) {
    if (g.children.some((c) => c.to === pathname)) return g.id
  }
  return null
}

const STORE_KEY = 'content-intelligence-os-v3'
const API_KEYS = ['cio-anthropic-key', 'cio-groq-key']

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()
  const importRef = useRef(null)
  const [syncMsg, setSyncMsg] = useState(null) // { type: 'success'|'error', text }

  // Track which group is open — auto-expand the one containing current route
  const [openGroup, setOpenGroup] = useState(() => findGroupForPath(location.pathname))

  // Auto-expand group when route changes
  useEffect(() => {
    const g = findGroupForPath(location.pathname)
    if (g) setOpenGroup(g)
  }, [location.pathname])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose?.()
  }, [location.pathname])

  const toggleGroup = (id) => {
    setOpenGroup((prev) => (prev === id ? null : id))
  }

  // ── Export all data as JSON ──────────────────────────────────────────────────
  const handleExport = () => {
    try {
      const payload = {}
      // Main store
      const storeData = localStorage.getItem(STORE_KEY)
      if (storeData) payload.store = JSON.parse(storeData)
      // API keys
      API_KEYS.forEach(k => {
        const v = localStorage.getItem(k)
        if (v) payload[k] = v
      })
      payload._exported_at = new Date().toISOString()
      payload._version = 'cio-v3'

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `content-intelligence-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSyncMsg({ type: 'success', text: 'Dados exportados!' })
      setTimeout(() => setSyncMsg(null), 3000)
    } catch (e) {
      setSyncMsg({ type: 'error', text: 'Erro ao exportar' })
      setTimeout(() => setSyncMsg(null), 3000)
    }
  }

  // ── Import data from JSON ───────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.store && !data._version) throw new Error('Arquivo inválido')
        // Restore store
        if (data.store) {
          localStorage.setItem(STORE_KEY, JSON.stringify(data.store))
        }
        // Restore API keys
        API_KEYS.forEach(k => {
          if (data[k]) localStorage.setItem(k, data[k])
        })
        setSyncMsg({ type: 'success', text: 'Dados importados! Recarregando...' })
        setTimeout(() => window.location.reload(), 1200)
      } catch (err) {
        setSyncMsg({ type: 'error', text: 'Arquivo inválido ou corrompido' })
        setTimeout(() => setSyncMsg(null), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = '' // reset input
  }

  // Shared NavLink renderer
  const renderNavItem = ({ to, icon: Icon, label }, indent = false) => {
    const createSubRoutes = ['/create', '/thoughts', '/generate', '/text', '/presentation', '/carousel']
    const isCreateGroup = to === '/create'
    const forceActive = isCreateGroup && createSubRoutes.includes(location.pathname)

    return (
      <NavLink
        key={to}
        to={to}
        end={to === '/' || isCreateGroup}
        className={({ isActive }) => {
          const active = isActive || forceActive
          return clsx(
            'flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
            indent ? 'px-3 pl-10' : 'px-3',
            active
              ? 'bg-orange-100 text-orange-800 border border-orange-200'
              : 'text-gray-500 hover:text-gray-900 hover:bg-white'
          )
        }}
      >
        {({ isActive }) => {
          const active = isActive || forceActive
          return (
            <>
              <Icon size={16} className={active ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} className="text-orange-500" />}
            </>
          )
        }}
      </NavLink>
    )
  }

  return (
    <aside
      className={clsx(
        'w-64 shrink-0 h-screen bg-orange-50 border-r border-orange-100 flex flex-col',
        // Desktop: always visible static
        'lg:static lg:translate-x-0',
        // Mobile: fixed overlay, slide in/out
        'fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Logo + mobile close */}
      <div className="px-5 pt-6 pb-5 border-b border-orange-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 leading-none">Content</div>
            <div className="text-xs text-orange-600 font-medium mt-0.5">Intelligence OS</div>
          </div>
        </div>
        {/* Close button — only on mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-orange-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Top-level items */}
        {TOP_NAV.map((item) => renderNavItem(item))}

        {/* Always-open groups */}
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mt-3">
            <div className="flex items-center gap-2 w-full px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.children.map((item) => renderNavItem(item, true))}
            </div>
          </div>
        ))}

        {/* Bottom items */}
        <div className="mt-3 pt-3 border-t border-orange-100">
          {BOTTOM_NAV.map((item) => renderNavItem(item))}
        </div>
      </nav>

      {/* Footer — Sync + User */}
      <div className="px-4 pb-5 pt-3 border-t border-orange-100 space-y-3">
        {/* Sync status */}
        {syncMsg && (
          <div className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg border ${
            syncMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            {syncMsg.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
            {syncMsg.text}
          </div>
        )}

        {/* Sync buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-600 hover:text-orange-700 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-lg py-2 transition-all"
            title="Baixar backup de todos os dados"
          >
            <Download size={12} /> Exportar
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-600 hover:text-orange-700 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-lg py-2 transition-all"
            title="Importar backup de outro dispositivo"
          >
            <Upload size={12} /> Importar
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white">
            CU
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-800 truncate">Usuário Criador</div>
            <div className="text-[10px] text-gray-400">Plano Pro</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
