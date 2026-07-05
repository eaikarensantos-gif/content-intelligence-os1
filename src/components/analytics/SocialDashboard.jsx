import { useState } from 'react'
import {
  Users, Zap, Instagram, Twitter, Linkedin, Youtube,
  Edit3, Check, X,
} from 'lucide-react'
import Analytics from './Analytics'
import useStore from '../../store/useStore'

const C = {
  purple: '#A78BFA',
  pink:   '#F472B6',
  blue:   '#60A5FA',
  indigo: '#818CF8',
  teal:   '#2DD4BF',
}

const PLATFORM_META = {
  instagram: { label: 'Instagram', icon: Instagram, color: C.purple },
  tiktok:    { label: 'TikTok',    icon: Zap,       color: C.pink   },
  linkedin:  { label: 'LinkedIn',  icon: Linkedin,  color: C.blue   },
  youtube:   { label: 'YouTube',   icon: Youtube,   color: '#FF0000'},
  twitter:   { label: 'X/Twitter', icon: Twitter,   color: C.indigo },
  facebook:  { label: 'Facebook',  icon: Users,     color: C.teal   },
}

const DEFAULT_FOLLOWERS = {
  instagram: '', tiktok: '', linkedin: '', youtube: '', twitter: '', facebook: '',
}

function fmt(n) {
  if (!n || isNaN(n)) return null
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(Math.round(n))
}

export default function SocialDashboard() {
  const profile    = useStore(s => s.creatorProfile)
  const setProfile = useStore(s => s.setCreatorProfile)
  const [editing, setEditing] = useState(false)
  const followers = profile.followersByPlatform || DEFAULT_FOLLOWERS
  const [draft, setDraft] = useState(followers)

  const activeFollowers = Object.entries(followers).filter(([, v]) => Number(v) > 0)

  const save = () => {
    setProfile({ ...profile, followersByPlatform: draft })
    setEditing(false)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] animate-fade-in">
      <div className="px-6 pt-6 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Métricas de conteúdo importadas</p>
          </div>
        </div>

        {/* Follower chips */}
        <div className="flex flex-wrap items-center gap-2">
          {activeFollowers.length > 0
            ? activeFollowers.map(([key, val]) => {
                const meta = PLATFORM_META[key]
                if (!meta) return null
                const { label, icon: Icon, color } = meta
                return (
                  <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-semibold text-gray-700">
                    <Icon size={13} style={{ color }} />
                    {label}
                    <span className="text-gray-400 font-normal ml-0.5">{fmt(Number(val))}</span>
                  </div>
                )
              })
            : <span className="text-xs text-gray-400">Nenhum seguidor configurado</span>
          }
          <button
            onClick={() => { setDraft(followers); setEditing(v => !v) }}
            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <Edit3 size={12} /> {activeFollowers.length > 0 ? 'Editar' : 'Adicionar seguidores'}
          </button>
        </div>

        {/* Inline editor */}
        {editing && (
          <div className="bg-white rounded-2xl border border-orange-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600">Seguidores por plataforma</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(PLATFORM_META).filter(([k]) => k !== 'x').map(([key, { label, icon: Icon, color }]) => (
                <div key={key} className="space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <Icon size={11} style={{ color }} /> {label}
                  </label>
                  <input
                    type="number" min="0"
                    value={draft[key] ?? ''}
                    onChange={e => setDraft(p => ({ ...p, [key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                    placeholder="0"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Cancelar</button>
              <button onClick={save} className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 flex items-center gap-1">
                <Check size={11} /> Salvar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Analytics CSV — always visible */}
      <Analytics embedded />
    </div>
  )
}
