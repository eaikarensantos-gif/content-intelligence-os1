import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BookOpen, Plus, Trash2, ArrowLeft, ChevronRight,
  Layers, BookMarked, Check, X, Wand2, Loader2,
} from 'lucide-react'
import useCourseStore from '../../store/useCourseStore'
import useAIStore from '../../store/useAIStore'
import { aiGenerateCourseStructure } from '../../lib/courseAI'

export default function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  const course         = useCourseStore((s) => s.courses.find((c) => c.id === courseId))
  const modules        = useCourseStore((s) => s.modules.filter((m) => m.courseId === courseId).sort((a, b) => a.order - b.order))
  const lessons        = useCourseStore((s) => s.lessons.filter((l) => l.courseId === courseId))
  const updateCourse   = useCourseStore((s) => s.updateCourse)
  const addModule      = useCourseStore((s) => s.addModule)
  const deleteModule   = useCourseStore((s) => s.deleteModule)
  const updateModule   = useCourseStore((s) => s.updateModule)
  const addLesson      = useCourseStore((s) => s.addLesson)
  const deleteLesson   = useCourseStore((s) => s.deleteLesson)
  const importCourseStructure = useCourseStore((s) => s.importCourseStructure)

  const getSettings  = useAIStore((s) => s.getSettings)
  const isConfigured = useAIStore((s) => s.isConfigured)

  const [generating, setGenerating]   = useState(false)
  const [aiError, setAiError]         = useState('')
  const [newLesson, setNewLesson]     = useState({}) // { [moduleId]: string }
  const [editingModule, setEditingModule] = useState(null) // moduleId being renamed

  if (!course) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-500 mb-3">Curso não encontrado.</p>
        <button onClick={() => navigate('/courses')} className="text-orange-500 text-sm hover:underline">
          ← Voltar para cursos
        </button>
      </div>
    )
  }

  async function handleGenerateStructure() {
    if (!isConfigured()) { setAiError('Configure a IA em Configurações primeiro.'); return }
    setGenerating(true)
    setAiError('')
    try {
      const structure = await aiGenerateCourseStructure(getSettings(), {
        title: course.title,
        objectives: course.objectives || '',
        targetAudience: course.targetAudience || '',
      })
      importCourseStructure(courseId, structure)
    } catch (err) {
      setAiError(err.message || 'Erro ao gerar estrutura.')
    } finally {
      setGenerating(false)
    }
  }

  function addLessonToModule(moduleId) {
    const title = (newLesson[moduleId] || '').trim()
    if (!title) return
    addLesson({ moduleId, courseId, title })
    setNewLesson((prev) => ({ ...prev, [moduleId]: '' }))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <button
          onClick={() => navigate('/courses')}
          className="flex items-center gap-1 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft size={12} /> Cursos
        </button>
        <ChevronRight size={10} />
        <span className="text-gray-600 font-medium truncate max-w-xs">{course.title}</span>
      </div>

      {/* Course header card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-snug">{course.title}</h1>
            {course.description && (
              <p className="text-sm text-gray-500 mt-1">{course.description}</p>
            )}
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span><Layers size={11} className="inline mr-1" />{modules.length} módulos</span>
              <span><BookMarked size={11} className="inline mr-1" />{lessons.length} aulas</span>
            </div>
          </div>
          <select
            value={course.status || 'draft'}
            onChange={(e) => updateCourse(courseId, { status: e.target.value })}
            className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white focus:outline-none shrink-0"
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
            <option value="published">Publicado</option>
          </select>
        </div>
      </div>

      {/* Modules toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">Módulos e Aulas</h2>
        <div className="flex gap-2">
          <button
            onClick={() => addModule({ courseId, title: `Módulo ${modules.length + 1}` })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-orange-300 hover:text-orange-600 rounded-xl transition-colors"
          >
            <Plus size={13} /> Módulo
          </button>
          <button
            onClick={handleGenerateStructure}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 rounded-xl transition-colors"
          >
            {generating
              ? <><Loader2 size={12} className="animate-spin" /> Gerando...</>
              : <><Wand2 size={12} /> Gerar com IA</>}
          </button>
        </div>
      </div>

      {aiError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {aiError}
        </div>
      )}

      {/* Empty state */}
      {modules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <Layers size={28} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">Nenhum módulo ainda. Crie manualmente ou gere com IA.</p>
          <div className="flex gap-3">
            <button
              onClick={() => addModule({ courseId, title: 'Módulo 1' })}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-orange-300 rounded-xl transition-colors"
            >
              <Plus size={14} /> Módulo manual
            </button>
            <button
              onClick={handleGenerateStructure}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-60"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Gerar com IA
            </button>
          </div>
        </div>
      )}

      {/* Modules list */}
      <div className="space-y-3">
        {modules.map((mod) => {
          const modLessons = lessons
            .filter((l) => l.moduleId === mod.id)
            .sort((a, b) => a.order - b.order)

          return (
            <div key={mod.id} className="border border-gray-100 rounded-2xl overflow-hidden">
              {/* Module header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                <Layers size={14} className="text-orange-500 shrink-0" />

                {editingModule === mod.id ? (
                  <input
                    autoFocus
                    defaultValue={mod.title}
                    onBlur={(e) => { updateModule(mod.id, { title: e.target.value }); setEditingModule(null) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { updateModule(mod.id, { title: e.target.value }); setEditingModule(null) }
                      if (e.key === 'Escape') setEditingModule(null)
                    }}
                    className="flex-1 text-sm font-semibold bg-white border border-orange-300 rounded-lg px-2 py-0.5 focus:outline-none"
                  />
                ) : (
                  <span
                    onClick={() => setEditingModule(mod.id)}
                    className="flex-1 text-sm font-semibold text-gray-800 cursor-text hover:text-orange-600 transition-colors"
                  >
                    {mod.title}
                  </span>
                )}

                <span className="text-[11px] text-gray-400 shrink-0">{modLessons.length} aulas</span>
                <button
                  onClick={() => setNewLesson((prev) => ({ ...prev, [mod.id]: prev[mod.id] !== undefined ? undefined : '' }))}
                  className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                  title="Adicionar aula"
                >
                  <Plus size={13} />
                </button>
                <button
                  onClick={() => deleteModule(mod.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir módulo"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Lessons */}
              <div className="bg-white p-2 space-y-0.5">
                {modLessons.length === 0 && newLesson[mod.id] === undefined && (
                  <p className="text-center text-xs text-gray-400 py-3">
                    Nenhuma aula.{' '}
                    <button
                      onClick={() => setNewLesson((prev) => ({ ...prev, [mod.id]: '' }))}
                      className="text-orange-500 hover:underline"
                    >
                      Adicionar
                    </button>
                  </p>
                )}

                {modLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
                    className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-orange-50 cursor-pointer group transition-colors"
                  >
                    <BookMarked size={13} className="text-gray-400 shrink-0" />
                    <span className="flex-1 text-sm text-gray-800 group-hover:text-orange-700 line-clamp-1 transition-colors">
                      {lesson.title}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">{lesson.type || 'video'}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteLesson(lesson.id) }}
                      className="p-1 text-gray-300 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                    <ChevronRight size={12} className="text-gray-300 group-hover:text-orange-400 shrink-0" />
                  </div>
                ))}

                {newLesson[mod.id] !== undefined && (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <BookMarked size={13} className="text-gray-400 shrink-0" />
                    <input
                      autoFocus
                      value={newLesson[mod.id] || ''}
                      onChange={(e) => setNewLesson((prev) => ({ ...prev, [mod.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addLessonToModule(mod.id)
                        if (e.key === 'Escape') setNewLesson((prev) => ({ ...prev, [mod.id]: undefined }))
                      }}
                      placeholder="Nome da aula..."
                      className="flex-1 text-sm bg-orange-50 border border-orange-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
                    />
                    <button onClick={() => addLessonToModule(mod.id)} className="p-1.5 text-emerald-500 hover:text-emerald-700">
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setNewLesson((prev) => ({ ...prev, [mod.id]: undefined }))}
                      className="p-1.5 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
