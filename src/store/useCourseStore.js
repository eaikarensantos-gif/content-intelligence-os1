import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

const useCourseStore = create(
  persist(
    (set, get) => ({
      // ── State ─────────────────────────────────────────────
      courses: [],
      modules: [],
      lessons: [],
      exercises: [],
      courseInsights: [],

      // ── Courses ───────────────────────────────────────────
      addCourse: (course) =>
        set((s) => ({
          courses: [
            ...s.courses,
            {
              id: uuidv4(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              status: 'draft',
              objectives: '',
              targetAudience: '',
              description: '',
              ...course,
            },
          ],
        })),

      updateCourse: (id, updates) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
          ),
        })),

      deleteCourse: (id) => {
        const lessonIds = get().lessons
          .filter((l) => l.courseId === id)
          .map((l) => l.id)
        set((s) => ({
          courses: s.courses.filter((c) => c.id !== id),
          modules: s.modules.filter((m) => m.courseId !== id),
          lessons: s.lessons.filter((l) => l.courseId !== id),
          exercises: s.exercises.filter((e) => !lessonIds.includes(e.lessonId)),
          courseInsights: s.courseInsights.filter((i) => i.courseId !== id),
        }))
      },

      // ── Modules ───────────────────────────────────────────
      addModule: (module) =>
        set((s) => ({
          modules: [
            ...s.modules,
            {
              id: uuidv4(),
              created_at: new Date().toISOString(),
              order: s.modules.filter((m) => m.courseId === module.courseId).length + 1,
              description: '',
              ...module,
            },
          ],
        })),

      updateModule: (id, updates) =>
        set((s) => ({
          modules: s.modules.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      deleteModule: (id) => {
        const lessonIds = get().lessons.filter((l) => l.moduleId === id).map((l) => l.id)
        set((s) => ({
          modules: s.modules.filter((m) => m.id !== id),
          lessons: s.lessons.filter((l) => l.moduleId !== id),
          exercises: s.exercises.filter((e) => !lessonIds.includes(e.lessonId)),
        }))
      },

      reorderModules: (courseId, orderedIds) =>
        set((s) => ({
          modules: s.modules.map((m) =>
            m.courseId === courseId
              ? { ...m, order: orderedIds.indexOf(m.id) + 1 }
              : m
          ),
        })),

      // ── Lessons ───────────────────────────────────────────
      addLesson: (lesson) =>
        set((s) => ({
          lessons: [
            ...s.lessons,
            {
              id: uuidv4(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              status: 'draft',
              type: 'video',
              summary: '',
              content: '',
              script: '',
              order: s.lessons.filter((l) => l.moduleId === lesson.moduleId).length + 1,
              ...lesson,
            },
          ],
        })),

      updateLesson: (id, updates) =>
        set((s) => ({
          lessons: s.lessons.map((l) =>
            l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
          ),
        })),

      deleteLesson: (id) =>
        set((s) => ({
          lessons: s.lessons.filter((l) => l.id !== id),
          exercises: s.exercises.filter((e) => e.lessonId !== id),
        })),

      reorderLessons: (moduleId, orderedIds) =>
        set((s) => ({
          lessons: s.lessons.map((l) =>
            l.moduleId === moduleId
              ? { ...l, order: orderedIds.indexOf(l.id) + 1 }
              : l
          ),
        })),

      // ── Exercises ─────────────────────────────────────────
      addExercise: (exercise) =>
        set((s) => ({
          exercises: [
            ...s.exercises,
            {
              id: uuidv4(),
              created_at: new Date().toISOString(),
              type: 'quiz',
              ...exercise,
            },
          ],
        })),

      addExercises: (exerciseList) =>
        set((s) => ({
          exercises: [
            ...s.exercises,
            ...exerciseList.map((e) => ({
              id: uuidv4(),
              created_at: new Date().toISOString(),
              ...e,
            })),
          ],
        })),

      deleteExercise: (id) =>
        set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) })),

      // ── Course Insights ───────────────────────────────────
      addCourseInsight: (insight) =>
        set((s) => ({
          courseInsights: [
            {
              id: uuidv4(),
              created_at: new Date().toISOString(),
              processed: false,
              processedContent: null,
              ...insight,
            },
            ...s.courseInsights,
          ],
        })),

      updateCourseInsight: (id, updates) =>
        set((s) => ({
          courseInsights: s.courseInsights.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),

      deleteCourseInsight: (id) =>
        set((s) => ({
          courseInsights: s.courseInsights.filter((i) => i.id !== id),
        })),

      // ── Bulk import (AI structure generation) ─────────────
      importCourseStructure: (courseId, structure) => {
        const { modules: existingModules } = get()
        const newModules = []
        const newLessons = []

        structure.forEach((mod, mIdx) => {
          const moduleId = uuidv4()
          newModules.push({
            id: moduleId,
            courseId,
            title: mod.title,
            description: mod.description || '',
            order: existingModules.filter((m) => m.courseId === courseId).length + mIdx + 1,
            created_at: new Date().toISOString(),
          })
          ;(mod.lessons || []).forEach((les, lIdx) => {
            newLessons.push({
              id: uuidv4(),
              moduleId,
              courseId,
              title: les.title,
              summary: les.summary || '',
              content: '',
              script: '',
              type: les.type || 'video',
              status: 'draft',
              order: lIdx + 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          })
        })

        set((s) => ({
          modules: [...s.modules, ...newModules],
          lessons: [...s.lessons, ...newLessons],
        }))
      },
    }),
    {
      name: 'cio-course-store-v1',
    }
  )
)

export default useCourseStore
