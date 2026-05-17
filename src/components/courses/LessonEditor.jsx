import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BookMarked, ArrowLeft, ChevronRight, Wand2, Loader2,
  Save, Plus, Trash2, ChevronLeft, ChevronRight as ChevronR,
  FileText, Dumbbell, BookOpen, CheckCircle2,
} from 'lucide-react'
import useCourseStore from '../../store/useCourseStore'
import useAIStore from '../../store/useAIStore'
import { aiGenerateLessonScript, aiGenerateExercises } from '../../lib/courseAI'

const TABS = [
  { id: 'content', label: 'Conteúdo', icon: FileText },
  { id: 'script', label: 'Roteiro', icon: BookOpen },
  { id: 'exercises', label: 'Exercícios', icon: Dumbbell },
]

const LESSON_TYPES = ['video', 'live', 'quiz', 'pdf']
const LESSON_STATUSES = ['draft', 'recorded', 'published']
const EXERCISE_TYPES = ['quiz', 'practical', 'reflection', 'project', 'case']

const EXERCISE_TYPE_LABELS = {
  quiz: 'Quiz',
  practical: 'Prático',
  reflection: 'Reflexão',
  project: 'Projeto',
  case: 'Estudo de Caso',
}

const DIFFICULTY_COLORS = {
  básico: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  intermediário: 'bg-amber-50 text-amber-600 border-amber-100',
  avançado: 'bg-red-50 text-red-600 border-red-100',
}

