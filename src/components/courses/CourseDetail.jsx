import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  BookOpen, Plus, ChevronRight, ChevronDown, ChevronUp,
  Wand2, Trash2, Edit3, Check, X, Layers, BookMarked,
  ArrowLeft, Loader2, GripVertical, Lightbulb, Send,
} from 'lucide-react'
import useCourseStore from '../../store/useCourseStore'
import useAIStore from '../../store/useAIStore'
import { aiGenerateCourseStructure, aiProcessCourseInsight } from '../../lib/courseAI'

const LESSON_TYPE_COLORS = {
  video: 'bg-blue-50 text-blue-600 border-blue-100',
  live: 'bg-purple-50 text-purple-600 border-purple-100',
  quiz: 'bg-amber-50 text-amber-600 border-amber-100',
  pdf: 'bg-gray-50 text-gray-600 border-gray-100',
}

const LESSON_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-500',
  recorded: 'bg-blue-100 text-blue-600',
  published: 'bg-emerald-100 text-emerald-600',
}

function InlineEdit({ value, onSave, className = '', placeholder = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    if (draft.trim()) onSave(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className={`flex-1 bg-orange-50 border border-orange-300 rounded-lg px-2 py-0.5 focus:outline-none text-sm ${className}`}
          placeholder={placeholder}
        />
        <button onClick={commit} className="p-1 text-emerald-500 hover:text-emerald-700"><Check size={13} /></button>
        <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={13} /></button>
      </div>
    )
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      className={`cursor-text hover:text-orange-600 transition-colors ${className}`}
      title="Clique para editar"
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
    </span>
  )
}

function LessonRow({ lesson, courseId, onDelete }) {
  const navigate = useNavigate()
  const updateLesson = useCourseStore((s) => s.updateLesson)
  const type = LESSON_TYPE_COLORS[lesson.type] || LESSON_TYPE_COLORS.video
  const status = LESSON_STATUS_COLORS[lesson.status] || LESSON_STATUS_COLORS.draft

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-orange-50 group cursor-pointer transition-colors"
      onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
    >
      <GripVertical size={13} className="text-gray-300 shrink-0" />
      <BookMarked size={13} className="text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-800 group-hover:text-orange-700 transition-colors line-clamp-1">
          {lesson.title}
        </span>
        {lesson.summary && (
          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{lesson.summary}</p>
        )}
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${type} shrink-0`}>
        {lesson.type}
      </span>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status} shrink-0`}>
        {lesson.status}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(lesson.id) }}
        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </button>
      <ChevronRight size={13} className="text-gray-300 group-hover:text-orange-400 transition-colors shrink-0" />
    </div>
  )
}

