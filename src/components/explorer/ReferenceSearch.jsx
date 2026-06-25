import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import clsx from 'clsx'

const ARCHETYPES = [
  { id: 'authority-speech', label: '👩‍💼 Authority Speech', desc: 'Cortes de mulheres poderosas, atrizes' },
  { id: 'corporate-absurd', label: '🤖 Corporate Absurd', desc: 'Processos seletivos, gírias de RH' },
  { id: 'metaphorical-humor', label: '🐕 Metaphorical Humor', desc: 'Animais em contextos profissionais' },
  { id: 'tech-edge', label: '⚡ Tech Edge', desc: 'Demos de IA e automações' },
]

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X/Twitter' },
]

// Mock data de referências
const MOCK_REFERENCES = [
  {
    id: 'ref-1',
    platform: 'instagram',
    archetype: 'authority-speech',
    title: 'A mulher que questionou todo o processo seletivo',
    author: 'thaisferreira',
    thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    likes: 45,
    comments: 12,
    engagementRate: 8.2,
  },
  {
    id: 'ref-2',
    platform: 'tiktok',
    archetype: 'corporate-absurd',
    title: 'RH pedindo "fit cultural" para trabalho remoto',
    author: 'corporatebullshit',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=100&h=100&fit=crop',
    likes: 120,
    comments: 32,
    engagementRate: 15.4,
  },
  {
    id: 'ref-3',
    platform: 'youtube',
    archetype: 'metaphorical-humor',
    title: 'Cachorro em reunião de 1:1 com seu gestor',
    author: 'officehumor',
    thumbnail: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=100&h=100&fit=crop',
    likes: 89,
    comments: 23,
    engagementRate: 12.1,
  },
  {
    id: 'ref-4',
    platform: 'linkedin',
    archetype: 'tech-edge',
    title: 'Claude 3 Opus rodando task de 5 horas em 30 segundos',
    author: 'paulotech',
    thumbnail: 'https://images.unsplash.com/photo-1677442d019cecf8dab2c0e5e63d6e6c?w=100&h=100&fit=crop',
    likes: 245,
    comments: 67,
    engagementRate: 22.3,
  },
  {
    id: 'ref-5',
    platform: 'x',
    archetype: 'corporate-absurd',
    title: 'Chefe pedindo "paixão pela empresa" com salário de estagiário',
    author: 'devrant',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=100&h=100&fit=crop',
    likes: 3400,
    comments: 890,
    engagementRate: 45.2,
  },
  {
    id: 'ref-6',
    platform: 'tiktok',
    archetype: 'tech-edge',
    title: 'Testando IA generativa para criar apresentações em tempo real',
    author: 'aigenius',
    thumbnail: 'https://images.unsplash.com/photo-1516534775068-bb57a52f4fee?w=100&h=100&fit=crop',
    likes: 567,
    comments: 145,
    engagementRate: 18.9,
  },
  {
    id: 'ref-7',
    platform: 'instagram',
    archetype: 'authority-speech',
    title: 'A verdade sobre imposter syndrome que ninguém fala',
    author: 'mariapaulo',
    thumbnail: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    likes: 234,
    comments: 56,
    engagementRate: 10.7,
  },
  {
    id: 'ref-8',
    platform: 'youtube',
    archetype: 'metaphorical-humor',
    title: 'Gato ignorando Slack enquanto finge trabalhar',
    author: 'petoffice',
    thumbnail: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=100&h=100&fit=crop',
    likes: 456,
    comments: 123,
    engagementRate: 14.2,
  },
]

export default function ReferenceSearch({ onSelect, selectedReferences = [] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArchetypes, setSelectedArchetypes] = useState([])
  const [selectedPlatforms, setSelectedPlatforms] = useState([])

  const filteredReferences = useMemo(() => {
    return MOCK_REFERENCES.filter((ref) => {
      const matchesQuery = ref.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ref.author.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesArchetype = selectedArchetypes.length === 0 || selectedArchetypes.includes(ref.archetype)
      const matchesPlatform = selectedPlatforms.length === 0 || selectedPlatforms.includes(ref.platform)

      return matchesQuery && matchesArchetype && matchesPlatform
    })
  }, [searchQuery, selectedArchetypes, selectedPlatforms])

  const toggleArchetype = (id) => {
    setSelectedArchetypes(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search input */}
      <div className="border-b p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar referências..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Archetype filters */}
      <div className="border-b p-3">
        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Arquétipos</p>
        <div className="space-y-2">
          {ARCHETYPES.map((arch) => (
            <button
              key={arch.id}
              onClick={() => toggleArchetype(arch.id)}
              className={clsx(
                'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                selectedArchetypes.includes(arch.id)
                  ? 'bg-orange-100 text-orange-900 border border-orange-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              )}
            >
              <div className="font-medium">{arch.label}</div>
              <div className="text-xs text-gray-600 mt-0.5">{arch.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Platform filters */}
      <div className="border-b p-3">
        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Plataformas</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((plat) => (
            <button
              key={plat.id}
              onClick={() => togglePlatform(plat.id)}
              className={clsx(
                'px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
                selectedPlatforms.includes(plat.id)
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {plat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredReferences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-gray-500">Nenhuma referência encontrada</p>
          </div>
        ) : (
          filteredReferences.map((ref) => (
            <button
              key={ref.id}
              onClick={() => onSelect(ref)}
              className={clsx(
                'w-full text-left p-2 rounded border transition-all hover:shadow-md',
                selectedReferences.some(r => r.id === ref.id)
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-orange-200'
              )}
            >
              <div className="flex gap-2">
                {ref.thumbnail && (
                  <img
                    src={ref.thumbnail}
                    alt={ref.title}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-1">{ref.title}</p>
                  <p className="text-xs text-gray-600">@{ref.author}</p>
                  <p className="text-xs text-orange-600 font-medium mt-0.5">
                    {ref.engagementRate.toFixed(1)}% engagement
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