export default function LessonEditor() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()

  const lesson = useCourseStore((s) => s.lessons.find((l) => l.id === lessonId))
  const course = useCourseStore((s) => s.courses.find((c) => c.id === courseId))
  const module = useCourseStore((s) => s.modules.find((m) => m.id === lesson?.moduleId))
  const exercises = useCourseStore((s) => s.exercises.filter((e) => e.lessonId === lessonId))
  const updateLesson = useCourseStore((s) => s.updateLesson)
  const addExercises = useCourseStore((s) => s.addExercises)
  const addExercise = useCourseStore((s) => s.addExercise)
  const deleteExercise = useCourseStore((s) => s.deleteExercise)

  // Navigation between lessons in the same module
  const siblingLessons = useCourseStore((s) =>
    s.lessons.filter((l) => l.moduleId === lesson?.moduleId).sort((a, b) => a.order - b.order)
  )
  const currentIdx = siblingLessons.findIndex((l) => l.id === lessonId)
  const prevLesson = siblingLessons[currentIdx - 1]
  const nextLesson = siblingLessons[currentIdx + 1]

  const getSettings = useAIStore((s) => s.getSettings)
  const isConfigured = useAIStore((s) => s.isConfigured)

  const [activeTab, setActiveTab] = useState('content')
  const [generatingScript, setGeneratingScript] = useState(false)
  const [generatingExercises, setGeneratingExercises] = useState(false)
  const [aiError, setAiError] = useState('')
  const [exerciseType, setExerciseType] = useState('quiz')
  const [exerciseCount, setExerciseCount] = useState(3)
  const [saved, setSaved] = useState(false)

  // Local form state synced with store
  const [form, setForm] = useState(() => ({
    title: lesson?.title || '',
    summary: lesson?.summary || '',
    content: lesson?.content || '',
    script: lesson?.script || '',
    type: lesson?.type || 'video',
    status: lesson?.status || 'draft',
  }))

  if (!lesson || !course) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 mb-4">Aula não encontrada.</p>
        <button onClick={() => navigate(`/courses/${courseId}`)} className="text-orange-500 hover:underline text-sm">
          ← Voltar ao curso
        </button>
      </div>
    )
  }

  const handleSave = () => {
    updateLesson(lessonId, form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleGenerateScript = async () => {
    if (!isConfigured()) { setAiError('Configure a IA em Configurações primeiro.'); return }
    setGeneratingScript(true)
    setAiError('')
    try {
      const script = await aiGenerateLessonScript(getSettings(), {
        lessonTitle: form.title,
        courseTitle: course.title,
        moduleTitle: module?.title,
        objectives: course.objectives,
      })
      setForm((f) => ({ ...f, script }))
      setActiveTab('script')
    } catch (err) {
      setAiError(err.message || 'Erro ao gerar roteiro.')
    } finally {
      setGeneratingScript(false)
    }
  }

  const handleGenerateExercises = async () => {
    if (!isConfigured()) { setAiError('Configure a IA em Configurações primeiro.'); return }
    setGeneratingExercises(true)
    setAiError('')
    try {
      const result = await aiGenerateExercises(getSettings(), {
        lessonTitle: form.title,
        lessonContent: form.content,
        lessonSummary: form.summary,
        type: exerciseType,
        count: exerciseCount,
      })
      addExercises(result.map((e) => ({ ...e, lessonId })))
      setActiveTab('exercises')
    } catch (err) {
      setAiError(err.message || 'Erro ao gerar exercícios.')
    } finally {
      setGeneratingExercises(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center gap-3 mb-2">
          {/* Breadcrumb */}
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft size={12} /> {course.title}
          </button>
          <ChevronRight size={10} className="text-gray-300" />
          {module && <span className="text-xs text-gray-400">{module.title}</span>}
          <ChevronRight size={10} className="text-gray-300" />
          <span className="text-xs text-gray-700 font-medium">{lesson.title}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BookMarked size={15} className="text-orange-500" />
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="text-base font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 min-w-[200px]"
                placeholder="Título da aula"
              />
            </div>

            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white"
            >
              {LESSON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white"
            >
              {LESSON_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Lesson navigation */}
            <button
              onClick={() => prevLesson && navigate(`/courses/${courseId}/lessons/${prevLesson.id}`)}
              disabled={!prevLesson}
              className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 rounded-lg transition-colors"
              title="Aula anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-gray-400">{currentIdx + 1}/{siblingLessons.length}</span>
            <button
              onClick={() => nextLesson && navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
              disabled={!nextLesson}
              className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 rounded-lg transition-colors"
              title="Próxima aula"
            >
              <ChevronR size={15} />
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                saved
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {saved ? <><CheckCircle2 size={13} /> Salvo</> : <><Save size={13} /> Salvar</>}
            </button>
          </div>
        </div>
      </div>

      {/* AI Actions bar */}
      <div className="flex-shrink-0 bg-orange-50 border-b border-orange-100 px-6 py-2 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-orange-700">IA:</span>
        <button
          onClick={handleGenerateScript}
          disabled={generatingScript}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-white border border-orange-200 hover:bg-orange-100 rounded-xl transition-colors disabled:opacity-60"
        >
          {generatingScript ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
          Gerar Roteiro
        </button>

        <div className="flex items-center gap-1.5">
          <select
            value={exerciseType}
            onChange={(e) => setExerciseType(e.target.value)}
            className="text-xs border border-orange-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
          >
            {EXERCISE_TYPES.map((t) => (
              <option key={t} value={t}>{EXERCISE_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select
            value={exerciseCount}
            onChange={(e) => setExerciseCount(Number(e.target.value))}
            className="text-xs border border-orange-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white w-16"
          >
            {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}x</option>)}
          </select>
          <button
            onClick={handleGenerateExercises}
            disabled={generatingExercises}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-white border border-orange-200 hover:bg-orange-100 rounded-xl transition-colors disabled:opacity-60"
          >
            {generatingExercises ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Gerar Exercícios
          </button>
        </div>

        {aiError && (
          <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">{aiError}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white px-6">
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={13} /> {label}
              {id === 'exercises' && exercises.length > 0 && (
                <span className="ml-1 text-[10px] bg-orange-100 text-orange-600 rounded-full px-1.5 py-0.5 font-medium">
                  {exercises.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'content' && (
          <div className="max-w-3xl space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Resumo da aula</label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="O que o aluno vai aprender nesta aula?"
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Conteúdo / Notas</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Pontos principais, referências, links, notas de pesquisa..."
                rows={14}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none font-mono"
              />
            </div>
          </div>
        )}

        {activeTab === 'script' && (
          <div className="max-w-3xl">
            {form.script ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">Roteiro de Gravação</h3>
                  <button
                    onClick={handleGenerateScript}
                    disabled={generatingScript}
                    className="flex items-center gap-1.5 text-xs text-orange-600 hover:underline"
                  >
                    {generatingScript ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    Regenerar
                  </button>
                </div>
                <textarea
                  value={form.script}
                  onChange={(e) => setForm((f) => ({ ...f, script: e.target.value }))}
                  rows={28}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none leading-relaxed"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                  <BookOpen size={24} className="text-orange-300" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Nenhum roteiro ainda</h3>
                <p className="text-xs text-gray-400 mb-5">Use a IA para gerar um roteiro completo para gravação.</p>
                <button
                  onClick={handleGenerateScript}
                  disabled={generatingScript}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
                >
                  {generatingScript ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                  Gerar Roteiro com IA
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'exercises' && (
          <div className="max-w-3xl space-y-3">
            {exercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                  <Dumbbell size={24} className="text-orange-300" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Nenhum exercício ainda</h3>
                <p className="text-xs text-gray-400 mb-4">Use a IA para gerar exercícios ou adicione manualmente.</p>
              </div>
            ) : (
              exercises.map((ex) => (
                <div key={ex.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          {EXERCISE_TYPE_LABELS[ex.type] || ex.type}
                        </span>
                        {ex.difficulty && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[ex.difficulty] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                            {ex.difficulty}
                          </span>
                        )}
                        <span className="font-medium text-sm text-gray-800">{ex.title}</span>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{ex.content}</p>
                    </div>
                    <button
                      onClick={() => deleteExercise(ex.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Manual add */}
            <ManualExerciseForm lessonId={lessonId} onAdd={addExercise} />
          </div>
        )}
      </div>
    </div>
  )
}

function ManualExerciseForm({ lessonId, onAdd }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ type: 'quiz', title: '', content: '' })

  const handleAdd = () => {
    if (!form.title.trim() || !form.content.trim()) return
    onAdd({ lessonId, ...form })
    setForm({ type: 'quiz', title: '', content: '' })
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors"
      >
        <Plus size={15} /> Adicionar exercício manualmente
      </button>
    )
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
      <h4 className="text-xs font-semibold text-orange-700">Novo exercício manual</h4>
      <div className="flex gap-2">
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          className="text-xs border border-orange-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
        >
          {EXERCISE_TYPES.map((t) => <option key={t} value={t}>{EXERCISE_TYPE_LABELS[t]}</option>)}
        </select>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Título do exercício"
          className="flex-1 text-sm border border-orange-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white"
        />
      </div>
      <textarea
        value={form.content}
        onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
        placeholder="Enunciado completo do exercício..."
        rows={3}
        className="w-full text-sm border border-orange-200 rounded-lg px-2.5 py-2 focus:outline-none bg-white resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 text-xs text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
        >
          Adicionar
        </button>
      </div>
    </div>
  )
}
