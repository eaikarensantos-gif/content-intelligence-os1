import { useState } from 'react'
import {
  BookOpen, Play, Clock, Star, ChevronRight, Search,
  GraduationCap, Trophy, Zap, Lock, CheckCircle2, Filter,
} from 'lucide-react'

const CATEGORIES = ['Todos', 'Criação de Conteúdo', 'Analytics', 'Estratégia', 'Ferramentas']

const COURSES = [
  {
    id: 1,
    title: 'Fundamentos de Content Intelligence',
    description: 'Aprenda a usar dados e inteligência artificial para criar conteúdo que realmente converte.',
    category: 'Estratégia',
    duration: '2h 30min',
    lessons: 12,
    level: 'Iniciante',
    rating: 4.9,
    students: 1240,
    progress: 65,
    image: 'bg-gradient-to-br from-orange-400 to-orange-600',
    free: true,
  },
  {
    id: 2,
    title: 'Analytics Avançado para Criadores',
    description: 'Domine métricas, relatórios e tome decisões baseadas em dados reais das suas redes sociais.',
    category: 'Analytics',
    duration: '3h 15min',
    lessons: 18,
    level: 'Avançado',
    rating: 4.8,
    students: 870,
    progress: 20,
    image: 'bg-gradient-to-br from-blue-400 to-blue-600',
    free: false,
  },
  {
    id: 3,
    title: 'Criação de Conteúdo com IA',
    description: 'Use ferramentas de IA para acelerar sua produção sem perder autenticidade e voz de marca.',
    category: 'Criação de Conteúdo',
    duration: '1h 45min',
    lessons: 9,
    level: 'Intermediário',
    rating: 4.7,
    students: 2100,
    progress: 0,
    image: 'bg-gradient-to-br from-purple-400 to-purple-600',
    free: true,
  },
  {
    id: 4,
    title: 'Estratégia de Conteúdo 360°',
    description: 'Construa uma estratégia sólida de conteúdo para crescer de forma consistente e sustentável.',
    category: 'Estratégia',
    duration: '4h 00min',
    lessons: 22,
    level: 'Avançado',
    rating: 4.9,
    students: 650,
    progress: 0,
    image: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    free: false,
  },
  {
    id: 5,
    title: 'Dominando o Carousel Studio',
    description: 'Aprenda a criar carrosséis virais e sequências de conteúdo altamente engajantes.',
    category: 'Ferramentas',
    duration: '1h 20min',
    lessons: 7,
    level: 'Iniciante',
    rating: 4.6,
    students: 1890,
    progress: 100,
    image: 'bg-gradient-to-br from-pink-400 to-pink-600',
    free: true,
  },
  {
    id: 6,
    title: 'DNA de Marca para Criadores',
    description: 'Defina e consolide a identidade da sua marca para criar conteúdo consistente e reconhecível.',
    category: 'Estratégia',
    duration: '2h 10min',
    lessons: 11,
    level: 'Intermediário',
    rating: 4.8,
    students: 730,
    progress: 0,
    image: 'bg-gradient-to-br from-amber-400 to-amber-600',
    free: false,
  },
]

const LEVEL_COLOR = {
  Iniciante: 'bg-emerald-100 text-emerald-700',
  Intermediário: 'bg-blue-100 text-blue-700',
  Avançado: 'bg-orange-100 text-orange-700',
}

function ProgressRing({ pct }) {
  const r = 16
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width="40" height="40" className="-rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#fed7aa" strokeWidth="4" />
      <circle
        cx="20" cy="20" r={r} fill="none"
        stroke={pct === 100 ? '#16a34a' : '#f97316'}
        strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

export default function Courses() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [levelFilter, setLevelFilter] = useState('Todos')

  const completedCount = COURSES.filter(c => c.progress === 100).length
  const inProgressCount = COURSES.filter(c => c.progress > 0 && c.progress < 100).length

  const filtered = COURSES.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'Todos' || c.category === category
    const matchLevel = levelFilter === 'Todos' || c.level === levelFilter
    return matchSearch && matchCat && matchLevel
  })

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="text-orange-500" size={26} />
            Cursos & Aprendizado
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Desenvolva suas habilidades e domine as ferramentas da plataforma
          </p>
        </div>
        <div className="flex gap-3 text-center">
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
            <div className="text-xl font-bold text-orange-600">{completedCount}</div>
            <div className="text-xs text-gray-500">Concluídos</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <div className="text-xl font-bold text-blue-600">{inProgressCount}</div>
            <div className="text-xs text-gray-500">Em progresso</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <div className="text-xl font-bold text-emerald-600">{COURSES.length}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cursos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                category === cat
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Filter size={13} />
          {['Todos', 'Iniciante', 'Intermediário', 'Avançado'].map(l => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                levelFilter === l
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'border-gray-200 hover:border-gray-400 text-gray-600'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Course grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum curso encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}

function CourseCard({ course }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-300 hover:shadow-md hover:shadow-orange-100 transition-all group cursor-pointer">
      {/* Thumbnail */}
      <div className={`h-32 ${course.image} relative flex items-center justify-center`}>
        <BookOpen size={36} className="text-white/80" />
        {!course.free && (
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <Lock size={10} /> PRO
          </div>
        )}
        {course.free && (
          <div className="absolute top-3 right-3 bg-emerald-500/90 text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <Zap size={10} /> Grátis
          </div>
        )}
        {course.progress === 100 && (
          <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <Trophy size={10} /> Concluído
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-orange-700 transition-colors">
            {course.title}
          </h3>
          {course.progress > 0 && (
            <div className="shrink-0">
              {course.progress === 100
                ? <CheckCircle2 size={20} className="text-emerald-500" />
                : <ProgressRing pct={course.progress} />}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{course.description}</p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${LEVEL_COLOR[course.level]}`}>
            {course.level}
          </span>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {course.category}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><Clock size={11} />{course.duration}</span>
          <span className="flex items-center gap-1"><Play size={11} />{course.lessons} aulas</span>
          <span className="flex items-center gap-1 ml-auto">
            <Star size={11} className="text-amber-400 fill-amber-400" />
            {course.rating}
          </span>
        </div>

        {course.progress > 0 && course.progress < 100 && (
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Progresso</span><span>{course.progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        )}

        <button className={`w-full flex items-center justify-center gap-2 text-xs font-medium py-2 rounded-xl transition-all ${
          course.progress === 100
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            : course.progress > 0
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200'
        }`}>
          {course.progress === 100 ? (
            <><CheckCircle2 size={13} /> Revisar</>
          ) : course.progress > 0 ? (
            <><Play size={13} /> Continuar</>
          ) : (
            <><Play size={13} /> Começar <ChevronRight size={13} /></>
          )}
        </button>
      </div>
    </div>
  )
}