function ModuleSection({ module, courseId }) {
  const [expanded, setExpanded] = useState(true)
  const [addingLesson, setAddingLesson] = useState(false)
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const lessons = useCourseStore((s) =>
    s.lessons
      .filter((l) => l.moduleId === module.id)
      .sort((a, b) => a.order - b.order)
  )
  const updateModule = useCourseStore((s) => s.updateModule)
  const deleteModule = useCourseStore((s) => s.deleteModule)
  const addLesson = useCourseStore((s) => s.addLesson)
  const deleteLesson = useCourseStore((s) => s.deleteLesson)

  const handleAddLesson = () => {
    if (!newLessonTitle.trim()) return
    addLesson({ moduleId: module.id, courseId, title: newLessonTitle.trim() })
    setNewLessonTitle('')
    setAddingLesson(false)
  }

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      {/* Module header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <Layers size={15} className="text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={module.title}
            onSave={(v) => updateModule(module.id, { title: v })}
            className="font-semibold text-gray-800 text-sm"
            placeholder="Título do módulo"
          />
        </div>
        <span className="text-[11px] text-gray-400">{lessons.length} aulas</span>
        <button
          onClick={() => setAddingLesson(true)}
          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
          title="Adicionar aula"
        >
          <Plus size={13} />
        </button>
        <button
          onClick={() => deleteModule(module.id)}
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Excluir módulo"
        >
          <Trash2 size={13} />
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Lessons list */}
      {expanded && (
        <div className="p-2 space-y-0.5 bg-white">
          {lessons.length === 0 && !addingLesson && (
            <div className="py-4 text-center text-sm text-gray-400">
              Nenhuma aula ainda.{' '}
              <button onClick={() => setAddingLesson(true)} className="text-orange-500 hover:underline font-medium">
                Adicionar aula
              </button>
            </div>
          )}

          {lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} courseId={courseId} onDelete={deleteLesson} />
          ))}

          {addingLesson && (
            <div className="flex items-center gap-2 px-3 py-2">
              <BookMarked size={13} className="text-gray-400 shrink-0" />
              <input
                autoFocus
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddLesson(); if (e.key === 'Escape') setAddingLesson(false) }}
                placeholder="Nome da aula..."
                className="flex-1 text-sm bg-orange-50 border border-orange-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              />
              <button onClick={handleAddLesson} className="p-1.5 text-emerald-500 hover:text-emerald-700"><Check size={14} /></button>
              <button onClick={() => setAddingLesson(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InsightPanel({ courseId, courseTitle }) {
  const [text, setText] = useState('')
  const [processing, setProcessing] = useState(null)
  const insights = useCourseStore((s) => s.courseInsights.filter((i) => i.courseId === courseId))
  const addCourseInsight = useCourseStore((s) => s.addCourseInsight)
  const updateCourseInsight = useCourseStore((s) => s.updateCourseInsight)
  const deleteCourseInsight = useCourseStore((s) => s.deleteCourseInsight)
  const getSettings = useAIStore((s) => s.getSettings)
  const isConfigured = useAIStore((s) => s.isConfigured)

  const handleCapture = () => {
    if (!text.trim()) return
    addCourseInsight({ courseId, content: text.trim() })
    setText('')
  }

  const handleProcess = async (insight) => {
    if (!isConfigured()) return
    setProcessing(insight.id)
    try {
      const result = await aiProcessCourseInsight(getSettings(), {
        content: insight.content,
        courseTitle,
      })
      updateCourseInsight(insight.id, { processed: true, processedContent: result })
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={15} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-800">Captura de Insights</h3>
        <span className="ml-auto text-xs text-gray-400">{insights.length} ideias</span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
          placeholder="Capture uma ideia, nota ou atualização para este curso..."
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <button
          onClick={handleCapture}
          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors"
        >
          <Send size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {insights.map((insight) => (
          <div key={insight.id} className="border border-gray-100 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm text-gray-700">{insight.content}</p>
              <div className="flex gap-1 shrink-0">
                {!insight.processed && isConfigured() && (
                  <button
                    onClick={() => handleProcess(insight)}
                    disabled={processing === insight.id}
                    className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Processar com IA"
                  >
                    {processing === insight.id ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  </button>
                )}
                <button
                  onClick={() => deleteCourseInsight(insight.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {insight.processed && insight.processedContent && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                    {insight.processedContent.type}
                  </span>
                  <span className="text-xs font-medium text-gray-700">{insight.processedContent.title}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-3">{insight.processedContent.summary}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const course = useCourseStore((s) => s.courses.find((c) => c.id === courseId))
  const modules = useCourseStore((s) =>
    s.modules.filter((m) => m.courseId === courseId).sort((a, b) => a.order - b.order)
  )
  const updateCourse = useCourseStore((s) => s.updateCourse)
  const addModule = useCourseStore((s) => s.addModule)
  const importCourseStructure = useCourseStore((s) => s.importCourseStructure)
  const getSettings = useAIStore((s) => s.getSettings)
  const isConfigured = useAIStore((s) => s.isConfigured)

  const [generatingStructure, setGeneratingStructure] = useState(false)
  const [aiError, setAiError] = useState('')

  if (!course) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 mb-4">Curso não encontrado.</p>
        <Link to="/courses" className="text-orange-500 hover:underline text-sm">← Voltar para cursos</Link>
      </div>
    )
  }

  const handleGenerateStructure = async () => {
    if (!isConfigured()) { setAiError('Configure a IA em Configurações primeiro.'); return }
    if (modules.length > 0 && !confirm('Isso irá adicionar novos módulos ao curso. Continuar?')) return
    setGeneratingStructure(true)
    setAiError('')
    try {
      const structure = await aiGenerateCourseStructure(getSettings(), {
        title: course.title,
        objectives: course.objectives,
        targetAudience: course.targetAudience,
      })
      importCourseStructure(courseId, structure)
    } catch (err) {
      setAiError(err.message || 'Erro ao gerar estrutura. Tente novamente.')
    } finally {
      setGeneratingStructure(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <button onClick={() => navigate('/courses')} className="hover:text-orange-600 flex items-center gap-1 transition-colors">
          <ArrowLeft size={12} /> Cursos
        </button>
        <ChevronRight size={10} />
        <span className="text-gray-600 font-medium truncate">{course.title}</span>
      </div>

      {/* Course header */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200 shrink-0">
            <BookOpen size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={course.title}
              onSave={(v) => updateCourse(courseId, { title: v })}
              className="text-lg font-bold text-gray-900 block"
              placeholder="Título do curso"
            />
            {course.description && (
              <p className="text-sm text-gray-500 mt-1">{course.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              {course.targetAudience && <span>👥 {course.targetAudience}</span>}
              <span>📦 {modules.length} módulos</span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <select
              value={course.status}
              onChange={(e) => updateCourse(courseId, { status: e.target.value })}
              className="text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            >
              <option value="draft">Rascunho</option>
              <option value="active">Ativo</option>
              <option value="published">Publicado</option>
            </select>
          </div>
        </div>

        {course.objectives && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-1">Objetivos</p>
            <p className="text-sm text-gray-600">{course.objectives}</p>
          </div>
        )}
      </div>

      {/* AI Structure generation */}
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
            disabled={generatingStructure}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 rounded-xl transition-colors"
          >
            {generatingStructure
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

      {/* Modules */}
      {modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          <Layers size={28} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">Nenhum módulo ainda.<br />Crie manualmente ou gere com IA.</p>
          <div className="flex gap-3">
            <button
              onClick={() => addModule({ courseId, title: 'Módulo 1' })}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-orange-300 rounded-xl transition-colors"
            >
              <Plus size={14} /> Módulo manual
            </button>
            <button
              onClick={handleGenerateStructure}
              disabled={generatingStructure}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-60"
            >
              {generatingStructure ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Gerar com IA
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {modules.map((module) => (
            <ModuleSection key={module.id} module={module} courseId={courseId} />
          ))}
        </div>
      )}

      {/* Insights panel */}
      <InsightPanel courseId={courseId} courseTitle={course.title} />
    </div>
  )
}
