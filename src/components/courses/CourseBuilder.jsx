import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Plus, Search, Trash2, ChevronRight, Layers, BookMarked, X } from 'lucide-react'
import useCourseStore from '../../store/useCourseStore'

const STATUS_LABELS = {
  draft:     { label: 'Rascunho',  color: 'bg-gray-100 text-gray-600' },
  active:    { label: 'Ativo',     color: 'bg-blue-100 text-blue-700' },
  published: { label: 'Publicado', color: 'bg-emerald-100 text-emerald-700' },
}

export default function CourseBuilder() {
  const navigate     = useNavigate()
  const courses      = useCourseStore((s) => s.courses)
  const modules      = useCourseStore((s) => s.modules)
  const lessons      = useCourseStore((s) => s.lessons)
  const addCourse    = useCourseStore((s) => s.addCourse)
  const deleteCourse = useCourseStore((s) => s.deleteCourse)

  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [title,     setTitle]     = useState('')
  const [description, setDescription] = useState('')

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
    addCourse({ title: title.trim(), description: description.trim() })
    setTitle('')
    setDescription('')
    setShowModal(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Course Builder</h1>
            <p className="text-xs text-gray-500">{courses.length} curso{courses.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} /> Novo Curso
        </button>
      </div>

      {/* Search */}
      {courses.length > 0 && (
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cursos..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered
            .slice()
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((course) => {
              const mCount = modules.filter((m) => m.courseId === course.id).length
              const lCount = lessons.filter((l) => l.courseId === course.id).length
              const status = STATUS_LABELS[course.status] || STATUS_LABELS.draft
              return (
                <div
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-orange-700 transition-colors flex-1">
                      {course.title}
                    </h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCourse(course.id) }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {course.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{course.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Layers size={11} /> {mCount} módulos</span>
                    <span className="flex items-center gap-1"><BookMarked size={11} /> {lCount} aulas</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-orange-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Abrir <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              )
            })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-orange-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            {search ? 'Nenhum curso encontrado' : 'Nenhum curso ainda'}
          </h3>
          <p className="text-sm text-gray-400 mb-5 max-w-xs">
            {search
              ? 'Tente outro termo de busca.'
              : 'Crie seu primeiro curso para começar.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} /> Criar primeiro curso
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Novo Curso</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Título *</label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Marketing Digital para Iniciantes"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva brevemente o curso..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
                >
                  Criar Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
