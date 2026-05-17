import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Plus, Search, Trash2, ChevronRight,
  Users, Target, Layers, Clock, BookMarked, Wand2, X,
} from 'lucide-react'
import useCourseStore from '../../store/useCourseStore'

const STATUS_LABELS = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  active: { label: 'Ativo', color: 'bg-blue-100 text-blue-700' },
  published: { label: 'Publicado', color: 'bg-emerald-100 text-emerald-700' },
}

function CourseCard({ course, onDelete }) {
  const navigate = useNavigate()
  const modules = useCourseStore((s) => s.modules.filter((m) => m.courseId === course.id))
  const lessons = useCourseStore((s) => s.lessons.filter((l) => l.courseId === course.id))
  const status = STATUS_LABELS[course.status] || STATUS_LABELS.draft

  return (
    <div
      className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group"
      onClick={() => navigate(`/courses/${course.id}`)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-orange-700 transition-colors">
            {course.title}
          </h3>
          {course.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(course.id) }}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
        {course.targetAudience && (
          <span className="flex items-center gap-1">
            <Users size={11} /> {course.targetAudience}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Layers size={11} /> {modules.length} módulos
        </span>
        <span className="flex items-center gap-1">
          <BookMarked size={11} /> {lessons.length} aulas
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${status.color}`}>
          {status.label}
        </span>
        <div className="flex items-center gap-1 text-xs text-orange-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Abrir <ChevronRight size={12} />
        </div>
      </div>
    </div>
  )
}

function NewCourseModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    targetAudience: '',
    objectives: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onCreate(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <BookOpen size={18} className="text-orange-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Novo Curso</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Título do curso *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Marketing Digital para Iniciantes"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva brevemente o que este curso vai ensinar..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              <Users size={11} className="inline mr-1" /> Público-alvo
            </label>
            <input
              type="text"
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              placeholder="Ex: Empreendedores iniciantes, profissionais de marketing"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              <Target size={11} className="inline mr-1" /> Objetivos de aprendizagem
            </label>
            <textarea
              value={form.objectives}
              onChange={(e) => setForm({ ...form, objectives: e.target.value })}
              placeholder="O que o aluno será capaz de fazer ao final do curso?"
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
            >
              Criar Curso
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CourseBuilder() {
  const courses = useCourseStore((s) => s.courses)
  const addCourse = useCourseStore((s) => s.addCourse)
  const deleteCourse = useCourseStore((s) => s.deleteCourse)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: courses.length,
    published: courses.filter((c) => c.status === 'published').length,
    draft: courses.filter((c) => c.status === 'draft').length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Course Builder</h1>
            <p className="text-xs text-gray-500">Crie e gerencie seus cursos com IA</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus size={16} /> Novo Curso
        </button>
      </div>

      {/* Stats */}
      {courses.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: BookOpen, color: 'text-orange-600 bg-orange-50' },
            { label: 'Publicados', value: stats.published, icon: Wand2, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Rascunhos', value: stats.draft, icon: Clock, color: 'text-gray-600 bg-gray-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {courses.length > 0 && (
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cursos..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-white"
          />
        </div>
      )}

      {/* Course grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((course) => (
              <CourseCard key={course.id} course={course} onDelete={deleteCourse} />
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-orange-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">
            {search ? 'Nenhum curso encontrado' : 'Nenhum curso ainda'}
          </h3>
          <p className="text-sm text-gray-400 mb-5 max-w-sm">
            {search
              ? 'Tente outro termo de busca.'
              : 'Crie seu primeiro curso e use a IA para gerar a estrutura de módulos e aulas automaticamente.'}
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

      {showModal && (
        <NewCourseModal onClose={() => setShowModal(false)} onCreate={addCourse} />
      )}
    </div>
  )
}
